"""Finance & Sales dashboard — ported from Sugar360_UI/src/lib/finance/*.

Real accounting/sales/purchase doctypes:
 - Bank/cash/receivable/payable balances: GL Entry, scoped by Account.account_type (every GL
   query filters is_cancelled=0).
 - Revenue totals: GL Entry against Income-type accounts.
 - Product-wise revenue: Sales Invoice Item, scoped to items the mill has opted in via the
   Item.apply_to_sugar_360 checkbox (a Custom Field), not a hardcoded item list.
 - Purchases: Purchase Invoice (+ its Item child for the head-wise split).
"""

import datetime as dt

import frappe
from frappe.utils import flt

from sugar360.sugar_360.access import require_dashboard_access
from sugar360.sugar_360.cache import get_or_set_cache
from sugar360.sugar_360.cane import resolve_active_season, today_iso_date_ist
from sugar360.sugar_360.serialize import to_camel_case

CACHE_TTL = {
	"dashboard": 60,
	# Account lists by type barely change — cache longer.
	"accounts_by_type": 30 * 60,
	"price_trend": 60,
}

CONFIG = {
	"top_customers_limit": 10,
	"purchase_item_group_limit": 8,
}

# No confirmed MSP source in this instance — the same reference value the original mock used.
REFERENCE_MSP_PER_QTL = 3100


def _month_start_iso_date(date_iso: str) -> str:
	return f"{str(date_iso)[:7]}-01"


def fetch_account_names_by_type(account_type: str) -> list[str]:
	def _load():
		rows = frappe.get_list(
			"Account",
			filters={"account_type": account_type, "is_group": 0},
			fields=["name"],
			limit_page_length=0,
			ignore_permissions=True,
		)
		return [r["name"] for r in rows]

	return get_or_set_cache(f"sugar360:dim:accounts:{account_type}", CACHE_TTL["accounts_by_type"], _load)


def fetch_gl_balance(account_names: list[str], extra_filters: list | None = None) -> dict:
	if not account_names:
		return {"debit": 0.0, "credit": 0.0}
	filters = [["account", "in", account_names], ["is_cancelled", "=", 0], *(extra_filters or [])]
	rows = frappe.get_list(
		"GL Entry",
		filters=filters,
		fields=["sum(debit) as d", "sum(credit) as c"],
		ignore_permissions=True,
	)
	return {"debit": flt(rows[0].get("d")) if rows else 0.0, "credit": flt(rows[0].get("c")) if rows else 0.0}


def fetch_flagged_revenue_items() -> list[dict]:
	def _load():
		return frappe.get_list(
			"Item",
			filters={"apply_to_sugar_360": 1},
			fields=["name", "item_name", "item_group"],
			limit_page_length=0,
			ignore_permissions=True,
		)

	# Reuses the accounts-by-type TTL, matching the original (a minor quirk, kept for parity).
	return get_or_set_cache("sugar360:dim:sugar360_items", CACHE_TTL["accounts_by_type"], _load)


def fetch_product_wise_revenue(item_codes: list[str]) -> list[dict]:
	if not item_codes:
		return []
	rows = frappe.get_list(
		"Sales Invoice Item",
		parent="Sales Invoice",
		filters=[["docstatus", "=", 1], ["item_code", "in", item_codes]],
		fields=["item_code", "sum(amount) as total"],
		group_by="item_code",
		order_by="total desc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	return [{"item_code": r["item_code"], "total": flt(r.get("total"))} for r in rows]


def fetch_sales_invoice_latest_date() -> str | None:
	rows = frappe.get_list(
		"Sales Invoice",
		filters={"docstatus": 1},
		fields=["posting_date"],
		order_by="posting_date desc",
		limit_page_length=1,
		ignore_permissions=True,
	)
	return rows[0].get("posting_date") if rows else None


def fetch_purchase_invoice_latest_date() -> str | None:
	rows = frappe.get_list(
		"Purchase Invoice",
		filters={"docstatus": 1},
		fields=["posting_date"],
		order_by="posting_date desc",
		limit_page_length=1,
		ignore_permissions=True,
	)
	return rows[0].get("posting_date") if rows else None


def fetch_sales_invoices_in_range(from_date: str, to_date: str) -> list[dict]:
	return frappe.get_list(
		"Sales Invoice",
		filters=[["docstatus", "=", 1], ["posting_date", ">=", from_date], ["posting_date", "<=", to_date]],
		fields=["name", "posting_date"],
		limit_page_length=0,
		ignore_permissions=True,
	)


def fetch_purchase_invoice_total_in_range(from_date: str, to_date: str) -> float:
	rows = frappe.get_list(
		"Purchase Invoice",
		filters=[["docstatus", "=", 1], ["posting_date", ">=", from_date], ["posting_date", "<=", to_date]],
		fields=["sum(grand_total) as total"],
		ignore_permissions=True,
	)
	return flt(rows[0].get("total")) if rows else 0.0


def _fetch_purchase_invoice_names_in_range(from_date: str, to_date: str) -> list[str]:
	rows = frappe.get_list(
		"Purchase Invoice",
		filters=[["docstatus", "=", 1], ["posting_date", ">=", from_date], ["posting_date", "<=", to_date]],
		fields=["name"],
		limit_page_length=0,
		ignore_permissions=True,
	)
	return [r["name"] for r in rows]


def fetch_purchase_by_item_group(from_date: str, to_date: str) -> list[dict]:
	names = _fetch_purchase_invoice_names_in_range(from_date, to_date)
	if not names:
		return []
	rows = frappe.get_list(
		"Purchase Invoice Item",
		parent="Purchase Invoice",
		filters=[["docstatus", "=", 1], ["parent", "in", names]],
		fields=["item_group", "sum(amount) as total"],
		group_by="item_group",
		order_by="total desc",
		limit_page_length=CONFIG["purchase_item_group_limit"],
		ignore_permissions=True,
	)
	return [{"item_group": r.get("item_group") or "Unclassified", "total": flt(r.get("total"))} for r in rows]


def fetch_grade_wise_sales(invoice_names: list[str], item_codes: list[str]) -> list[dict]:
	if not invoice_names or not item_codes:
		return []
	rows = frappe.get_list(
		"Sales Invoice Item",
		parent="Sales Invoice",
		filters=[["docstatus", "=", 1], ["parent", "in", invoice_names], ["item_code", "in", item_codes]],
		fields=["item_code", "sum(qty) as qty", "sum(amount) as amount"],
		group_by="item_code",
		order_by="amount desc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	return [{"item_code": r["item_code"], "qty": flt(r.get("qty")), "amount": flt(r.get("amount"))} for r in rows]


def fetch_top_customers(season: str) -> list[dict]:
	return frappe.get_list(
		"Sales Invoice",
		filters={"docstatus": 1, "season": season},
		fields=["customer", "customer_name", "sum(grand_total) as total", "sum(outstanding_amount) as outstanding"],
		group_by="customer, customer_name",
		order_by="total desc",
		limit_page_length=CONFIG["top_customers_limit"],
		ignore_permissions=True,
	)


def fetch_sugar_price_rows(invoice_names: list[str]) -> list[dict]:
	if not invoice_names:
		return []
	return frappe.get_list(
		"Sales Invoice Item",
		parent="Sales Invoice",
		filters=[["docstatus", "=", 1], ["parent", "in", invoice_names], ["item_group", "=", "SUGAR"]],
		fields=["parent", "qty", "rate"],
		limit_page_length=0,
		ignore_permissions=True,
	)


def _build_finance_dashboard_data() -> dict:
	season = resolve_active_season()
	today = today_iso_date_ist()

	bank_accounts = fetch_account_names_by_type("Bank")
	cash_accounts = fetch_account_names_by_type("Cash")
	receivable_accounts = fetch_account_names_by_type("Receivable")
	payable_accounts = fetch_account_names_by_type("Payable")
	income_accounts = fetch_account_names_by_type("Income Account") + fetch_account_names_by_type("Indirect Income")
	flagged_items = fetch_flagged_revenue_items()

	bank_gl = fetch_gl_balance(bank_accounts)
	cash_gl = fetch_gl_balance(cash_accounts)
	receivable_gl = fetch_gl_balance(receivable_accounts)
	payable_gl = fetch_gl_balance(payable_accounts)
	sales_latest_date = fetch_sales_invoice_latest_date()
	purchase_latest_date = fetch_purchase_invoice_latest_date()

	# ---- Revenue: GL totals (Income accounts), product-wise via flagged items ----
	sales_status_date = sales_latest_date or today
	sales_is_today = str(sales_status_date) == today
	sales_month_start = _month_start_iso_date(sales_status_date)
	season_start = season.get("factory_start_date") or "2000-01-01"

	income_today = fetch_gl_balance(income_accounts, [["posting_date", "=", sales_status_date]])
	income_mtd = fetch_gl_balance(
		income_accounts, [["posting_date", ">=", sales_month_start], ["posting_date", "<=", sales_status_date]]
	)
	income_season = fetch_gl_balance(income_accounts, [["posting_date", ">=", season_start]])
	product_revenue = fetch_product_wise_revenue([i["name"] for i in flagged_items])

	item_name_by_code = {i["name"]: i["item_name"].strip() for i in flagged_items}
	product_revenue_total = sum(r["total"] for r in product_revenue)
	products = [
		{
			"item_code": r["item_code"],
			"item_name": item_name_by_code.get(r["item_code"], r["item_code"]),
			"amount_cr": r["total"] / 1e7,
			"share_pct": (r["total"] / product_revenue_total * 100) if product_revenue_total > 0 else 0,
		}
		for r in product_revenue
	]

	# ---- Purchases: Purchase Invoice totals + item-group breakdown ----
	purchase_status_date = purchase_latest_date or today
	purchase_is_today = str(purchase_status_date) == today
	purchase_month_start = _month_start_iso_date(purchase_status_date)

	purchase_today = fetch_purchase_invoice_total_in_range(purchase_status_date, purchase_status_date)
	purchase_mtd = fetch_purchase_invoice_total_in_range(purchase_month_start, purchase_status_date)
	purchase_season = fetch_purchase_invoice_total_in_range(season_start, purchase_status_date)
	purchase_by_head_raw = fetch_purchase_by_item_group(purchase_month_start, purchase_status_date)

	purchase_by_head_total = sum(r["total"] for r in purchase_by_head_raw)
	by_head = [
		{
			"item_group": r["item_group"],
			"amount_cr": r["total"] / 1e7,
			"share_pct": (r["total"] / purchase_by_head_total * 100) if purchase_by_head_total > 0 else 0,
		}
		for r in purchase_by_head_raw
	]

	# ---- Sales performance: grade-wise (flagged sugar items only) ----
	sugar_items = [i for i in flagged_items if i["item_group"] == "SUGAR"]
	sugar_item_codes = [i["name"] for i in sugar_items]
	today_invoices = fetch_sales_invoices_in_range(sales_status_date, sales_status_date)
	mtd_invoices = fetch_sales_invoices_in_range(sales_month_start, sales_status_date)
	today_sales = fetch_grade_wise_sales([i["name"] for i in today_invoices], sugar_item_codes)
	mtd_sales = fetch_grade_wise_sales([i["name"] for i in mtd_invoices], sugar_item_codes)
	today_by_item = {r["item_code"]: r for r in today_sales}
	mtd_by_item = {r["item_code"]: r for r in mtd_sales}

	grades = []
	for item in sugar_items:
		t = today_by_item.get(item["name"])
		m = mtd_by_item.get(item["name"])
		grades.append(
			{
				"item_code": item["name"],
				"item_name": item["item_name"].strip(),
				"today_qty": t["qty"] if t else 0.0,
				"today_value_cr": (t["amount"] if t else 0.0) / 1e7,
				"mtd_qty": m["qty"] if m else 0.0,
				"mtd_value_cr": (m["amount"] if m else 0.0) / 1e7,
			}
		)

	today_total_qty = sum(g["today_qty"] for g in grades)
	today_total_value_cr = sum(g["today_value_cr"] for g in grades)
	mtd_total_qty = sum(g["mtd_qty"] for g in grades)
	mtd_total_value_cr = sum(g["mtd_value_cr"] for g in grades)
	avg_realisation_per_qtl = (today_total_value_cr * 1e7 / today_total_qty) if today_total_qty > 0 else None

	top_customers_raw = fetch_top_customers(season["name"])

	return {
		"meta": {
			"season_name": season["name"],
			"generated_at": frappe.utils.now_datetime().isoformat(),
			"cache_ttl_seconds": CACHE_TTL["dashboard"],
		},
		"kpis": {
			"bank_balance_cr": (bank_gl["debit"] - bank_gl["credit"]) / 1e7,
			"cash_balance_cr": (cash_gl["debit"] - cash_gl["credit"]) / 1e7,
			"outstanding_receivables_cr": (receivable_gl["debit"] - receivable_gl["credit"]) / 1e7,
			"outstanding_payables_cr": (payable_gl["credit"] - payable_gl["debit"]) / 1e7,
		},
		"revenue": {
			"today_cr": (income_today["credit"] - income_today["debit"]) / 1e7,
			"mtd_cr": (income_mtd["credit"] - income_mtd["debit"]) / 1e7,
			"season_cr": (income_season["credit"] - income_season["debit"]) / 1e7,
			"is_today": sales_is_today,
			"as_of_date": sales_latest_date,
			"products": products,
		},
		"purchases": {
			"today_cr": purchase_today / 1e7,
			"mtd_cr": purchase_mtd / 1e7,
			"season_cr": purchase_season / 1e7,
			"is_today": purchase_is_today,
			"as_of_date": purchase_latest_date,
			"by_head": by_head,
		},
		"sales_performance": {
			"as_of_date": sales_latest_date,
			"is_today": sales_is_today,
			"grades": grades,
			"today_total_qty": today_total_qty,
			"today_total_value_cr": today_total_value_cr,
			"mtd_total_qty": mtd_total_qty,
			"mtd_total_value_cr": mtd_total_value_cr,
			"avg_realisation_per_qtl": avg_realisation_per_qtl,
		},
		"top_customers": [
			{
				"customer": r["customer"],
				"customer_name": (r.get("customer_name") or r["customer"]).strip(),
				"season_value_cr": flt(r.get("total")) / 1e7,
				"outstanding_cr": flt(r.get("outstanding")) / 1e7,
			}
			for r in top_customers_raw
		],
	}


@frappe.whitelist()
def get_finance_dashboard_data():
	require_dashboard_access()
	data = get_or_set_cache("sugar360:finance:dashboard", CACHE_TTL["dashboard"], _build_finance_dashboard_data)
	return to_camel_case(data)


# ---- Sugar price trend (separate, on-demand chart query) ----


def _iso_week_label(date: dt.date) -> str:
	iso_year, iso_week, _ = date.isocalendar()
	return f"{iso_year} Wk{iso_week:02d}"


def _bucket_key(date_iso: str, granularity: str) -> str:
	date_iso = str(date_iso)
	if granularity == "daily":
		return date_iso
	if granularity == "monthly":
		return date_iso[:7]
	return _iso_week_label(frappe.utils.getdate(date_iso))


def _build_price_trend(from_date: str, to_date: str, granularity: str) -> dict:
	invoices = fetch_sales_invoices_in_range(from_date, to_date)
	date_by_invoice = {i["name"]: i["posting_date"] for i in invoices}
	rows = fetch_sugar_price_rows([i["name"] for i in invoices])

	buckets: dict[str, dict] = {}
	for row in rows:
		date = date_by_invoice.get(row["parent"])
		if not date:
			continue
		key = _bucket_key(date, granularity)
		bucket = buckets.setdefault(key, {"qty_rate_sum": 0.0, "qty": 0.0})
		bucket["qty_rate_sum"] += flt(row["rate"]) * flt(row["qty"])
		bucket["qty"] += flt(row["qty"])

	points = [
		{"label": key, "avg_rate": (b["qty_rate_sum"] / b["qty"]) if b["qty"] > 0 else 0, "qty": b["qty"]}
		for key, b in sorted(buckets.items())
	]

	return {"points": points, "msp_per_qtl": REFERENCE_MSP_PER_QTL}


@frappe.whitelist()
def get_sugar_price_trend(from_date: str | None = None, to_date: str | None = None, granularity: str = "daily"):
	require_dashboard_access()
	if granularity not in ("daily", "weekly", "monthly"):
		granularity = "daily"
	to_date = to_date or today_iso_date_ist()
	from_date = from_date or f"{int(str(to_date)[:4]) - 1}-01-01"
	cache_key = f"sugar360:finance:price-trend:{from_date}:{to_date}:{granularity}"
	data = get_or_set_cache(cache_key, CACHE_TTL["price_trend"], lambda: _build_price_trend(from_date, to_date, granularity))
	return to_camel_case(data)
