"""Production dashboard — ported from Sugar360_UI/src/lib/production/*.

Two real, distinct ERPNext sources, deliberately not blended:
 - Process Order (+ its Finished Goods / Bi-Products child tables): the production/cost flow.
 - Bin: ERPNext's own materialized current-stock table (quantity + valuation per item), fed by
   Stock Ledger postings — the authoritative "closing stock".

Note: fetch_stock_movement_for_date is imported from sugar360.sugar_360.inventory *inside* the
one function that needs it (not at module top level), because inventory.py in turn imports this
module's Bin/Finished-Goods helpers at its top level — a genuine two-way dependency in the
original JS, resolved here the same way Python usually breaks such cycles: one side defers.
"""

import frappe
from frappe.utils import flt

from sugar360.sugar_360.access import require_dashboard_access
from sugar360.sugar_360.cache import get_or_set_cache
from sugar360.sugar_360.cane import fetch_trips_on_date_totals, resolve_active_season, today_iso_date_ist
from sugar360.sugar_360.finance import fetch_grade_wise_sales, fetch_sales_invoices_in_range
from sugar360.sugar_360.serialize import to_camel_case

CACHE_TTL = {"dashboard": 60}

CONFIG = {
	# Season production target, used only for the progress-bar context on the KPI card.
	# TODO(mill ops): confirm with production planning — placeholder, not a confirmed target.
	"season_sugar_production_target_mt": 64_000,
	"trend_days": 10,
	# Sugar quantities in Process Order / Bin are stored in Quintals (QTL); 1 QTL = 0.1 MT exactly.
	"qtl_to_mt": 0.1,
}


def fetch_production_days_count(season: str) -> int:
	rows = frappe.get_list(
		"Process Order",
		filters={"season": season, "docstatus": 1},
		fields=["count(distinct posting_date) as days"],
		ignore_permissions=True,
	)
	return rows[0].get("days") or 0 if rows else 0


def fetch_latest_process_order_date(season: str) -> str | None:
	rows = frappe.get_list(
		"Process Order",
		filters={"season": season, "docstatus": 1},
		fields=["posting_date"],
		order_by="posting_date desc",
		limit_page_length=1,
		ignore_permissions=True,
	)
	return rows[0].get("posting_date") if rows else None


def _fetch_process_order_totals(filters) -> dict:
	rows = frappe.get_list(
		"Process Order",
		filters=filters,
		fields=[
			"sum(total_finished_quantity) as finished_qty",
			"sum(total_finished_amount) as finished_amount",
			"sum(total_bi_product_quantity) as bi_qty",
			"sum(total_bi_product_amount) as bi_amount",
		],
		ignore_permissions=True,
	)
	row = rows[0] if rows else {}
	return {
		"finished_qty": flt(row.get("finished_qty")),
		"finished_amount": flt(row.get("finished_amount")),
		"bi_product_qty": flt(row.get("bi_qty")),
		"bi_product_amount": flt(row.get("bi_amount")),
	}


def fetch_process_order_totals_for_date(season: str, date: str) -> dict:
	return _fetch_process_order_totals({"season": season, "docstatus": 1, "posting_date": date})


def fetch_process_order_season_totals(season: str) -> dict:
	return _fetch_process_order_totals({"season": season, "docstatus": 1})


def fetch_process_order_totals_for_range(season: str, from_date: str, to_date: str) -> dict:
	return _fetch_process_order_totals(
		[
			["season", "=", season],
			["docstatus", "=", 1],
			["posting_date", ">=", from_date],
			["posting_date", "<=", to_date],
		]
	)


def fetch_process_order_trend(season: str) -> list[dict]:
	rows = frappe.get_list(
		"Process Order",
		filters={"season": season, "docstatus": 1},
		fields=["posting_date", "sum(total_finished_quantity) as total"],
		group_by="posting_date",
		order_by="posting_date desc",
		limit_page_length=CONFIG["trend_days"],
		ignore_permissions=True,
	)
	return list(reversed(rows))


def fetch_process_order_names_for_date(season: str, date: str) -> list[str]:
	rows = frappe.get_list(
		"Process Order",
		filters={"season": season, "docstatus": 1, "posting_date": date},
		fields=["name"],
		limit_page_length=0,
		ignore_permissions=True,
	)
	return [r["name"] for r in rows]


def _fetch_child_breakdown(doctype: str, filters) -> list[dict]:
	rows = frappe.get_list(
		doctype,
		parent_doctype="Process Order",
		filters=filters,
		fields=["item_code", "item_name", "stock_uom", "sum(quantity_in_stock_uom) as qty", "sum(amount) as amount"],
		group_by="item_code, item_name, stock_uom",
		order_by="qty desc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	return [
		{
			"item_code": r["item_code"],
			"item_name": r["item_name"],
			"stock_uom": r["stock_uom"],
			"qty": flt(r.get("qty")),
			"amount": flt(r.get("amount")),
		}
		for r in rows
	]


def fetch_finished_goods_season(season: str) -> list[dict]:
	return _fetch_child_breakdown("Finished Goods", {"season": season, "docstatus": 1})


def fetch_finished_goods_for_orders(order_names: list[str]) -> list[dict]:
	if not order_names:
		return []
	return _fetch_child_breakdown("Finished Goods", [["docstatus", "=", 1], ["parent", "in", order_names]])


def fetch_bi_products_season(season: str) -> list[dict]:
	return _fetch_child_breakdown("Bi-Products", {"season": season, "docstatus": 1})


def fetch_bi_products_for_orders(order_names: list[str]) -> list[dict]:
	if not order_names:
		return []
	return _fetch_child_breakdown("Bi-Products", [["docstatus", "=", 1], ["parent", "in", order_names]])


def fetch_consumption_for_date(item_codes: list[str], date: str) -> dict:
	"""'Today Consumed' (internal use, not a sale — e.g. bagasse burned as boiler fuel): Stock
	Entry postings on the date that aren't a Manufacture receipt."""
	if not item_codes:
		return {}
	entry_names = [
		r["name"]
		for r in frappe.get_list(
			"Stock Entry",
			filters=[["docstatus", "=", 1], ["posting_date", "=", date], ["stock_entry_type", "!=", "Manufacture"]],
			fields=["name"],
			limit_page_length=0,
			ignore_permissions=True,
		)
	]
	if not entry_names:
		return {}
	rows = frappe.get_list(
		"Stock Entry Detail",
		parent_doctype="Stock Entry",
		filters=[["parent", "in", entry_names], ["item_code", "in", item_codes]],
		fields=["item_code", "sum(qty) as total"],
		group_by="item_code",
		limit_page_length=0,
		ignore_permissions=True,
	)
	return {r["item_code"]: flt(r.get("total")) for r in rows}


def fetch_season_avg_sell_price(item_codes: list[str], season: str) -> float | None:
	"""Qty-weighted average sell price, season to date. sum(rate*qty) isn't a whitelisted
	aggregate expression, so total qty and total amount are pulled as two plain sums instead."""
	if not item_codes:
		return None
	qty_rows = frappe.get_list(
		"Sales Invoice Item",
		parent_doctype="Sales Invoice",
		filters=[["docstatus", "=", 1], ["season", "=", season], ["item_code", "in", item_codes]],
		fields=["sum(qty) as qty"],
		ignore_permissions=True,
	)
	total_qty = flt(qty_rows[0].get("qty")) if qty_rows else 0.0
	if total_qty <= 0:
		return None

	amount_rows = frappe.get_list(
		"Sales Invoice Item",
		parent_doctype="Sales Invoice",
		filters=[["docstatus", "=", 1], ["season", "=", season], ["item_code", "in", item_codes]],
		fields=["sum(amount) as amount"],
		ignore_permissions=True,
	)
	total_amount = flt(amount_rows[0].get("amount")) if amount_rows else 0.0
	return total_amount / total_qty


def fetch_bin_stock(item_codes: list[str]) -> list[dict]:
	"""Real, current closing stock + valuation from ERPNext's own Bin table."""
	if not item_codes:
		return []
	rows = frappe.get_list(
		"Bin",
		filters={"item_code": ["in", item_codes]},
		fields=["item_code", "sum(actual_qty) as qty", "sum(stock_value) as value"],
		group_by="item_code",
		limit_page_length=0,
		ignore_permissions=True,
	)
	return [{"item_code": r["item_code"], "qty": flt(r.get("qty")), "value": flt(r.get("value"))} for r in rows]


def _build_production_dashboard_data() -> dict:
	from sugar360.sugar_360.inventory import fetch_stock_movement_for_date

	qtl_to_mt = CONFIG["qtl_to_mt"]
	season = resolve_active_season()
	today = today_iso_date_ist()

	latest_production_date = fetch_latest_process_order_date(season["name"])
	status_date = latest_production_date or today
	is_today = str(status_date) == today
	month_start = f"{str(status_date)[:7]}-01"

	today_totals = fetch_process_order_totals_for_date(season["name"], status_date)
	season_totals = fetch_process_order_season_totals(season["name"])
	mtd_totals = fetch_process_order_totals_for_range(season["name"], month_start, status_date)
	trend_raw = fetch_process_order_trend(season["name"])
	crush = fetch_trips_on_date_totals(season["name"], status_date)
	today_order_names = fetch_process_order_names_for_date(season["name"], status_date)
	production_days_count = fetch_production_days_count(season["name"])

	season_finished_goods = fetch_finished_goods_season(season["name"])
	season_by_products = fetch_bi_products_season(season["name"])
	today_finished_goods = fetch_finished_goods_for_orders(today_order_names)
	today_by_products = fetch_bi_products_for_orders(today_order_names)

	all_item_codes = list({r["item_code"] for r in [*season_finished_goods, *season_by_products]})
	sugar_item_codes = [r["item_code"] for r in season_finished_goods]
	by_product_item_codes = [r["item_code"] for r in season_by_products]

	bin_rows = fetch_bin_stock(all_item_codes)
	today_invoices = fetch_sales_invoices_in_range(status_date, status_date)
	consumption_by_item = fetch_consumption_for_date(by_product_item_codes, status_date)
	avg_sell_price_per_qtl = fetch_season_avg_sell_price(sugar_item_codes, season["name"])
	stock_by_item = {r["item_code"]: {"qty": r["qty"], "value": r["value"]} for r in bin_rows}

	today_sales_rows = fetch_grade_wise_sales([i["name"] for i in today_invoices], all_item_codes)
	today_sales_by_item = {r["item_code"]: r for r in today_sales_rows}

	# Only meaningful when status_date is genuinely today — see opening_stock_native below.
	movement_by_item = (
		{code: fetch_stock_movement_for_date(code, status_date) for code in all_item_codes} if is_today else {}
	)

	def opening_stock_native(item_code: str, closing_native: float) -> float | None:
		"""Opening = current closing stock (Bin) minus that day's net Stock Ledger movement.
		Only valid when status_date is genuinely today; for a past status_date (common off-season),
		the current Bin balance already reflects everything since then, so this would silently
		produce a wrong number — return None instead."""
		if not is_today:
			return None
		movement = movement_by_item.get(item_code)
		if not movement:
			return None
		return closing_native - movement["received_qty"] + movement["consumed_qty"]

	today_finished_by_item = {r["item_code"]: r for r in today_finished_goods}
	today_by_products_by_item = {r["item_code"]: r for r in today_by_products}

	grade_wise = []
	for row in season_finished_goods:
		stock = stock_by_item.get(row["item_code"], {"qty": 0.0, "value": 0.0})
		today_qty = today_finished_by_item.get(row["item_code"], {}).get("qty", 0.0)
		opening = opening_stock_native(row["item_code"], stock["qty"])
		grade_wise.append(
			{
				"item_code": row["item_code"],
				"item_name": row["item_name"].strip(),
				"opening_stock_mt": (opening * qtl_to_mt) if opening is not None else None,
				"today_production_mt": today_qty * qtl_to_mt,
				"today_sales_mt": today_sales_by_item.get(row["item_code"], {}).get("qty", 0.0) * qtl_to_mt,
				"season_production_mt": row["qty"] * qtl_to_mt,
				"avg_rate_per_qtl": (row["amount"] / row["qty"]) if row["qty"] > 0 else 0,
				"current_stock_mt": stock["qty"] * qtl_to_mt,
				"current_stock_value_cr": stock["value"] / 1e7,
			}
		)

	by_products = []
	for row in season_by_products:
		stock = stock_by_item.get(row["item_code"], {"qty": 0.0, "value": 0.0})
		today_qty = today_by_products_by_item.get(row["item_code"], {}).get("qty", 0.0)
		opening = opening_stock_native(row["item_code"], stock["qty"])
		by_products.append(
			{
				"item_code": row["item_code"],
				"item_name": row["item_name"].strip(),
				"unit": row["stock_uom"],
				"opening_stock": opening,
				"today_production": today_qty,
				"today_consumed": consumption_by_item.get(row["item_code"], 0.0),
				"today_sales": today_sales_by_item.get(row["item_code"], {}).get("qty", 0.0),
				"season_production": row["qty"],
				"current_stock": stock["qty"],
				"current_stock_value_cr": stock["value"] / 1e7,
				"realisation_per_unit": (row["amount"] / row["qty"]) if row["qty"] > 0 else 0,
			}
		)

	sugar_produced_mt = today_totals["finished_qty"] * qtl_to_mt
	cane_crushed_mt = crush["total_mt"]
	# Recovery % = sugar output / cane input is the standard formula, but NOT on a same-day basis
	# (verified: a day's sugar output can exceed that day's cane crush because juice-to-sugar
	# processing lags crushing). A correct figure needs a season-to-date/lag-adjusted ratio —
	# deferred rather than shipping a misleading same-day number.
	recovery_pct = None
	season_sugar_production_mt = season_totals["finished_qty"] * qtl_to_mt
	current_stock_value_cr = sum(s["value"] for s in stock_by_item.values()) / 1e7
	avg_daily_production_mt = (
		season_sugar_production_mt / production_days_count if production_days_count > 0 else 0
	)

	revenue_parts = [{"label": "Sugar", "value_cr": season_totals["finished_amount"] / 1e7}] + [
		{"label": row["item_name"].strip(), "value_cr": row["amount"] / 1e7} for row in season_by_products
	]
	revenue_parts = [p for p in revenue_parts if p["value_cr"] > 0]
	revenue_total = sum(p["value_cr"] for p in revenue_parts)
	revenue_split = [
		{**p, "share_pct": (p["value_cr"] / revenue_total * 100) if revenue_total > 0 else 0} for p in revenue_parts
	]

	target_mt = CONFIG["season_sugar_production_target_mt"]

	return {
		"meta": {
			"season_name": season["name"],
			"generated_at": frappe.utils.now_datetime().isoformat(),
			"cache_ttl_seconds": CACHE_TTL["dashboard"],
		},
		"kpis": {
			"latest_activity_date": latest_production_date,
			"is_today": is_today,
			"cane_crushed_mt": cane_crushed_mt,
			"sugar_produced_mt": sugar_produced_mt,
			"recovery_pct": recovery_pct,
			"season_sugar_production_mt": season_sugar_production_mt,
			"season_target_mt": target_mt,
			"pct_of_season_target": (season_sugar_production_mt / target_mt * 100) if target_mt > 0 else 0,
			"mtd_sugar_production_mt": mtd_totals["finished_qty"] * qtl_to_mt,
			"season_finished_goods_value_cr": season_totals["finished_amount"] / 1e7,
			"season_by_product_value_cr": season_totals["bi_product_amount"] / 1e7,
			"current_stock_value_cr": current_stock_value_cr,
			"avg_daily_production_mt": avg_daily_production_mt,
			"production_days_count": production_days_count,
			"avg_sell_price_per_qtl": avg_sell_price_per_qtl,
		},
		"trend": [{"date": row["posting_date"], "sugar_produced_mt": row["total"] * qtl_to_mt} for row in trend_raw],
		"grade_wise": grade_wise,
		"by_products": by_products,
		"revenue_split": revenue_split,
		# Plant Utilisation% and Boiling House Purity% need machine-uptime and lab-QA data
		# sources this instance doesn't populate — surfaced as null rather than invented.
		"not_connected": {
			"plant_utilisation_pct": None,
			"boiling_house_purity_pct": None,
		},
	}


@frappe.whitelist()
def get_production_dashboard_data():
	require_dashboard_access()
	data = get_or_set_cache("sugar360:production:dashboard", CACHE_TTL["dashboard"], _build_production_dashboard_data)
	return to_camel_case(data)
