import frappe

# Custom Fields sugar360's queries depend on that were added by hand on the original site
# (via Customize Form) rather than shipped as fixtures by any installed app — so a fresh bench
# needs sugar360 itself to (re)create them on install. Every other Custom Field/doctype this app
# reads (Cane Weight, HT Contract, Process Order, Sales Invoice.season, ...) is already owned by
# erpnext / quantbit_agriculture_crm / quantbit_process_manufacturing, declared in required_apps.
CUSTOM_FIELDS = [
	{
		"dt": "Item",
		"fieldname": "apply_to_sugar_360",
		"label": "Apply to Sugar 360",
		"fieldtype": "Check",
		"insert_after": "item_group",
		"default": "0",
	},
	{
		"dt": "Sales Invoice Item",
		"fieldname": "season",
		"label": "Source Season",
		"fieldtype": "Link",
		"options": "Season",
		"insert_after": "inventory_dimension",
	},
]


def after_install():
	if not frappe.db.exists("Role", "Sugar 360 Viewer"):
		frappe.get_doc(
			{
				"doctype": "Role",
				"role_name": "Sugar 360 Viewer",
				"desk_access": 0,
			}
		).insert(ignore_permissions=True)

	for field in CUSTOM_FIELDS:
		fieldname = field["dt"] + "-" + field["fieldname"]
		if frappe.db.exists("Custom Field", fieldname):
			continue
		frappe.get_doc({"doctype": "Custom Field", **field}).insert(ignore_permissions=True)

	frappe.clear_cache(doctype="Item")
	frappe.clear_cache(doctype="Sales Invoice Item")
