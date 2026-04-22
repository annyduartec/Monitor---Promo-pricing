import { NextResponse } from "next/server";
import { parseCSV } from "@/lib/csv";
import { DEFAULT_MONITOR_SHEET_URL } from "@/lib/constants";
import type { MonitorData, PromoEntry, APIResponse } from "@/lib/types";

// Use Node.js runtime so we can make arbitrary outbound fetch calls.
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(): Promise<NextResponse<APIResponse<MonitorData>>> {
  const sheetUrl =
    process.env.MONITOR_SHEET_URL ?? DEFAULT_MONITOR_SHEET_URL;

  try {
    const res = await fetch(`${sheetUrl}&cb=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Google Sheets responded with HTTP ${res.status}`);

    const text = await res.text();
    const rows = parseCSV(text);

    // Find last-update annotation (typically in row 0)
    let lastUpdate = "—";
    if (rows[0]) {
      const lu = rows[0].find(
        (_, i) => rows[0][i - 1]?.toLowerCase().includes("update")
      );
      if (lu) lastUpdate = lu;
    }

    // Find the header row (first row whose first cell is "market")
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

    // Parse data rows with merge-down for market + competitor columns
    const entries: PromoEntry[] = [];
    let curMarket = "";
    let curCompetitor = "";

    for (const row of rows.slice(headerIdx + 1)) {
      if (row[0]) curMarket = row[0];
      if (row[1]) curCompetitor = row[1];
      if (!row[2]) continue; // no product — skip empty rows

      entries.push({
        market: curMarket,
        competitor: curCompetitor,
        product: row[2],
        status: row[3] ?? "",
        baseDelta: row[4] || "—",
        promoImpact: row[5] ?? "",
        promoDelta: row[6] || "—",
        promoDesc: row[7] ?? "",
      });
    }

    // Build nested market → competitor → products map
    const markets: Record<string, Record<string, PromoEntry[]>> = {};
    for (const entry of entries) {
      markets[entry.market] ??= {};
      markets[entry.market][entry.competitor] ??= [];
      markets[entry.market][entry.competitor].push(entry);
    }

    const trackable = entries.filter((e) => !e.status.includes("No Data"));
    const wins = trackable.filter((e) => e.status.includes("Winning"));
    const activePromos = entries.filter((e) =>
      e.promoImpact.includes("Active")
    );

    const data: MonitorData = {
      lastUpdate,
      markets,
      marketNames: Object.keys(markets),
      totalCompetitors: new Set(entries.map((e) => e.competitor)).size,
      productComparisons: entries.length,
      wins: wins.length,
      trackable: trackable.length,
      activePromos,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error fetching monitor sheet";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
