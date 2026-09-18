"""Header ticker shown on every Sugar 360 page, ported from Sugar360_UI/src/lib/ticker/*.

Deliberately the lightest cross-module read in the app (a handful of already-cached aggregates,
no per-item breakdowns), since it's fetched on every navigation rather than once per department
page.
"""

import frappe

from sugar360.sugar_360.access import require_dashboard_access
from sugar360.sugar_360.cache import get_or_set_cache
from sugar360.sugar_360.cane import (
	fetch_latest_activity_date,
	fetch_season_received,
	fetch_trips_on_date_totals,
	resolve_active_season,
	today_iso_date_ist,
)
from sugar360.sugar_360.finance import fetch_account_names_by_type, fetch_gl_balance
from sugar360.sugar_360.inventory import fetch_diesel_item_code, fetch_item_stock
from sugar360.sugar_360.production import CONFIG as PRODUCTION_CONFIG
from sugar360.sugar_360.production import fetch_bin_stock, fetch_finished_goods_season, fetch_process_order_season_totals
from sugar360.sugar_360.serialize import to_camel_case

CACHE_TTL_SECONDS = 60


def _days_between(from_iso, to_iso) -> int:
	from_date = frappe.utils.getdate(from_iso)
	to_date = frappe.utils.getdate(to_iso)
	return (to_date - from_date).days + 1


def _build_ticker_data() -> dict:
	season = resolve_active_season()
	today = today_iso_date_ist()

	cane_latest_date = fetch_latest_activity_date(season["name"])
	season_received = fetch_season_received(season["name"])
	season_production = fetch_process_order_season_totals(season["name"])
	season_finished_goods = fetch_finished_goods_season(season["name"])
	bank_accounts = fetch_account_names_by_type("Bank")
	cash_accounts = fetch_account_names_by_type("Cash")
	diesel_item_code = fetch_diesel_item_code()

	cane_status_date = cane_latest_date or today

	cane_today = fetch_trips_on_date_totals(season["name"], cane_status_date)
	bank_gl = fetch_gl_balance(bank_accounts)
	cash_gl = fetch_gl_balance(cash_accounts)
	sugar_bin_rows = fetch_bin_stock(list({r["item_code"] for r in season_finished_goods}))
	diesel = fetch_item_stock(diesel_item_code) if diesel_item_code else None

	sugar_stock_qtl = sum(r["qty"] for r in sugar_bin_rows)
	qtl_to_mt = PRODUCTION_CONFIG["qtl_to_mt"]
	sugar_produced_mt = season_production["finished_qty"] * qtl_to_mt

	season_day = (
		_days_between(season["factory_start_date"], cane_status_date) if season.get("factory_start_date") else None
	)
	season_day_total = (
		_days_between(season["factory_start_date"], season["factory_end_date"])
		if season.get("factory_start_date") and season.get("factory_end_date")
		else None
	)

	return {
		"season_day": season_day,
		"season_day_total": season_day_total,
		"cane_crushed_mt": cane_today["total_mt"],
		"cane_crushed_as_of_date": cane_latest_date,
		"season_recovery_pct": (sugar_produced_mt / season_received["total_mt"] * 100) if season_received["total_mt"] > 0 else None,
		"bank_and_cash_cr": (bank_gl["debit"] - bank_gl["credit"] + cash_gl["debit"] - cash_gl["credit"]) / 1e7,
		"sugar_stock_mt": sugar_stock_qtl * qtl_to_mt,
		"diesel_stock_l": diesel["qty"] if diesel else None,
		# No yard/in-transit stock tracking, and no Ethanol item exists in this Frappe instance.
		"cane_yard_mt": None,
		"ethanol_today_l": None,
	}


@frappe.whitelist()
def get_ticker_data():
	require_dashboard_access()
	data = get_or_set_cache("sugar360:ticker:data", CACHE_TTL_SECONDS, _build_ticker_data)
	return to_camel_case(data)
