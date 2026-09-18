import frappe


def after_install():
	if not frappe.db.exists("Role", "Sugar 360 Viewer"):
		frappe.get_doc(
			{
				"doctype": "Role",
				"role_name": "Sugar 360 Viewer",
				"desk_access": 0,
			}
		).insert(ignore_permissions=True)
