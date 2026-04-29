import { NextResponse } from "next/server";
import { parseCSV } from "@/lib/csv";
import { DEFAULT_MONITOR_SHEET_URL } from "@/lib/constants";
import type { MonitorData, PromoEntry, APIResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

// ── Reference tab GIDs (same spreadsheet, different tabs) ─────────────────────
const USVA_REF_GID      = 913211400;
const YIELD_REF_GID     = 2120147788;
const BENCHMARK_GID     = 1602917777;

// ── Internal types for reference data ────────────────────────────────────────

interface USVARow {
  competitor:    string;
  countries:     string;
  achPct:        string;
  achFlat:       string;
  achEffective:  string;
  wirePct:       string;
  wireFlat:      string;
  wireEffective: string;
}

interface YieldRow {
  competitor: string;
  apy:        string;
}

// currency → normCompetitor → raw rate string at $100
type QRMap = Map<string, Map<string, string>>;

// Maps monitor market names to the currency pair used in the Benchmark tab
const MARKET_TO_QR_CURRENCY: Record<string, string> = {
  bolivia:   "BOB/USD",
  argentina: "ARS/USD",
};

// ── URL helpers ───────────────────────────────────────────────────────────────

/** Build a pub CSV URL for a specific GID from an existing sheet URL. */
function makeGidUrl(baseUrl: string, gid: number): string {
  try {
    const url = new URL(baseUrl.split("&cb=")[0]);
    url.searchParams.set("gid", String(gid));
    url.searchParams.set("single", "true");
    url.searchParams.set("output", "csv");
    return url.toString();
  } catch {
    return baseUrl.replace(/gid=\d+/, `gid=${gid}`);
  }
}

// ── Reference parsers ─────────────────────────────────────────────────────────

function parseUSVARef(rows: string[][]): USVARow[] {
  return rows
    .slice(1) // skip header row
    .filter((r) => r[0]?.trim())
    .map((r) => ({
      competitor:    r[0]?.trim() ?? "",
      countries:     r[2]?.trim() ?? "",
      achPct:        r[3]?.trim() ?? "",
      achFlat:       r[4]?.trim() ?? "",
      achEffective:  r[5]?.trim() ?? "",
      wirePct:       r[6]?.trim() ?? "",
      wireFlat:      r[7]?.trim() ?? "",
      wireEffective: r[8]?.trim() ?? "",
    }));
}

function parseYieldRef(rows: string[][]): YieldRow[] {
  return rows
    .slice(1) // skip header row
    .filter((r) => r[0]?.trim() && r[1]?.trim())
    .map((r) => ({
      competitor: r[0]?.trim() ?? "",
      apy:        r[1]?.trim() ?? "",
    }));
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** Normalize a competitor name for loose matching (strips parentheticals, trims). */
function normComp(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Format a fee into a concise reference string (no amount suffix). */
function fmtFeeRef(pct: string, flat: string, effective: string): string {
  const effVal  = parseFloat((effective ?? "").replace(/[$,]/g, ""));
  const pctVal  = parseFloat((pct  ?? "").replace("%", ""));
  const flatVal = parseFloat((flat ?? "").replace(/[$,]/g, ""));

  if (isNaN(effVal) || effVal === 0) return "Free";
  if (pctVal > 0 && flatVal > 0) return `${pct} + ${flat} flat`;
  if (pctVal > 0) return `${pct} fee`;
  if (flatVal > 0) return `${flat} flat`;
  return "Free";
}

/** Find the best-matching USVA row for a competitor in a given market. */
function lookupUSVA(
  rows: USVARow[],
  competitor: string,
  market: string,
  type: "ach" | "wire"
): string | undefined {
  const norm    = normComp(competitor);
  const matches = rows.filter((r) => normComp(r.competitor) === norm);
  if (!matches.length) return undefined;

  // Prefer a market-specific row; fall back to first match (global)
  const best =
    matches.find((r) =>
      r.countries.toLowerCase().includes(market.toLowerCase())
    ) ?? matches[0];

  return type === "ach"
    ? fmtFeeRef(best.achPct,  best.achFlat,  best.achEffective)
    : fmtFeeRef(best.wirePct, best.wireFlat, best.wireEffective);
}

/** Find APY for a competitor from the Yield reference table. */
function lookupYield(rows: YieldRow[], competitor: string): string | undefined {
  const norm = normComp(competitor);
  const row  = rows.find((r) => normComp(r.competitor) === norm);
  return row ? `${row.apy} APY` : undefined;
}

/**
 * Parse the Pricing Benchmark tab (horizontal layout, QR section in cols 28-40).
 * The CSV is structured as repeating weekly blocks stacked vertically — we only
 * want the first (most recent) block, which ends when a second date header row
 * appears. Column offsets are detected dynamically from the header row.
 */
function parsePricingBenchmark(csvRows: string[][]): QRMap {
  const qrMap: QRMap = new Map();

  // Find the header row that contains "QR code payments" to derive column offsets
  const headerRow = csvRows.find((r) =>
    r.some((c) => c.trim() === "QR code payments")
  );
  if (!headerRow) return qrMap;

  const qCol         = headerRow.findIndex((c) => c.trim() === "QR code payments");
  const qCurrencyCol = qCol + 1; // Currency
  const qCompanyCol  = qCol + 2; // Company
  const q100Col      = qCol + 4; // Net Rate @ $100 ($50 is at qCol+3)

  let curQRCurrency = "";
  let seenDateRow   = false;

  for (const row of csvRows) {
    if (!row.some((c) => c.trim())) continue; // skip blank rows

    const col0 = row[0]?.trim() ?? "";

    // Date header row: "04/27/26 - 05/03/26"
    if (/^\d{2}\/\d{2}\/\d{2}/.test(col0)) {
      if (seenDateRow) break; // second date block = older week, stop
      seenDateRow = true;
      continue;
    }

    const rawRate    = row[q100Col]?.trim() ?? "";
    const rawCompany = row[qCompanyCol]?.trim() ?? "";

    // Skip header/sub-header rows
    if (
      rawCompany === "Company" ||
      rawRate === "$100" ||
      rawRate === "Net Rate" ||
      rawRate === ""
    ) {
      // Still track currency carry-down from the header area
      const c = row[qCurrencyCol]?.trim() ?? "";
      if (c.includes("/")) curQRCurrency = c;
      continue;
    }

    // Carry currency forward (merge-down pattern in the sheet)
    const rawCurrency = row[qCurrencyCol]?.trim() ?? "";
    if (rawCurrency.includes("/")) curQRCurrency = rawCurrency;

    if (!rawCompany || !curQRCurrency) continue;

    // Skip cells with errors or no data
    if (rawRate === "-" || rawRate.startsWith("#") || rawRate === "-%") continue;

    if (!qrMap.has(curQRCurrency)) qrMap.set(curQRCurrency, new Map());
    qrMap.get(curQRCurrency)!.set(normComp(rawCompany), rawRate);
  }

  return qrMap;
}

/** Format a net rate as a human-readable exchange rate string. */
function fmtExchangeRate(currency: string, rateStr: string): string | undefined {
  const cleaned = rateStr.replace(/[$,]/g, "").trim();
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return undefined;

  const localCurrency = currency.split("/")[0]; // "BOB" from "BOB/USD"

  // Format with thousands separator; remove trailing decimal zeros
  const [intPart, decPart = ""] = num.toFixed(2).split(".");
  const intFormatted  = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decFormatted  = decPart.replace(/0+$/, "");
  const formatted     = decFormatted ? `${intFormatted}.${decFormatted}` : intFormatted;

  return `1 USD → ${formatted} ${localCurrency}`;
}

/** Look up QR exchange rate for a competitor in a given market. */
function lookupQR(
  qrMap: QRMap,
  market: string,
  competitor: string
): string | undefined {
  const currency = MARKET_TO_QR_CURRENCY[market.toLowerCase()];
  if (!currency) return undefined;

  const compMap = qrMap.get(currency);
  if (!compMap) return undefined;

  const rateStr = compMap.get(normComp(competitor));
  if (!rateStr) return undefined;

  return fmtExchangeRate(currency, rateStr);
}

/** Infer product type from the product name string. */
function detectProduct(
  product: string
): "ach" | "wire" | "yield" | "qr" | "other" {
  const p = product.toLowerCase();
  if (p.includes("ach"))                        return "ach";
  if (p.includes("wire"))                       return "wire";
  if (p.includes("yield") || p.includes("interest")) return "yield";
  if (p.includes("qr"))                         return "qr";
  return "other";
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse<APIResponse<MonitorData>>> {
  const sheetUrl =
    process.env.MONITOR_SHEET_URL ?? DEFAULT_MONITOR_SHEET_URL;

  try {
    // Fetch monitor CSV and all reference tabs in parallel.
    // Reference fetches are best-effort: failures don't break the monitor.
    const [monitorResult, usvaResult, yieldResult, benchmarkResult] =
      await Promise.allSettled([
        fetch(`${sheetUrl}&cb=${Date.now()}`, { cache: "no-store" }),
        fetch(`${makeGidUrl(sheetUrl, USVA_REF_GID)}&cb=${Date.now()}`,      { cache: "no-store" }),
        fetch(`${makeGidUrl(sheetUrl, YIELD_REF_GID)}&cb=${Date.now()}`,     { cache: "no-store" }),
        fetch(`${makeGidUrl(sheetUrl, BENCHMARK_GID)}&cb=${Date.now()}`,     { cache: "no-store" }),
      ]);

    // Monitor is required
    if (monitorResult.status === "rejected") {
      throw new Error(String(monitorResult.reason));
    }
    if (!monitorResult.value.ok) {
      throw new Error(
        `Google Sheets responded with HTTP ${monitorResult.value.status}`
      );
    }

    // Parse reference data (graceful degradation on any failure)
    let usvaRows:  USVARow[]  = [];
    let yieldRows: YieldRow[] = [];
    let qrMap:     QRMap      = new Map();

    if (usvaResult.status === "fulfilled" && usvaResult.value.ok) {
      const text = await usvaResult.value.text();
      usvaRows = parseUSVARef(parseCSV(text));
    }
    if (yieldResult.status === "fulfilled" && yieldResult.value.ok) {
      const text = await yieldResult.value.text();
      yieldRows = parseYieldRef(parseCSV(text));
    }
    if (benchmarkResult.status === "fulfilled" && benchmarkResult.value.ok) {
      const text = await benchmarkResult.value.text();
      qrMap = parsePricingBenchmark(parseCSV(text));
    }

    // ── Parse monitor CSV ─────────────────────────────────────────────────────

    const text = await monitorResult.value.text();
    const rows = parseCSV(text);

    // Find last-update annotation (typically in row 0)
    let lastUpdate = "—";
    if (rows[0]) {
      const lu = rows[0].find(
        (_, i) => rows[0][i - 1]?.toLowerCase().includes("update")
      );
      if (lu) lastUpdate = lu;
    }

    // Find header row (first row whose first cell is "market")
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0]?.toLowerCase() === "market") {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0) {
      throw new Error(
        "Header row not found in sheet. Expected first column = 'market'."
      );
    }

    // ── Build entries with reference data ─────────────────────────────────────

    const entries: PromoEntry[] = [];
    let curMarket     = "";
    let curCompetitor = "";

    for (const row of rows.slice(headerIdx + 1)) {
      if (row[0]) curMarket     = row[0];
      if (row[1]) curCompetitor = row[1];
      if (!row[2]) continue; // no product — skip empty rows

      const productType = detectProduct(row[2]);

      let airtmReference:     string | undefined;
      let competitorReference: string | undefined;

      if (productType === "ach" || productType === "wire") {
        airtmReference      = lookupUSVA(usvaRows, "Airtm",       curMarket, productType);
        competitorReference = lookupUSVA(usvaRows, curCompetitor, curMarket, productType);
      } else if (productType === "yield") {
        airtmReference      = lookupYield(yieldRows, "Airtm");
        competitorReference = lookupYield(yieldRows, curCompetitor);
      } else if (productType === "qr") {
        airtmReference      = lookupQR(qrMap, curMarket, "Airtm");
        competitorReference = lookupQR(qrMap, curMarket, curCompetitor);
      }
      // other: references stay undefined → tooltip shows fallback

      entries.push({
        market:             curMarket,
        competitor:         curCompetitor,
        product:            row[2],
        status:             row[3] ?? "",
        baseDelta:          row[4] || "—",
        promoImpact:        row[5] ?? "",
        promoDelta:         row[6] || "—",
        promoDesc:          row[7] ?? "",
        airtmReference,
        competitorReference,
      });
    }

    // ── Build nested market → competitor → products map ───────────────────────

    const markets: Record<string, Record<string, PromoEntry[]>> = {};
    for (const entry of entries) {
      markets[entry.market] ??= {};
      markets[entry.market][entry.competitor] ??= [];
      markets[entry.market][entry.competitor].push(entry);
    }

    const trackable   = entries.filter((e) => !e.status.includes("No Data"));
    const wins        = trackable.filter((e) => e.status.includes("Winning"));
    const activePromos = entries.filter((e) => e.promoImpact.includes("Active"));

    return NextResponse.json({
      success: true,
      data: {
        lastUpdate,
        markets,
        marketNames:        Object.keys(markets),
        totalCompetitors:   new Set(entries.map((e) => e.competitor)).size,
        productComparisons: entries.length,
        wins:               wins.length,
        trackable:          trackable.length,
        activePromos,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error fetching monitor sheet";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
