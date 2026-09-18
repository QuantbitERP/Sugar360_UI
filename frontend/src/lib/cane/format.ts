/** Pure, side-effect-free formatters shared by every Cane & Agriculture chart/card. Client-safe. */

export function formatAcres(value: number): string {
  return `${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Ac`;
}

/** Mirrors the mill's own convention of quoting large tonnages in lakh (L) MT. */
export function formatLakhMt(mt: number): string {
  if (mt >= 100_000) return `${(mt / 100_000).toFixed(2)} L MT`;
  return `${mt.toLocaleString("en-IN", { maximumFractionDigits: 1 })} MT`;
}

export function formatMt(mt: number, fractionDigits = 0): string {
  return `${mt.toLocaleString("en-IN", { maximumFractionDigits: fractionDigits })} MT`;
}

export function formatPct(value: number | null, fractionDigits = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatSignedPct(value: number | null, fractionDigits = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "↑" : value < 0 ? "↓" : "→";
  return `${sign} ${Math.abs(value).toFixed(fractionDigits)}%`;
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
