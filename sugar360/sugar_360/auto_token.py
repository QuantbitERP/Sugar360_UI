"""Auto Token / gate-metrics helpers, ported from Sugar360_UI/src/lib/cane/auto-token.server.ts.

"Trips" for this mill are counted from `Auto Token.no_of_tripsheet` — one token can cover
several trip sheets (a vehicle+trolley combination), so sum(no_of_tripsheet) is the correct
trip count, not a row count on Cane Weight. Every query here is scoped docstatus=1 (submitted
tokens only). Shared by the Cane & Agriculture, H&T and Management dashboards.
"""

import datetime as dt

import frappe
from frappe.utils import flt, get_datetime, get_time


def _fetch_trip_sum(filters, group_by=None):
	fields = ([group_by] if group_by else []) + ["sum(no_of_tripsheet) as trips"]
	kwargs = {"filters": filters, "fields": fields, "ignore_permissions": True}
	# Frappe's get_list defaults limit_page_length to 20 when omitted — fatal for a group_by
	# query where the group count can exceed that (verified: up to 293 transporter contracts).
	if group_by:
		kwargs["group_by"] = group_by
		kwargs["limit_page_length"] = 0
	return frappe.get_list("Auto Token", **kwargs)


def fetch_trips_on_date(season: str, date: str) -> float:
	rows = _fetch_trip_sum({"docstatus": 1, "season": season, "posting_date": date})
	return flt(rows[0]["trips"]) if rows else 0.0


def fetch_trips_for_season(season: str) -> float:
	rows = _fetch_trip_sum({"docstatus": 1, "season": season})
	return flt(rows[0]["trips"]) if rows else 0.0


def fetch_shift_trips(season: str, date: str) -> list[dict]:
	rows = _fetch_trip_sum({"docstatus": 1, "season": season, "posting_date": date}, group_by="shift")
	return [{"shift": r.get("shift"), "trips": flt(r.get("trips"))} for r in rows]


def fetch_trips_by_contract(season: str) -> list[dict]:
	rows = _fetch_trip_sum(
		[
			["docstatus", "=", 1],
			["season", "=", season],
			["transporter_contract", "!=", ""],
		],
		group_by="transporter_contract",
	)
	return [
		{"transporter_contract": r["transporter_contract"], "trips": flt(r.get("trips"))}
		for r in rows
		if r.get("transporter_contract")
	]


def _fetch_auto_tokens_for_date(season: str, date: str) -> list[dict]:
	return frappe.get_list(
		"Auto Token",
		filters={"docstatus": 1, "season": season, "posting_date": date},
		fields=["name", "posting_date", "posting_time"],
		limit_page_length=0,
		ignore_permissions=True,
	)


def _fetch_trip_sheet_links(token_names: list[str]) -> list[dict]:
	if not token_names:
		return []
	return frappe.get_list(
		"Auto Token Trip sheet Details",
		parent_doctype="Auto Token",
		filters=[["parent", "in", token_names]],
		fields=["parent", "trip_sheet_no"],
		limit_page_length=0,
		ignore_permissions=True,
	)


def _fetch_trip_sheet_statuses(trip_sheet_names: list[str]) -> dict:
	if not trip_sheet_names:
		return {}
	rows = frappe.get_list(
		"Trip Sheet",
		filters=[["name", "in", trip_sheet_names]],
		fields=["name", "status"],
		limit_page_length=0,
		ignore_permissions=True,
	)
	return {r["name"]: r["status"] for r in rows}


def _fetch_gross_weight_timestamps(trip_sheet_names: list[str]) -> dict:
	if not trip_sheet_names:
		return {}
	rows = frappe.get_list(
		"Cane Weight",
		filters=[["docstatus", "=", 1], ["trip_sheet", "in", trip_sheet_names]],
		fields=["trip_sheet", "gross_weight_timestamp"],
		limit_page_length=0,
		ignore_permissions=True,
	)
	return {r["trip_sheet"]: r["gross_weight_timestamp"] for r in rows if r.get("gross_weight_timestamp")}


def fetch_auto_token_trip_sheet_pairs(season: str, date: str) -> list[dict]:
	"""The single join every gate/status metric is built from: every Auto Token issued that
	day, exploded to one row per linked Trip Sheet, each carrying that Trip Sheet's current
	status and — when weighed — the matching Cane Weight's gross_weight_timestamp."""
	tokens = _fetch_auto_tokens_for_date(season, date)
	if not tokens:
		return []

	token_by_name = {t["name"]: t for t in tokens}
	links = _fetch_trip_sheet_links([t["name"] for t in tokens])
	trip_sheet_names = list({link["trip_sheet_no"] for link in links})

	statuses = _fetch_trip_sheet_statuses(trip_sheet_names)
	gross_timestamps = _fetch_gross_weight_timestamps(trip_sheet_names)

	pairs = []
	for link in links:
		token = token_by_name.get(link["parent"])
		if not token:
			continue
		pairs.append(
			{
				"token_name": token["name"],
				"posting_date": token["posting_date"],
				"posting_time": token["posting_time"],
				"trip_sheet_no": link["trip_sheet_no"],
				"status": statuses.get(link["trip_sheet_no"]),
				"gross_weight_timestamp": gross_timestamps.get(link["trip_sheet_no"]),
			}
		)
	return pairs


def compute_gate_metrics(pairs: list[dict]) -> dict:
	"""- Pending Vehicles at Gate = pairs whose linked Trip Sheet status is "Pending Token".
	- Avg Vehicle Wait Time = for pairs with a recorded gross_weight_timestamp, the gap from
	  the token's posting_date+posting_time to that timestamp, averaged across all such pairs.
	"""
	pending_vehicles_at_gate = 0
	wait_minutes: list[float] = []

	for pair in pairs:
		if pair.get("status") == "Pending Token":
			pending_vehicles_at_gate += 1
		if not pair.get("gross_weight_timestamp"):
			continue

		posting_date = get_datetime(pair["posting_date"]).date()
		posting_time = get_time(pair["posting_time"])
		start = dt.datetime.combine(posting_date, posting_time)
		end = get_datetime(pair["gross_weight_timestamp"])
		minutes = (end - start).total_seconds() / 60
		# Discard non-sensical gaps (bad data, cross-midnight time-only artifacts) rather than
		# let a handful of outliers dominate the average.
		if 0 <= minutes <= 24 * 60:
			wait_minutes.append(minutes)

	avg_vehicle_wait_min = sum(wait_minutes) / len(wait_minutes) if wait_minutes else None
	return {
		"pending_vehicles_at_gate": pending_vehicles_at_gate,
		"avg_vehicle_wait_min": avg_vehicle_wait_min,
		"wait_sample_size": len(wait_minutes),
	}


def fetch_gate_metrics(season: str, date: str) -> dict:
	return compute_gate_metrics(fetch_auto_token_trip_sheet_pairs(season, date))


def compute_trip_sheet_status_counts(pairs: list[dict]) -> list[dict]:
	counts: dict[str, int] = {}
	for pair in pairs:
		status = pair.get("status") or "Unknown"
		counts[status] = counts.get(status, 0) + 1
	return [{"status": status, "count": count} for status, count in counts.items()]


def fetch_trip_sheet_status_counts(season: str, date: str) -> list[dict]:
	return compute_trip_sheet_status_counts(fetch_auto_token_trip_sheet_pairs(season, date))
