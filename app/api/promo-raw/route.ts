import { NextResponse } from "next/server";
import { parseCSV } from "@/lib/csv";
import { parseDate } from "@/lib/format";
import {
  DEFAULT_PROMO_RAW_SHEET_URL,
  HEADER_KEYWORDS,
  JUNK_STRINGS,
} from "@/lib/constants";
import type { RawPromo, APIResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(): Promise<NextResponse<APIResponse<RawPromo[]>>> {
  const sheetUrl =
    process.env.PROMO_RAW_SHEET_URL ?? DEFAULT_PROMO_RAW_SHEET_URL;

  try {
    const res = await fetch(`${sheetUrl}&cb=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok)
      throw new Error(`Google Sheets responded with HTTP ${res.status}`);

    const text = await res.text();
    const rows = parseCSV(text);

    // Auto-detect the header row: first row with ≥2 cells matching known keywords
    let headerIdx = 0;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const cells = rows[i]
        .map((c) =>
          c
            .toLowerCase()
            .replace(/[\r\n\t]+/g, " ")
            .trim()
        )
        .filter((c) => c.length > 0);
      const matches = cells.filter((c) =>
        HEADER_KEYWORDS.some((kw) => c.includes(kw))
      ).length;
      if (matches >= 2) {
        headerIdx = i;
        break;
      }
    }

    const headers = rows[headerIdx].map((h) =>
      h
        .toLowerCase()
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );

    // Find column indices by keyword matching (multiple aliases per column)
    const idx = (...keywords: string[]): number => {
      for (const kw of keywords) {
        const i = headers.findIndex((h) => h.includes(kw));
        if (i >= 0) return i;
      }
      return -1;
    };

    const iDate = idx("date added", "date", "fecha");
    const iMkt = idx("market", "mercado", "país", "pais", "country");
    const iComp = idx("competitor", "competidor");
    const iProd = idx(
      "airtm product",
      "airtm",
      "product",
      "producto",
      "categoria",
      "category",
      "servicio",
      "service"
    );
    const iType = idx("promo type", "tipo de promo", "tipo", "type");
    const iDesc = idx(
      "description",
      "descripción",
      "descripcion",
      "detail",
      "detalle",
      "value",
      "valor",
      "notes"
    );
    const iStat = idx("promo active", "status", "estado", "active", "activo");
    const iEnd = idx("end date", "fecha fin", "expiry", "vencimiento");

    const promos: RawPromo[] = rows
      .slice(headerIdx + 1)
      .map((row) => {
        const endDate = iEnd >= 0 ? parseDate(row[iEnd]) : null;
        const statusVal = (iStat >= 0 ? row[iStat] : "").toLowerCase();
        const isActive =
          statusVal.includes("activ") ||
          statusVal.includes("active") ||
          statusVal.includes("yes") ||
          statusVal.includes("sí") ||
          (!statusVal && endDate != null && endDate >= new Date()) ||
          (!statusVal && endDate == null);

        return {
          date: parseDate(iDate >= 0 ? row[iDate] : "")?.toISOString() ?? null,
          market: iMkt >= 0 ? row[iMkt] : "",
          competitor: iComp >= 0 ? row[iComp] : "",
          product: iProd >= 0 ? row[iProd] : "",
          promoType: iType >= 0 ? row[iType] : "",
          description: iDesc >= 0 ? row[iDesc] : "",
          active: isActive,
          endDate: endDate?.toISOString() ?? null,
        } satisfies RawPromo;
      })
      .filter((p) => {
        const c = (p.competitor ?? "").toLowerCase().trim();
        const m = (p.market ?? "").toLowerCase().trim();
        if (JUNK_STRINGS.some((j) => c.includes(j) || m.includes(j)))
          return false;
        return c.length > 0 || m.length > 0;
      });

    // Sort newest first
    promos.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    return NextResponse.json({ success: true, data: promos });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error fetching promo-raw sheet";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
