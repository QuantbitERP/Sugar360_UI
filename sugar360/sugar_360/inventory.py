"""Inventory dashboard — ported from Sugar360_UI/src/lib/inventory/*.

Diesel tracking comes from ERPNext stock: Stock Ledger Entry (every receipt/consumption
movement, signed) and Bin (current closing stock + valuation). Consumption-by-role comes from
Fuel Ledger Entry (a quantbit_agriculture_crm doctype), which records issued-fuel entries
against a Harvester/Transporter entity type.
"""

import frappe
from frappe.utils import flt

from sugar360.sugar_360.access import require_dashboard_access
from sugar360.sugar_360.cache import get_or_set_cache
from sugar360.sugar_360.cane import resolve_active_season, today_iso_date_ist
from sugar360.sugar_360.production import CONFIG as PRODUCTION_CONFIG
from sugar360.sugar_360.production import fetch_bi_products_season, fetch_bin_stock, fetch_finished_goods_season
from sugar360.sugar_360.serialize import to_camel_case

CACHE_TTL = {
	"dashboard": 60,
	# The diesel item's code rarely changes — cache the lookup longer.
	"diesel_item_lookup": 30 * 60,
}

CONFIG = {
	# How many of the most recent distinct consumption entries to average over.
	"consumption_trend_samples": 30,
}


def fetch_diesel_item_code() -> str | None:
	"""Looks up the Diesel item's code by name rather than hardcoding a site-specific item code."""

	def _load():
		rows = frappe.get_list(
			"Item",
			filters=[["item_name", "like", "Diesel%"]],
			fields=["name", "stock_uom"],
			limit_page_length=5,
			ignore_permissions=True,
		)
		liter_item = next((r for r in rows if r.get("stock_uom") == "LITER"), None)
		if liter_item:
			return liter_item["name"]
		return rows[0]["name"] if rows else None

	return get_or_set_cache("sugar360:dim:diesel_item_code", CACHE_TTL["diesel_item_lookup"], _load)


def fetch_item_stock(item_code: str) -> dict:
	rows = frappe.get_list(
		"Bin",
		filters={"item_code": item_code},
		fields=["sum(actual_qty) as qty", "sum(stock_value) as value"],
		ignore_permissions=True,
	)
	return {"qty": flt(rows[0].get("qty")) if rows else 0.0, "value": flt(rows[0].get("value")) if rows else 0.0}


def fetch_latest_stock_ledger_date(item_code: str) -> str | None:
	rows = frappe.get_list(
		"Stock Ledger Entry",
		filters={"item_code": item_code, "is_cancelled": 0},
		fields=["posting_date"],
		order_by="posting_date desc",
		limit_page_length=1,
		ignore_permissions=True,
	)
	return rows[0].get("posting_date") if rows else None


def fetch_stock_movement_for_date(item_code: str, date: str) -> dict:
	received_rows = frappe.get_list(
		"Stock Ledger Entry",
		filters=[
			["item_code", "=", item_code],
			["is_cancelled", "=", 0],
			["posting_date", "=", date],
			["actual_qty", ">", 0],
		],
		fields=["sum(actual_qty) as total"],
		ignore_permissions=True,
	)
	consumed_rows = frappe.get_list(
		"Stock Ledger Entry",
		filters=[
			["item_code", "=", item_code],
			["is_cancelled", "=", 0],
			["posting_date", "=", date],
			["actual_qty", "<", 0],
		],
		fields=["sum(actual_qty) as total"],
		ignore_permissions=True,
	)
	received_qty = flt(received_rows[0].get("total")) if received_rows else 0.0
	consumed_qty = abs(flt(consumed_rows[0].get("total")) if consumed_rows else 0.0)
	return {"received_qty": received_qty, "consumed_qty": consumed_qty}


def fetch_avg_daily_consumption(item_code: str) -> dict:
	"""Average daily consumption over the most recent N distinct days with any withdrawal."""
	rows = frappe.get_list(
		"Stock Ledger Entry",
		filters=[["item_code", "=", item_code], ["is_cancelled", "=", 0], ["actual_qty", "<", 0]],
		fields=["posting_date", "sum(actual_qty) as total"],
		group_by="posting_date",
		order_by="posting_date desc",
		limit_page_length=CONFIG["consumption_trend_samples"],
		ignore_permissions=True,
	)
	if not rows:
		return {"avg_per_day": 0.0, "sample_days": 0}
	total_consumed = sum(abs(flt(r.get("total"))) for r in rows)
	return {"avg_per_day": total_consumed / len(rows), "sample_days": len(rows)}


def fetch_diesel_issued_by_entity_type(season: str) -> list[dict]:
	rows = frappe.get_list(
		"Fuel Ledger Entry",
		filters={"season": season, "entry_type": "Issued", "is_cancelled": 0},
		fields=["entity_type", "sum(quantity) as total", "count(name) as entries"],
		group_by="entity_type",
		order_by="total desc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	return [
		{"entity_type": r.get("entity_type") or "Unclassified", "quantity": flt(r.get("total")), "entries": r.get("entries") or 0}
		for r in rows
	]


def _build_diesel_widget() -> dict:
	diesel_item_code = fetch_diesel_item_code()
	today = today_iso_date_ist()

	if not diesel_item_code:
		return {
			"as_of_date": None,
			"is_today": False,
			"current_stock_l": 0.0,
			"current_stock_value_cr": 0.0,
			"received_today_l": 0.0,
			"consumed_today_l": 0.0,
			"avg_daily_consumption_l": 0.0,
			"avg_sample_days": 0,
			"stock_days_remaining": None,
			"coverage_of_rolling_month_pct": None,
		}

	stock = fetch_item_stock(diesel_item_code)
	latest_date = fetch_latest_stock_ledger_date(diesel_item_code)
	avg_consumption = fetch_avg_daily_consumption(diesel_item_code)

	as_of_date = latest_date or today
	movement = fetch_stock_movement_for_date(diesel_item_code, as_of_date)

	stock_days_remaining = stock["qty"] / avg_consumption["avg_per_day"] if avg_consumption["avg_per_day"] > 0 else None
	rolling_month_demand = avg_consumption["avg_per_day"] * 30
	coverage_of_rolling_month_pct = (
		(stock["qty"] / rolling_month_demand * 100) if rolling_month_demand > 0 else None
	)

	return {
		"as_of_date": as_of_date,
		"is_today": str(as_of_date) == today,
		"current_stock_l": stock["qty"],
		"current_stock_value_cr": stock["value"] / 1e7,
		"received_today_l": movement["received_qty"],
		"consumed_today_l": movement["consumed_qty"],
		"avg_daily_consumption_l": avg_consumption["avg_per_day"],
		"avg_sample_days": avg_consumption["sample_days"],
		"stock_days_remaining": stock_days_remaining,
		"coverage_of_rolling_month_pct": coverage_of_rolling_month_pct,
	}


def _build_inventory_dashboard_data() -> dict:
	season = resolve_active_season()

	diesel = _build_diesel_widget()
	diesel_by_role_raw = fetch_diesel_issued_by_entity_type(season["name"])
	season_finished_goods = fetch_finished_goods_season(season["name"])
	season_by_products = fetch_bi_products_season(season["name"])

	total_issued = sum(r["quantity"] for r in diesel_by_role_raw)
	diesel_by_role = [
		{
			"entity_type": r["entity_type"],
			"quantity_l": r["quantity"],
			"entries": r["entries"],
			"share_pct": (r["quantity"] / total_issued * 100) if total_issued > 0 else 0,
		}
		for r in diesel_by_role_raw
	]

	item_codes = list({r["item_code"] for r in [*season_finished_goods, *season_by_products]})
	bin_rows = fetch_bin_stock(item_codes)
	stock_by_item = {r["item_code"]: {"qty": r["qty"], "value": r["value"]} for r in bin_rows}

	qtl_to_mt = PRODUCTION_CONFIG["qtl_to_mt"]
	stock_balance = [
		{
			"item_code": row["item_code"],
			"item_name": row["item_name"].strip(),
			"unit": "MT",
			"current_stock": stock_by_item.get(row["item_code"], {"qty": 0.0, "value": 0.0})["qty"] * qtl_to_mt,
			"current_stock_value_cr": stock_by_item.get(row["item_code"], {"qty": 0.0, "value": 0.0})["value"] / 1e7,
		}
		for row in season_finished_goods
	] + [
		{
			"item_code": row["item_code"],
			"item_name": row["item_name"].strip(),
			"unit": row["stock_uom"],
			"current_stock": stock_by_item.get(row["item_code"], {"qty": 0.0, "value": 0.0})["qty"],
			"current_stock_value_cr": stock_by_item.get(row["item_code"], {"qty": 0.0, "value": 0.0})["value"] / 1e7,
		}
		for row in season_by_products
	]

	return {
		"meta": {
			"season_name": season["name"],
			"generated_at": frappe.utils.now_datetime().isoformat(),
			"cache_ttl_seconds": CACHE_TTL["dashboard"],
		},
		"diesel": diesel,
		"diesel_by_role": diesel_by_role,
		"stock_balance": stock_balance,
	}


@frappe.whitelist()
def get_inventory_dashboard_data():
	require_dashboard_access()
	data = get_or_set_cache("sugar360:inventory:dashboard", CACHE_TTL["dashboard"], _build_inventory_dashboard_data)
	return to_camel_case(data)
