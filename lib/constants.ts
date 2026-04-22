// Fallback Google Sheets URLs — override via environment variables.
// The sheets must be published as CSV (File → Share → Publish to web → CSV).
export const DEFAULT_MONITOR_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQhwNro5iyroDuJwHIfDDFVefk2U2_oIwvpTaqBlRhankaYqonQeju8wAU0LMUp86bGzIqIREQnbh3W/pub?gid=310685808&single=true&output=csv";

export const DEFAULT_PROMO_RAW_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQhwNro5iyroDuJwHIfDDFVefk2U2_oIwvpTaqBlRhankaYqonQeju8wAU0LMUp86bGzIqIREQnbh3W/pub?gid=1789565871&single=true&output=csv";

// Keywords used to find the header row in the raw promo sheet
export const HEADER_KEYWORDS = [
  "date",
  "fecha",
  "competitor",
  "competidor",
  "market",
  "mercado",
  "product",
  "producto",
  "promo type",
  "status",
  "estado",
  "active",
  "activo",
];

// Values in the Competitor/Market columns that indicate junk rows to skip
export const JUNK_STRINGS = [
  "competitor",
  "competidor",
  "market",
  "mercado",
  "a–o",
  "a-o",
  "datos core",
  "leyenda",
  "product",
  "producto",
];

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME ?? "Promo Pricing Monitor";
