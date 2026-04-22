// ─── Country flags ────────────────────────────────────────────────────────────

const FLAGS: Record<string, string> = {
  bolivia: "🇧🇴",
  argentina: "🇦🇷",
  brasil: "🇧🇷",
  brazil: "🇧🇷",
  chile: "🇨🇱",
  peru: "🇵🇪",
  méxico: "🇲🇽",
  mexico: "🇲🇽",
  colombia: "🇨🇴",
  "el salvador": "🇸🇻",
  guatemala: "🇬🇹",
  honduras: "🇭🇳",
  nicaragua: "🇳🇮",
  "costa rica": "🇨🇷",
  panamá: "🇵🇦",
  panama: "🇵🇦",
  venezuela: "🇻🇪",
  ecuador: "🇪🇨",
  paraguay: "🇵🇾",
  uruguay: "🇺🇾",
};

export function getFlag(market: string): string {
  return FLAGS[(market || "").toLowerCase()] ?? "🌎";
}

// ─── Status / Delta helpers ───────────────────────────────────────────────────

export function statusClass(status: string): "win" | "lose" | "neutral" {
  if (status.includes("Winning")) return "win";
  if (status.includes("Losing")) return "lose";
  return "neutral";
}

export function deltaClass(value: string): "pos" | "neg" | "nd" {
  if (!value || value === "—" || value.includes("No Data")) return "nd";
  if (value.startsWith("+")) return "pos";
  if (value.startsWith("-") || value.startsWith("−")) return "neg";
  return "nd";
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

/** Parses a variety of date string formats into a Date object, or null. */
export function parseDate(str: string | undefined | null): Date | null {
  if (!str || !str.trim()) return null;
  const s = str.trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s);

  const parts = s.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (c > 31) return new Date(c, a - 1, b); // MM/DD/YYYY
    if (a > 12) return new Date(c, b - 1, a); // DD/MM/YYYY
    return new Date(c, b - 1, a); // DD/MM/YYYY fallback
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Formats a Date into a locale-friendly short string. */
export function fmtDate(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Converts an ISO date string to a formatted display string. */
export function fmtISODate(iso: string | null): string {
  if (!iso) return "—";
  return fmtDate(new Date(iso));
}

// ─── Array helpers ────────────────────────────────────────────────────────────

export function countBy(
  arr: Record<string, unknown>[],
  key: string
): [string, number][] {
  const map: Record<string, number> = {};
  for (const item of arr) {
    const k = (item[key] as string) || "N/A";
    map[k] = (map[k] ?? 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}
