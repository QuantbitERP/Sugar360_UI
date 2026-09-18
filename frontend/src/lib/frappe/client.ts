/**
 * Client-side helper for calling this app's whitelisted Frappe methods.
 *
 * Runs entirely in the browser under the logged-in user's own session cookie — unlike the
 * original Sugar360_UI, which read Frappe through a privileged Node-side service account.
 * Access is gated per-request server-side by sugar360.sugar_360.access.require_dashboard_access().
 */

function getCsrfToken(): string {
  return (window as unknown as { csrf_token?: string }).csrf_token ?? "";
}

function redirectToLogin() {
  const redirectTo = window.location.pathname + window.location.search;
  window.location.href = `/login?redirect-to=${encodeURIComponent(redirectTo)}`;
}

export async function callFrappeMethod<T>(
  method: string,
  params: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) qs.set(key, String(value));
  }
  const url = `/api/method/${method}${qs.toString() ? `?${qs.toString()}` : ""}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json", "X-Frappe-CSRF-Token": getCsrfToken() },
    credentials: "include",
    ...(signal ? { signal } : {}),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) redirectToLogin();
    const message =
      (body && (body._server_messages || body.exception || body.message)) ??
      `Request failed (${res.status})`;
    throw new Error(typeof message === "string" ? message.replace(/^.*?:\s*/, "") : JSON.stringify(message));
  }

  return (body as { message: T }).message;
}
