import type { AlertItem, AlertTone } from "@/lib/management/types";

const TONE_CLASS: Record<AlertTone, string> = { critical: "r", warning: "a", good: "g" };
const CATEGORY_ICON: Record<string, string> = {
  Operational: "🟡",
  "Inventory / Stock": "🔴",
  Positive: "🟢",
  Financial: "🔴",
};

export function AlertsFeed({ alerts }: { alerts: AlertItem[] }) {
  let lastCategory = "";
  const critical = alerts.filter((a) => a.tone === "critical").length;

  return (
    <>
      <div className="card-header">
        <div className="card-title">Critical Alerts Feed</div>
        <span className={`pill ${critical > 0 ? "risk" : "ok"}`}>{critical > 0 ? `${critical} Critical` : "All Clear"}</span>
      </div>
      <div className="card-sub">
        Exception-based, from real cross-page data — diesel stock, cane zone supply, H&amp;T advance
        recovery
      </div>
      <div className="alert-feed">
        {alerts.map((alert, i) => {
          const showCat = alert.category !== lastCategory;
          lastCategory = alert.category;
          const tone = TONE_CLASS[alert.tone];
          return (
            <div key={`${alert.title}-${i}`}>
              {showCat && (
                <div className="alert-cat">
                  {CATEGORY_ICON[alert.category] ?? "•"} {alert.category}
                </div>
              )}
              <div className={`alert-item ${tone}`}>
                <div className={`alert-dot ${tone}`} />
                <div className="alert-body">
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-desc">{alert.detail}</div>
                </div>
                <span className={`alert-badge ${tone}`}>{alert.badge}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
