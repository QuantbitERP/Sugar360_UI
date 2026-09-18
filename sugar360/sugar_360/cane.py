"""Cane & Agriculture dashboard — ported from Sugar360_UI/src/lib/cane/*.

Every aggregate is pushed down to MariaDB via frappe.get_list's SUM/COUNT/GROUP BY support
(the same mechanism the original Node BFF used through the whitelisted frappe.client.get_list
method) rather than pulling raw rows into Python and summing in a loop.
"""

import datetime as dt
import re
from zoneinfo import ZoneInfo

import frappe
from frappe import _
from frappe.utils import flt, get_time

from sugar360.sugar_360.access import require_dashboard_access
from sugar360.sugar_360.auto_token import fetch_gate_metrics, fetch_shift_trips, fetch_trips_for_season, fetch_trips_on_date
from sugar360.sugar_360.cache import get_or_set_cache
from sugar360.sugar_360.serialize import to_camel_case

CONFIG = {
	# Assumed cane yield per registered acre, used to estimate season availability.
	# TODO(mill ops): confirm with the agronomy/cane-development team for the active season.
	"avg_yield_mt_per_acre": 20,
	# Daily intake target used as the reference line on the supply-vs-target chart.
	"target_daily_supply_mt": 5000,
	"supply_trend_days": 10,
	"variety_top_n": 6,
	"zone_limit": 8,
}

CACHE_TTL = {
	"dashboard": 60,
	"season": 300,
	"dimensions": 1800,
}

ACTIVITY_PAGE_SIZE = 8


# ---- Active season resolution ----


def resolve_active_season() -> dict:
	"""Prefers Season.is_current, but that flag can go stale between seasons, so this falls
	back to "the season with the most recent Cane Weight posting" when is_current has no
	activity — which is what "active season" actually means operationally."""

	def _load():
		flagged = frappe.get_list(
			"Season",
			filters={"is_current": 1},
			fields=["name", "factory_start_date", "factory_end_date"],
			limit_page_length=1,
			ignore_permissions=True,
		)
		candidate = flagged[0] if flagged else None

		if candidate:
			has_activity = frappe.get_list(
				"Cane Weight",
				filters={"docstatus": 1, "season": candidate["name"]},
				fields=["name"],
				limit_page_length=1,
				ignore_permissions=True,
			)
			if has_activity:
				return {
					"name": candidate["name"],
					"factory_start_date": candidate.get("factory_start_date"),
					"factory_end_date": candidate.get("factory_end_date"),
				}

		latest_active = frappe.get_list(
			"Cane Weight",
			filters={"docstatus": 1},
			fields=["season"],
			order_by="posting_date desc",
			limit_page_length=1,
			ignore_permissions=True,
		)

		season_name = (latest_active[0]["season"] if latest_active else None) or (
			candidate["name"] if candidate else None
		)
		if not season_name:
			frappe.throw(_("No cane season could be resolved — no Season or Cane Weight records found."))

		dates = frappe.get_list(
			"Season",
			filters={"name": season_name},
			fields=["name", "factory_start_date", "factory_end_date"],
			limit_page_length=1,
			ignore_permissions=True,
		)

		return {
			"name": season_name,
			"factory_start_date": dates[0].get("factory_start_date") if dates else None,
			"factory_end_date": dates[0].get("factory_end_date") if dates else None,
		}

	return get_or_set_cache("sugar360:cane:season:active", CACHE_TTL["season"], _load)


def previous_season_name(season: str) -> str | None:
	"""'2025-2026' -> '2024-2025'. Returns None if the season isn't named YYYY-YYYY."""
	match = re.match(r"^(\d{4})-(\d{4})$", season or "")
	if not match:
		return None
	start, end = match.groups()
	return f"{int(start) - 1}-{int(end) - 1}"


# ---- Aggregate queries ----


def fetch_registered_area(season: str) -> dict:
	rows = frappe.get_list(
		"Cane Registration",
		filters={"season": season},
		fields=["sum(area_in_acrs) as total_area", "count(name) as plots"],
		ignore_permissions=True,
	)
	return {
		"total_acres": flt(rows[0].get("total_area")) if rows else 0.0,
		"plot_count": rows[0].get("plots") if rows else 0,
	}


def fetch_season_received(season: str) -> dict:
	weight_rows = frappe.get_list(
		"Cane Weight",
		filters={"docstatus": 1, "season": season},
		fields=["sum(net_weight) as total"],
		ignore_permissions=True,
	)
	trips = fetch_trips_for_season(season)
	return {"total_mt": flt(weight_rows[0].get("total")) if weight_rows else 0.0, "trips": trips}


def fetch_trips_on_date_totals(season: str, posting_date: str) -> dict:
	weight_rows = frappe.get_list(
		"Cane Weight",
		filters={"docstatus": 1, "season": season, "posting_date": posting_date},
		fields=["sum(net_weight) as total"],
		ignore_permissions=True,
	)
	trips = fetch_trips_on_date(season, posting_date)
	return {"total_mt": flt(weight_rows[0].get("total")) if weight_rows else 0.0, "trips": trips}


def fetch_supply_trend(season: str) -> list[dict]:
	rows = frappe.get_list(
		"Cane Weight",
		filters={"docstatus": 1, "season": season},
		fields=["posting_date", "sum(net_weight) as total"],
		group_by="posting_date",
		order_by="posting_date desc",
		limit_page_length=CONFIG["supply_trend_days"],
		ignore_permissions=True,
	)
	return list(reversed(rows))  # chronological for the chart


def fetch_variety_mix(season: str) -> list[dict]:
	return frappe.get_list(
		"Cane Weight",
		filters={"docstatus": 1, "season": season},
		fields=["crop_variety", "sum(net_weight) as total"],
		group_by="crop_variety",
		order_by="total desc",
		limit_page_length=CONFIG["variety_top_n"],
		ignore_permissions=True,
	)


def fetch_zone_registered_area(season: str) -> list[dict]:
	return frappe.get_list(
		"Cane Registration",
		filters={"season": season},
		fields=["circle_office", "sum(area_in_acrs) as area"],
		group_by="circle_office",
		order_by="area desc",
		limit_page_length=CONFIG["zone_limit"],
		ignore_permissions=True,
	)


def fetch_zone_received(season: str) -> list[dict]:
	return frappe.get_list(
		"Cane Weight",
		filters={"docstatus": 1, "season": season},
		fields=["circle_office", "sum(net_weight) as received"],
		group_by="circle_office",
		limit_page_length=0,  # group_by needs "no limit", not the default-20 row cap
		ignore_permissions=True,
	)


def fetch_shift_breakdown(season: str, posting_date: str) -> list[dict]:
	weight_rows = frappe.get_list(
		"Cane Weight",
		filters={"docstatus": 1, "season": season, "posting_date": posting_date},
		fields=["shift", "sum(net_weight) as total"],
		group_by="shift",
		limit_page_length=0,
		ignore_permissions=True,
	)
	trips_by_shift = {row["shift"]: row["trips"] for row in fetch_shift_trips(season, posting_date)}
	return [
		{"shift": row.get("shift"), "total": flt(row.get("total")), "trips": trips_by_shift.get(row.get("shift"), 0)}
		for row in weight_rows
	]


def fetch_day_span(season: str, posting_date: str) -> dict:
	rows = frappe.get_list(
		"Cane Weight",
		filters={"docstatus": 1, "season": season, "posting_date": posting_date},
		fields=["min(posting_time) as first_time", "max(posting_time) as last_time"],
		ignore_permissions=True,
	)
	return rows[0] if rows else {"first_time": None, "last_time": None}


def fetch_latest_activity_date(season: str) -> str | None:
	rows = frappe.get_list(
		"Cane Weight",
		filters={"docstatus": 1, "season": season},
		fields=["posting_date"],
		order_by="posting_date desc",
		limit_page_length=1,
		ignore_permissions=True,
	)
	return rows[0].get("posting_date") if rows else None


# ---- Dimension (code -> label) lookups — small, near-static, cached longer ----


def fetch_circle_office_names() -> dict:
	def _load():
		rows = frappe.get_list(
			"Circle Office",
			fields=["name", "circle_office_name"],
			limit_page_length=0,
			ignore_permissions=True,
		)
		return {r["name"]: r.get("circle_office_name") or r["name"] for r in rows}

	return get_or_set_cache("sugar360:dim:circle_office", CACHE_TTL["dimensions"], _load)


def fetch_crop_variety_names() -> dict:
	def _load():
		rows = frappe.get_list(
			"Crop Variety",
			fields=["name", "ll_name"],
			limit_page_length=0,
			ignore_permissions=True,
		)
		return {r["name"]: r.get("ll_name") or r["name"] for r in rows}

	return get_or_set_cache("sugar360:dim:crop_variety", CACHE_TTL["dimensions"], _load)


def fetch_factory_shift_names() -> dict:
	def _load():
		rows = frappe.get_list(
			"Factory Shift",
			fields=["name", "shift_name"],
			limit_page_length=0,
			ignore_permissions=True,
		)
		return {r["name"]: r.get("shift_name") or r["name"] for r in rows}

	return get_or_set_cache("sugar360:dim:factory_shift", CACHE_TTL["dimensions"], _load)


def fetch_village_names() -> dict:
	def _load():
		rows = frappe.get_list(
			"Village",
			fields=["name", "village_name"],
			limit_page_length=0,
			ignore_permissions=True,
		)
		return {r["name"]: r.get("village_name") or r["name"] for r in rows}

	return get_or_set_cache("sugar360:dim:village", CACHE_TTL["dimensions"], _load)


# ---- Dashboard payload ----


def today_iso_date_ist() -> str:
	return dt.datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d")


def _time_to_hours(value) -> float | None:
	if not value:
		return None
	t = get_time(value)
	return t.hour + t.minute / 60 + t.second / 3600


def _build_cane_dashboard_data() -> dict:
	season = resolve_active_season()
	previous_season = previous_season_name(season["name"])
	today = today_iso_date_ist()

	registered = fetch_registered_area(season["name"])
	received = fetch_season_received(season["name"])
	latest_activity_date = fetch_latest_activity_date(season["name"])
	trend_raw = fetch_supply_trend(season["name"])
	variety_raw = fetch_variety_mix(season["name"])
	zone_area_raw = fetch_zone_registered_area(season["name"])
	zone_received_raw = fetch_zone_received(season["name"])
	circle_names = fetch_circle_office_names()
	variety_names = fetch_crop_variety_names()
	shift_names = fetch_factory_shift_names()
	previous_registered = fetch_registered_area(previous_season) if previous_season else None

	# "Today" only means something while the mill is actually crushing. Off-season (or if
	# today's batch hasn't posted yet), report against the most recent day that actually has
	# data instead of silently showing zeros that would read as "nothing arrived today".
	status_date = latest_activity_date or today
	is_today = str(status_date) == today

	todays_totals = fetch_trips_on_date_totals(season["name"], status_date)
	shift_rows_raw = fetch_shift_breakdown(season["name"], status_date)
	day_span = fetch_day_span(season["name"], status_date)
	gate_metrics = fetch_gate_metrics(season["name"], status_date)

	est_availability_mt = registered["total_acres"] * CONFIG["avg_yield_mt_per_acre"]

	variety_total_shown = sum(flt(row.get("total")) for row in variety_raw)
	other_mt = max(received["total_mt"] - variety_total_shown, 0)
	variety_mix = [
		{
			"variety": variety_names.get(row["crop_variety"], row["crop_variety"])
			if row.get("crop_variety")
			else "Unspecified",
			"total_mt": flt(row.get("total")),
			"share_pct": (flt(row.get("total")) / received["total_mt"] * 100) if received["total_mt"] > 0 else 0,
		}
		for row in variety_raw
	]
	if other_mt > 0:
		variety_mix.append(
			{
				"variety": "Other",
				"total_mt": other_mt,
				"share_pct": (other_mt / received["total_mt"] * 100) if received["total_mt"] > 0 else 0,
			}
		)

	received_by_zone = {row.get("circle_office") or "": flt(row.get("received")) for row in zone_received_raw}
	zone_health = []
	for row in zone_area_raw:
		code = row.get("circle_office") or ""
		area_acres = flt(row.get("area"))
		received_mt = received_by_zone.get(code, 0)
		est_mt = area_acres * CONFIG["avg_yield_mt_per_acre"]
		zone_health.append(
			{
				"circle_office": circle_names.get(code, code) if code else "Unassigned",
				"registered_area_acres": area_acres,
				"received_mt": received_mt,
				"est_availability_mt": est_mt,
				"coverage_pct": (received_mt / est_mt * 100) if est_mt > 0 else None,
			}
		)

	shifts = [
		{
			"shift": shift_names.get(row["shift"], row["shift"]) if row.get("shift") else "Unassigned",
			"total_mt": flt(row.get("total")),
			"trips": row.get("trips") or 0,
		}
		for row in shift_rows_raw
	]

	first_hours = _time_to_hours(day_span.get("first_time"))
	last_hours = _time_to_hours(day_span.get("last_time"))
	span_hours = max(last_hours - first_hours, 0.25) if first_hours is not None and last_hours is not None else None

	registered_area_delta_pct = None
	if previous_registered and previous_registered["total_acres"] > 0:
		registered_area_delta_pct = (
			(registered["total_acres"] - previous_registered["total_acres"]) / previous_registered["total_acres"] * 100
		)

	expected_crushing_days_remaining = None
	if season.get("factory_end_date") and is_today:
		end_date = frappe.utils.getdate(season["factory_end_date"])
		today_date = frappe.utils.getdate(today)
		expected_crushing_days_remaining = max((end_date - today_date).days, 0)

	return {
		"meta": {
			"season_name": season["name"],
			"generated_at": frappe.utils.now_datetime().isoformat(),
			"cache_ttl_seconds": CACHE_TTL["dashboard"],
		},
		"kpis": {
			"registered_area_acres": registered["total_acres"],
			"registered_area_delta_pct": registered_area_delta_pct,
			"est_availability_mt": est_availability_mt,
			"avg_yield_mt_per_acre": CONFIG["avg_yield_mt_per_acre"],
			"received_season_mt": received["total_mt"],
			"pct_of_estimate": (received["total_mt"] / est_availability_mt * 100) if est_availability_mt > 0 else None,
			"latest_activity_date": latest_activity_date,
			"is_today": is_today,
			"trips_on_latest_date": todays_totals["trips"],
			"supply_target_mt": CONFIG["target_daily_supply_mt"],
			"expected_crushing_days_remaining": expected_crushing_days_remaining,
			"season_end_date": season.get("factory_end_date"),
		},
		"supply_trend": [
			{
				"date": row["posting_date"],
				"received_mt": flt(row.get("total")),
				"target_mt": CONFIG["target_daily_supply_mt"],
			}
			for row in trend_raw
		],
		"variety_mix": variety_mix,
		"zone_health": zone_health,
		"weighbridge": {
			"as_of_date": status_date,
			"cane_received_per_hour_mt": (todays_totals["total_mt"] / span_hours) if span_hours else None,
			"shifts": shifts,
			# Pending Vehicles at Gate / Avg Vehicle Wait Time: see auto_token.py for the exact join.
			"pending_vehicles_at_gate": gate_metrics["pending_vehicles_at_gate"],
			"avg_vehicle_wait_min": gate_metrics["avg_vehicle_wait_min"],
			# Avg Weighment Time and Avg Pol% still have no confirmed data source in this
			# instance — surfaced as None rather than invented.
			"avg_weighment_min": None,
			"avg_pol_percent": None,
		},
	}


@frappe.whitelist()
def get_cane_dashboard_data():
	"""The single bundled read the Cane & Agriculture page issues: one cached, fan-out of
	aggregate queries -> one JSON payload."""
	require_dashboard_access()
	data = get_or_set_cache("sugar360:cane:dashboard", CACHE_TTL["dashboard"], _build_cane_dashboard_data)
	return to_camel_case(data)


# ---- Operational updates feed ----


def _format_time(date, time) -> str:
	time_str = str(time)
	parts = time_str.split(":")
	h = parts[0] if len(parts) > 0 else "00"
	m = parts[1] if len(parts) > 1 else "00"
	return f"{date} · {h}:{m}"


@frappe.whitelist()
def get_cane_activity_page(cursor: int = 0):
	"""Real, paginated feed of the most recent submitted weighbridge slips, backing the
	dashboard's "Operational updates" infinite-scroll list."""
	require_dashboard_access()
	cursor = cursor if isinstance(cursor, int) and cursor >= 0 else 0

	rows = frappe.get_list(
		"Cane Weight",
		filters={"docstatus": 1},
		fields=["name", "farmer_name", "village", "net_weight", "posting_date", "posting_time"],
		order_by="creation desc",
		limit_start=cursor,
		limit_page_length=ACTIVITY_PAGE_SIZE,
		ignore_permissions=True,
	)
	village_names = fetch_village_names()

	items = []
	for row in rows:
		farmer = (row.get("farmer_name") or "").strip() or "Unrecorded grower"
		village = village_names.get(row["village"], row["village"]) if row.get("village") else None
		net_weight = flt(row.get("net_weight"))
		items.append(
			{
				"id": row["name"],
				"title": "Weighbridge slip recorded",
				"detail": f"{farmer}{f' · {village}' if village else ''} · {net_weight:.2f} MT",
				"time": _format_time(row["posting_date"], row["posting_time"]),
				"severity": "warning" if net_weight <= 0 else "normal",
				"acknowledged": False,
			}
		)

	return to_camel_case(
		{
			"items": items,
			"next_cursor": cursor + ACTIVITY_PAGE_SIZE if len(rows) == ACTIVITY_PAGE_SIZE else None,
		}
	)
