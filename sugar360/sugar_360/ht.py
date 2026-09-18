"""Harvesting & Transport dashboard — ported from Sugar360_UI/src/lib/ht/*.

Data comes from three real sources: HT Contract (contractor master), Cane Weight (every
weighbridge slip links back to the transporter_contract/harvester_contract that moved it), and
HT Advance Request (+ its HT Advance Request Details child) for sanctioned/paid advances.
"""

import frappe

from sugar360.sugar_360.access import require_dashboard_access
from sugar360.sugar_360.auto_token import fetch_trip_sheet_status_counts, fetch_trips_by_contract
from sugar360.sugar_360.cache import get_or_set_cache
from sugar360.sugar_360.cane import (
	fetch_latest_activity_date,
	fetch_season_received,
	fetch_trips_on_date_totals,
	fetch_village_names,
	resolve_active_season,
	today_iso_date_ist,
)
from sugar360.sugar_360.serialize import to_camel_case

CACHE_TTL = {"dashboard": 60}

CONFIG = {
	# How many top contractors (by season quantity supplied) to show.
	"top_contractors_limit": 10,
	# How many "advance paid, zero deliveries" exceptions to surface.
	"zero_delivery_limit": 8,
}


def fetch_total_active_contracts(season: str) -> int:
	rows = frappe.get_list(
		"HT Contract",
		filters=[["season", "=", season], ["disable", "=", 0], ["transporter", "!=", ""]],
		fields=["count(name) as total"],
		ignore_permissions=True,
	)
	return rows[0].get("total") or 0 if rows else 0


def fetch_active_contracts_on_date(season: str, date: str) -> int:
	rows = frappe.get_list(
		"Cane Weight",
		filters={"docstatus": 1, "season": season, "posting_date": date},
		fields=["count(distinct transporter_contract) as total"],
		ignore_permissions=True,
	)
	return rows[0].get("total") or 0 if rows else 0


def fetch_season_quantity_via_ht(season: str) -> float:
	rows = frappe.get_list(
		"Cane Weight",
		filters=[["docstatus", "=", 1], ["season", "=", season], ["transporter_contract", "!=", ""]],
		fields=["sum(net_weight) as total"],
		ignore_permissions=True,
	)
	return frappe.utils.flt(rows[0].get("total")) if rows else 0.0


def fetch_advance_request_names(season: str) -> list[str]:
	rows = frappe.get_list(
		"HT Advance Request",
		filters={"season": season, "docstatus": 1},
		fields=["name"],
		limit_page_length=0,
		ignore_permissions=True,
	)
	return [r["name"] for r in rows]


def _fetch_advance_detail_aggregate(request_names: list[str], group_by: str | None = None) -> list[dict]:
	if not request_names:
		return []
	fields = ([group_by] if group_by else []) + ["sum(sanction_amount) as sanctioned", "sum(paid_amount) as paid"]
	kwargs = {"ignore_permissions": True}
	if group_by:
		kwargs["group_by"] = group_by
		kwargs["limit_page_length"] = 0
	return frappe.get_list(
		"HT Advance Request Details",
		parent="HT Advance Request",
		filters=[["parent", "in", request_names]],
		fields=fields,
		**kwargs,
	)


def fetch_advance_totals(request_names: list[str]) -> dict:
	rows = _fetch_advance_detail_aggregate(request_names)
	return {
		"sanctioned": frappe.utils.flt(rows[0].get("sanctioned")) if rows else 0.0,
		"paid": frappe.utils.flt(rows[0].get("paid")) if rows else 0.0,
	}


def fetch_advance_by_contract(request_names: list[str]) -> list[dict]:
	rows = _fetch_advance_detail_aggregate(request_names, group_by="ht_contract")
	return [
		{
			"ht_contract": r["ht_contract"],
			"sanctioned": frappe.utils.flt(r.get("sanctioned")),
			"paid": frappe.utils.flt(r.get("paid")),
		}
		for r in rows
		if r.get("ht_contract")
	]


def fetch_top_contractors(season: str) -> list[dict]:
	rows = frappe.get_list(
		"Cane Weight",
		filters=[["docstatus", "=", 1], ["season", "=", season], ["transporter_contract", "!=", ""]],
		fields=["transporter_contract", "transporter_name", "sum(net_weight) as supplied"],
		group_by="transporter_contract, transporter_name",
		order_by="supplied desc",
		limit_page_length=CONFIG["top_contractors_limit"],
		ignore_permissions=True,
	)
	trips_by_contract = {t["transporter_contract"]: t["trips"] for t in fetch_trips_by_contract(season)}
	return [
		{
			"transporter_contract": r.get("transporter_contract") or "",
			"transporter_name": (r.get("transporter_name") or "Unnamed contractor").strip(),
			"supplied_mt": frappe.utils.flt(r.get("supplied")),
			"trips": trips_by_contract.get(r.get("transporter_contract") or "", 0),
		}
		for r in rows
	]


def fetch_contracts_with_deliveries(season: str) -> set:
	rows = frappe.get_list(
		"Cane Weight",
		filters=[["docstatus", "=", 1], ["season", "=", season], ["transporter_contract", "!=", ""]],
		fields=["transporter_contract"],
		group_by="transporter_contract",
		limit_page_length=0,
		ignore_permissions=True,
	)
	return {r["transporter_contract"] for r in rows if r.get("transporter_contract")}


def fetch_contract_villages(contract_names: list[str]) -> dict:
	if not contract_names:
		return {}
	rows = frappe.get_list(
		"HT Contract",
		filters=[["name", "in", contract_names]],
		fields=["name", "village"],
		limit_page_length=0,
		ignore_permissions=True,
	)
	return {r["name"]: r.get("village") or "" for r in rows}


def _build_ht_dashboard_data() -> dict:
	season = resolve_active_season()
	today = today_iso_date_ist()

	latest_activity_date = fetch_latest_activity_date(season["name"])
	status_date = latest_activity_date or today
	is_today = str(status_date) == today

	total_active_contracts = fetch_total_active_contracts(season["name"])
	active_contracts_today = fetch_active_contracts_on_date(season["name"], status_date)
	season_quantity_via_ht_mt = fetch_season_quantity_via_ht(season["name"])
	advance_request_names = fetch_advance_request_names(season["name"])
	trips_today = fetch_trips_on_date_totals(season["name"], status_date)
	trip_status_raw = fetch_trip_sheet_status_counts(season["name"], status_date)
	top_contractors_raw = fetch_top_contractors(season["name"])
	delivered_set = fetch_contracts_with_deliveries(season["name"])
	season_received = fetch_season_received(season["name"])

	advance_totals = fetch_advance_totals(advance_request_names)
	advance_by_contract = fetch_advance_by_contract(advance_request_names)
	advance_by_contract_map = {r["ht_contract"]: r for r in advance_by_contract}

	zero_delivery_source = sorted(
		(r for r in advance_by_contract if r["ht_contract"] not in delivered_set and r["paid"] > 0),
		key=lambda r: r["paid"],
		reverse=True,
	)[: CONFIG["zero_delivery_limit"]]

	all_contract_names = list(
		{
			*(r["transporter_contract"] for r in top_contractors_raw),
			*(r["ht_contract"] for r in zero_delivery_source),
		}
		- {""}
	)

	village_by_contract = fetch_contract_villages(all_contract_names)
	village_names = fetch_village_names()

	def village_label(contract: str) -> str:
		code = village_by_contract.get(contract)
		return village_names.get(code, code) if code else "—"

	top_contractors = []
	for r in top_contractors_raw:
		advance = advance_by_contract_map.get(r["transporter_contract"])
		sanctioned = advance["sanctioned"] if advance else 0.0
		paid = advance["paid"] if advance else 0.0
		top_contractors.append(
			{
				"transporter_contract": r["transporter_contract"],
				"transporter_name": r["transporter_name"],
				"village": village_label(r["transporter_contract"]),
				"supplied_mt": r["supplied_mt"],
				"trips": r["trips"],
				"advance_sanctioned_l": sanctioned / 1e5,
				"advance_paid_l": paid / 1e5,
				"advance_balance_l": (sanctioned - paid) / 1e5,
			}
		)

	zero_delivery_advances = [
		{
			"transporter_contract": r["ht_contract"],
			"village": village_label(r["ht_contract"]),
			"advance_paid_l": r["paid"] / 1e5,
		}
		for r in zero_delivery_source
	]

	pct_paid_of_sanctioned = (
		(advance_totals["paid"] / advance_totals["sanctioned"] * 100) if advance_totals["sanctioned"] > 0 else None
	)
	season_quantity_coverage_pct = (
		(season_quantity_via_ht_mt / season_received["total_mt"] * 100) if season_received["total_mt"] > 0 else None
	)

	return {
		"meta": {
			"season_name": season["name"],
			"generated_at": frappe.utils.now_datetime().isoformat(),
			"cache_ttl_seconds": CACHE_TTL["dashboard"],
		},
		"kpis": {
			"latest_activity_date": latest_activity_date,
			"is_today": is_today,
			"active_contracts_today": active_contracts_today,
			"total_active_contracts": total_active_contracts,
			"trips_on_latest_date": trips_today["trips"],
			"advance_sanctioned_cr": advance_totals["sanctioned"] / 1e7,
			"advance_paid_cr": advance_totals["paid"] / 1e7,
			"pct_paid_of_sanctioned": pct_paid_of_sanctioned,
			"season_quantity_via_ht_mt": season_quantity_via_ht_mt,
			"season_quantity_coverage_pct": season_quantity_coverage_pct,
		},
		"trip_status": trip_status_raw,
		"top_contractors": top_contractors,
		"zero_delivery_advances": zero_delivery_advances,
	}


@frappe.whitelist()
def get_ht_dashboard_data():
	require_dashboard_access()
	data = get_or_set_cache("sugar360:ht:dashboard", CACHE_TTL["dashboard"], _build_ht_dashboard_data)
	return to_camel_case(data)
