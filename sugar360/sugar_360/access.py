import frappe
from frappe import _

# Role gate for the whole Sugar 360 app: any user holding one of these roles sees the same
# company-wide aggregates, computed with ignore_permissions=True (this mirrors the original
# Node BFF, which read every doctype through one privileged service-account API key regardless
# of the viewing user's own Frappe permissions — see Sugar360_UI/src/lib/frappe/client.ts).
# Per-doctype frappe.has_permission() checks are intentionally NOT used here.
ALLOWED_ROLES = {"System Manager", "Sugar 360 Viewer"}


def has_dashboard_access() -> bool:
	if frappe.session.user == "Guest":
		return False
	return bool(ALLOWED_ROLES & set(frappe.get_roles()))


def require_dashboard_access() -> None:
	if not has_dashboard_access():
		frappe.throw(_("Not permitted to access Sugar 360"), frappe.PermissionError)


def has_app_permission() -> bool:
	return has_dashboard_access()
