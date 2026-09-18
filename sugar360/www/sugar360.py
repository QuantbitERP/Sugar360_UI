import frappe

from sugar360.sugar_360.access import require_dashboard_access

no_cache = 1


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.local.flags.redirect_location = "/login?redirect-to=" + frappe.request.path
		raise frappe.Redirect

	require_dashboard_access()

	frappe.db.commit()  # nosemgrep
	context.csrf_token = frappe.sessions.get_csrf_token()
	context.boot = get_boot()
	return context


def get_boot():
	return frappe._dict(
		{
			"site_name": frappe.local.site,
			"session_user": frappe.session.user,
			"default_route": "/sugar360",
		}
	)
