/**
 * Client-side Frappe authentication & session management utilities for Sugar 360.
 */

export async function getLoggedUser(): Promise<string | null> {
  try {
    const res = await fetch("/api/method/frappe.auth.get_logged_user", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.message;
    if (!user || user === "Guest") return null;
    return user;
  } catch {
    return null;
  }
}

export function redirectToFrappeLogin(redirectUrl = "/sugar360/") {
  if (typeof window !== "undefined") {
    window.location.href = `/login?redirect-to=${encodeURIComponent(redirectUrl)}`;
  }
}

export async function logoutFrappe() {
  try {
    await fetch("/api/method/logout", { method: "POST" });
  } catch {
    // Ignore error
  }
  redirectToFrappeLogin("/sugar360/");
}
