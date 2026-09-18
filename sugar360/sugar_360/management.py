"""MD / Management executive-summary dashboard — ported from Sugar360_UI/src/lib/management/*.

Deliberately cross-module: pulls the same already-verified aggregates the Cane, Production,
H&T, Inventory and Finance dashboards use, rather than a second copy of each query.
"""

import frappe
from frappe.utils import flt

from sugar360.sugar_360.access import require_dashboard_access
from sugar360.sugar_360.cache import get_or_set_cache
from sugar360.sugar_360.cane import (
	CONFIG as CANE_CONFIG,
)
from sugar360.sugar_360.cane import (
	fetch_circle_office_names,
	fetch_latest_activity_date,
	fetch_season_received,
	fetch_trips_on_date_totals,
	fetch_zone_received,
	fetch_zone_registered_area,
	resolve_active_season,
	today_iso_date_ist,
)
from sugar360.sugar_360.finance import (
	fetch_account_names_by_type,
	fetch_flagged_revenue_items,
	fetch_gl_balance,
	fetch_grade_wise_sales,
	fetch_purchase_invoice_total_in_range,
	fetch_sales_invoice_latest_date,
	fetch_sales_invoices_in_range,
)
from sugar360.sugar_360.ht import fetch_advance_by_contract, fetch_advance_request_names, fetch_contracts_with_deliveries
from sugar360.sugar_360.inventory import fetch_avg_daily_consumption, fetch_diesel_item_code, fetch_item_stock
from sugar360.sugar_360.production import CONFIG as PRODUCTION_CONFIG
from sugar360.sugar_360.production import (
	fetch_bin_stock,
	fetch_finished_goods_season,
	fetch_latest_process_order_date,
	fetch_process_order_season_totals,
	fetch_process_order_totals_for_date,
)
from sugar360.sugar_360.serialize import to_camel_case

CACHE_TTL_SECONDS = 60


def fetch_hourly_crushing(season: str, date: str) -> list[dict]:
	"""Hour-of-day crushing rate for one date. No per-hour aggregate function is available
	through frappe.get_list (only sum/count/avg/min/max on a plain field, no HOUR()/date-bucketing
	expressions), so this fetches that day's raw weighbridge slips (bounded — worst case ~300
	rows/day on this instance) and buckets by hour here instead."""
	rows = frappe.get_list(
		"Cane Weight",
		filters={"docstatus": 1, "season": season, "posting_date": date},
		fields=["net_weight", "posting_time"],
		limit_page_length=0,
		ignore_permissions=True,
	)

	buckets: dict[int, dict] = {}
	for row in rows:
		time_str = str(row.get("posting_time") or "")
		try:
			hour = int(time_str.split(":")[0])
		except (ValueError, IndexError):
			continue
		bucket = buckets.setdefault(hour, {"total_mt": 0.0, "trips": 0})
		bucket["total_mt"] += flt(row.get("net_weight"))
		bucket["trips"] += 1

	return [{"hour": hour, "total_mt": b["total_mt"], "trips": b["trips"]} for hour, b in sorted(buckets.items())]


def _build_management_dashboard_data() -> dict:
	season = resolve_active_season()
	today = today_iso_date_ist()

	cane_latest_date = fetch_latest_activity_date(season["name"])
	cane_status_date = cane_latest_date or today
	is_today = str(cane_status_date) == today

	cane_today = fetch_trips_on_date_totals(season["name"], cane_status_date)
	season_received = fetch_season_received(season["name"])
	hourly_raw = fetch_hourly_crushing(season["name"], cane_status_date)
	prod_latest_date = fetch_latest_process_order_date(season["name"])
	prod_season_totals = fetch_process_order_season_totals(season["name"])
	season_finished_goods = fetch_finished_goods_season(season["name"])
	zone_area = fetch_zone_registered_area(season["name"])
	zone_received = fetch_zone_received(season["name"])
	circle_names = fetch_circle_office_names()
	advance_request_names = fetch_advance_request_names(season["name"])
	diesel_item_code = fetch_diesel_item_code()
	bank_accounts = fetch_account_names_by_type("Bank")
	receivable_accounts = fetch_account_names_by_type("Receivable")
	payable_accounts = fetch_account_names_by_type("Payable")
	income_accounts = fetch_account_names_by_type("Income Account") + fetch_account_names_by_type("Indirect Income")
	sales_latest_date = fetch_sales_invoice_latest_date()
	flagged_items = fetch_flagged_revenue_items()

	financial_status_date = sales_latest_date or today
	financial_is_today = str(financial_status_date) == today

	prod_today = fetch_process_order_totals_for_date(season["name"], prod_latest_date) if prod_latest_date else None
	bin_rows = fetch_bin_stock(list({r["item_code"] for r in season_finished_goods}))
	advance_by_contract = fetch_advance_by_contract(advance_request_names)
	delivered_set = fetch_contracts_with_deliveries(season["name"])
	bank_gl = fetch_gl_balance(bank_accounts)
	receivable_gl = fetch_gl_balance(receivable_accounts)
	payable_gl = fetch_gl_balance(payable_accounts)
	income_today_gl = fetch_gl_balance(income_accounts, [["posting_date", "=", financial_status_date]])
	purchase_today_cr = fetch_purchase_invoice_total_in_range(financial_status_date, financial_status_date)

	# ---- Today's Sugar Sales (Production & Sales cluster) — same "as of" date as Financial Position ----
	sugar_item_codes = [i["name"] for i in flagged_items if i["item_group"] == "SUGAR"]
	today_invoices = fetch_sales_invoices_in_range(financial_status_date, financial_status_date)
	today_sugar_sales = fetch_grade_wise_sales([i["name"] for i in today_invoices], sugar_item_codes)
	today_sugar_sales_qty = sum(r["qty"] for r in today_sugar_sales)
	today_sugar_sales_value_cr = sum(r["amount"] for r in today_sugar_sales) / 1e7

	if diesel_item_code:
		stock = fetch_item_stock(diesel_item_code)
		avg = fetch_avg_daily_consumption(diesel_item_code)
		diesel_stock_days = (stock["qty"] / avg["avg_per_day"]) if avg["avg_per_day"] > 0 else None
	else:
		diesel_stock_days = None

	# ---- Operations ----
	hourly = [
		{"hour": f"{h['hour']:02d}:00", "actual_mt": h["total_mt"], "trips": h["trips"]} for h in hourly_raw
	]
	peak = None
	for h in hourly_raw:
		if peak is None or h["total_mt"] > peak["total_mt"]:
			peak = h
	cane_received_per_hour_mt = (cane_today["total_mt"] / len(hourly_raw)) if hourly_raw else None

	# ---- Production & sales ----
	current_stock_value_cr = sum(flt(r.get("value")) for r in bin_rows) / 1e7

	# ---- Alerts: real cross-module signals ----
	received_by_zone = {r.get("circle_office") or "": flt(r.get("received")) for r in zone_received}
	zone_stats = []
	for r in zone_area:
		code = r.get("circle_office") or ""
		est_mt = flt(r.get("area")) * CANE_CONFIG["avg_yield_mt_per_acre"]
		received_mt = received_by_zone.get(code, 0)
		zone_stats.append(
			{
				"name": circle_names.get(code, code) if code else "Unassigned",
				"coverage_pct": (received_mt / est_mt * 100) if est_mt > 0 else None,
			}
		)
	weakest_zone = None
	for z in zone_stats:
		if z["coverage_pct"] is not None and (weakest_zone is None or z["coverage_pct"] < (weakest_zone["coverage_pct"] or 100)):
			weakest_zone = z

	zero_delivery_count = sum(1 for r in advance_by_contract if r["ht_contract"] not in delivered_set and r["paid"] > 0)

	alerts = []
	if diesel_stock_days is not None and diesel_stock_days < 10:
		critical = diesel_stock_days < 5
		alerts.append(
			{
				"category": "Inventory / Stock",
				"tone": "critical" if critical else "warning",
				"title": f"Diesel Stock {'Critical' if critical else 'Low'} — {diesel_stock_days:.1f} Days",
				"detail": "Based on recent average daily consumption — see Inventory page for details.",
				"badge": "Critical" if critical else "Watch",
			}
		)
	if weakest_zone and weakest_zone["coverage_pct"] is not None and weakest_zone["coverage_pct"] < 45:
		alerts.append(
			{
				"category": "Operational",
				"tone": "warning",
				"title": f"Cane Supply Gap — {weakest_zone['name']} Zone",
				"detail": f"{weakest_zone['coverage_pct']:.0f}% of estimated availability received season-to-date — see Cane & Agriculture page.",
				"badge": "Monitor",
			}
		)
	if zero_delivery_count > 0:
		alerts.append(
			{
				"category": "Operational",
				"tone": "warning",
				"title": f"{zero_delivery_count} H&T Contract{'s' if zero_delivery_count > 1 else ''} — Advance Paid, No Deliveries",
				"detail": "Advance disbursed but zero weighbridge activity recorded this season — see H&T page.",
				"badge": "Follow Up",
			}
		)
	if is_today and cane_today["trips"] > 0:
		alerts.append(
			{
				"category": "Positive",
				"tone": "good",
				"title": f"{cane_today['trips']} Trips Received Today",
				"detail": f"{cane_today['total_mt']:,.0f} MT crushed so far today.",
				"badge": "Good",
			}
		)
	if not alerts:
		alerts.append(
			{
				"category": "Positive",
				"tone": "good",
				"title": "No Critical Exceptions Detected",
				"detail": "Across the data sources currently wired (diesel stock, zone supply, H&T advances).",
				"badge": "Good",
			}
		)

	qtl_to_mt = PRODUCTION_CONFIG["qtl_to_mt"]

	return {
		"meta": {
			"season_name": season["name"],
			"generated_at": frappe.utils.now_datetime().isoformat(),
			"cache_ttl_seconds": CACHE_TTL_SECONDS,
		},
		"operations": {
			"latest_activity_date": cane_latest_date,
			"is_today": is_today,
			"cane_received_today_mt": cane_today["total_mt"],
			"cane_received_per_hour_mt": cane_received_per_hour_mt,
			"season_cane_received_mt": season_received["total_mt"],
			"peak_hour_mt": peak["total_mt"] if peak else None,
			"peak_hour": peak["hour"] if peak else None,
		},
		"production_sales": {
			"sugar_produced_today_mt": ((prod_today or {}).get("finished_qty") or 0) * qtl_to_mt,
			"season_sugar_production_mt": prod_season_totals["finished_qty"] * qtl_to_mt,
			"current_stock_value_cr": current_stock_value_cr,
			"today_sugar_sales_qty": today_sugar_sales_qty,
			"today_sugar_sales_value_cr": today_sugar_sales_value_cr,
			"sales_as_of_date": sales_latest_date,
			"sales_is_today": financial_is_today,
		},
		"financial_position": {
			"bank_balance_cr": (bank_gl["debit"] - bank_gl["credit"]) / 1e7,
			"outstanding_receivables_cr": (receivable_gl["debit"] - receivable_gl["credit"]) / 1e7,
			"outstanding_payables_cr": (payable_gl["credit"] - payable_gl["debit"]) / 1e7,
			"today_revenue_cr": (income_today_gl["credit"] - income_today_gl["debit"]) / 1e7,
			"today_expenses_cr": purchase_today_cr / 1e7,
			"as_of_date": sales_latest_date,
			"is_today": financial_is_today,
		},
		"hourly": hourly,
		"alerts": alerts,
	}


@frappe.whitelist()
def get_management_dashboard_data():
	require_dashboard_access()
	data = get_or_set_cache("sugar360:management:dashboard", CACHE_TTL_SECONDS, _build_management_dashboard_data)
	return to_camel_case(data)
