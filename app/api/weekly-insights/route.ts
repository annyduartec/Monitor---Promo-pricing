import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parseCSV } from "@/lib/csv";
import { parseDate } from "@/lib/format";
import {
  DEFAULT_PROMO_RAW_SHEET_URL,
  HEADER_KEYWORDS,
  JUNK_STRINGS,
} from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Response type ─────────────────────────────────────────────────────────────

type WeeklyInsightsResponse =
  | { success: true; data: { sent: true } }
  | { success: true; preview: string }
  | { success: false; error: string };

// ── Local type ────────────────────────────────────────────────────────────────

interface PromoRow {
  date: Date | null;
  market: string;
  competitor: string;
  product: string;
  promoType: string;
  description: string;
  active: boolean;
}

// ── Fallback summary when ANTHROPIC_API_KEY is not configured ─────────────────

function generateSummary(insights: string[]): string {
  const lines = [
    "Weekly Pricing Insights",
    "",
    "Executive Summary:",
    `${insights.length} competitor promotion(s) recorded. Full AI analysis unavailable — ANTHROPIC_API_KEY is not configured.`,
    "",
    "Key Trends:",
    ...insights.slice(0, 5).map((i) => `• ${i}`),
    "",
    "Winning:",
    "• (AI analysis required)",
    "",
    "Losing / Risks:",
    "• (AI analysis required)",
    "",
    "Promo Activity:",
    `• ${insights.length} promotion(s) in scope`,
  ];
  return lines.join("\n");
}

// ── AI-powered summary ────────────────────────────────────────────────────────

async function generateAISummary(
  client: Anthropic,
  insightsBlock: string
): Promise<string> {
  const prompt = `You are a pricing and market intelligence analyst.

Summarize the following weekly insights for a Pricing team.

Focus on:
- Key trends
- Changes in competitor behavior
- Promo activity
- Where Airtm is winning or losing

Be concise and structured.
Do NOT include recommendations.

Format your response exactly as:

Weekly Pricing Insights

Executive Summary:
...

Key Trends:
...

Winning:
...

Losing / Risks:
...

Promo Activity:
...

Insights:
${insightsBlock}`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0]?.type === "text" ? message.content[0].text : "";
}

// ── Slack Bot API helper ──────────────────────────────────────────────────────

async function postToSlack(
  token: string,
  channelId: string,
  text: string
): Promise<void> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: channelId, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(
      `[weekly-insights] Slack HTTP error ${res.status}: ${body}`
    );
    throw new Error(`Slack API responded with HTTP ${res.status}`);
  }

  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) {
    console.error(`[weekly-insights] Slack API error: ${data.error}`);
    throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
  }
}

// ── GET /api/weekly-insights ──────────────────────────────────────────────────

export async function GET(
  request: NextRequest
): Promise<NextResponse<WeeklyInsightsResponse>> {
  const dryRun =
    new URL(request.url).searchParams.get("dryRun") === "true";

  const slackToken = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (!dryRun) {
    if (!slackToken) {
      return NextResponse.json(
        { success: false, error: "SLACK_BOT_TOKEN is not configured." },
        { status: 503 }
      );
    }
    if (!channelId) {
      return NextResponse.json(
        { success: false, error: "SLACK_CHANNEL_ID is not configured." },
        { status: 503 }
      );
    }
  }

  try {
    // ── 1. Fetch and parse the promo-raw sheet ──────────────────────────────
    const sheetUrl =
      process.env.PROMO_RAW_SHEET_URL ?? DEFAULT_PROMO_RAW_SHEET_URL;

    const sheetRes = await fetch(`${sheetUrl}&cb=${Date.now()}`, {
      cache: "no-store",
    });
    if (!sheetRes.ok) {
      throw new Error(
        `Google Sheets responded with HTTP ${sheetRes.status}`
      );
    }

    const csv = await sheetRes.text();
    const rows = parseCSV(csv);

    // Auto-detect the header row (first row with ≥2 recognised keywords)
    let headerIdx = 0;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const cells = rows[i]
        .map((c) => c.toLowerCase().replace(/[\r\n\t]+/g, " ").trim())
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

    const col = (...keywords: string[]): number => {
      for (const kw of keywords) {
        const i = headers.findIndex((h) => h.includes(kw));
        if (i >= 0) return i;
      }
      return -1;
    };

    const iDate  = col("date added", "fecha agregada");
    const iStart = col("start", "inicio", "start date", "fecha inicio");
    const iMkt   = col("market", "mercado", "país", "pais", "country");
    const iComp  = col("competitor", "competidor");
    const iProd  = col("airtm product", "airtm", "product", "producto", "categoria", "category");
    const iType  = col("promo type", "tipo de promo", "tipo", "type");
    const iDesc  = col("description", "descripción", "descripcion", "detail", "detalle", "value", "valor", "notes");
    const iStat  = col("promo active", "status", "estado", "active", "activo");
    const iEnd   = col("end date", "fecha fin", "expiry", "vencimiento", "end", "fin");

    const allPromos: PromoRow[] = rows
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

        const rawDate =
          iDate >= 0 && row[iDate]?.trim()
            ? row[iDate]
            : iStart >= 0 && row[iStart]?.trim()
            ? row[iStart]
            : "";

        return {
          date: parseDate(rawDate),
          market: iMkt >= 0 ? row[iMkt] : "",
          competitor: iComp >= 0 ? row[iComp] : "",
          product: iProd >= 0 ? row[iProd] : "",
          promoType: iType >= 0 ? row[iType] : "",
          description: iDesc >= 0 ? row[iDesc] : "",
          active: isActive,
        };
      })
      .filter((p) => {
        const c = (p.competitor ?? "").toLowerCase().trim();
        const m = (p.market ?? "").toLowerCase().trim();
        if (JUNK_STRINGS.some((j) => c.includes(j) || m.includes(j)))
          return false;
        return c.length > 0 || m.length > 0;
      });

    // ── 2. Filter to last 7 days → active → all (capped at 50) ────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let scope = allPromos.filter(
      (p) => p.date !== null && p.date >= sevenDaysAgo
    );

    if (scope.length === 0) {
      scope = allPromos.filter((p) => p.active);
      console.log(
        `[weekly-insights] No dated records in last 7 days — falling back to ${scope.length} active promo(s)`
      );
    }

    if (scope.length === 0) {
      scope = allPromos.slice(0, 50);
      console.log(
        `[weekly-insights] No active promos — falling back to ${scope.length} most recent record(s)`
      );
    }

    console.log(`[weekly-insights] Processing ${scope.length} insights`);

    // ── 3. Empty state ──────────────────────────────────────────────────────
    if (scope.length === 0) {
      const text =
        "Hey team — Weekly Pricing Insights\n\nNo significant pricing insights detected this week.";

      if (dryRun) {
        return NextResponse.json({ success: true, preview: text });
      }

      await postToSlack(slackToken!, channelId!, text);
      console.log("[weekly-insights] No data — sent fallback message to Slack");
      return NextResponse.json({ success: true, data: { sent: true } });
    }

    // ── 4. Format insights block for the prompt ─────────────────────────────
    const insightsBlock = scope
      .slice(0, 80)
      .map((p) => {
        const dateStr = p.date
          ? p.date.toISOString().slice(0, 10)
          : "no date";
        return `[${dateStr}] ${p.competitor} | ${p.market} | ${p.product} | ${p.promoType} | ${p.description.slice(0, 150)}`;
      })
      .join("\n");

    // ── 5. Generate summary ─────────────────────────────────────────────────
    let summary: string;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      const client = new Anthropic({ apiKey });
      summary = await generateAISummary(client, insightsBlock);
      console.log("[weekly-insights] AI summary generated successfully");
    } else {
      console.log(
        "[weekly-insights] ANTHROPIC_API_KEY not set — using basic summary"
      );
      summary = generateSummary(
        scope
          .slice(0, 20)
          .map(
            (p) =>
              `${p.competitor} (${p.market}): ${p.promoType} — ${p.description.slice(0, 100)}`
          )
      );
    }

    const fullText = `Hey team — Weekly Pricing Insights\n\n${summary}`;

    // ── 6. Dry-run: return preview without sending ──────────────────────────
    if (dryRun) {
      console.log("[weekly-insights] Dry run — skipping Slack send");
      return NextResponse.json({ success: true, preview: fullText });
    }

    // ── 7. Send to Slack ────────────────────────────────────────────────────
    await postToSlack(slackToken!, channelId!, fullText);
    console.log("[weekly-insights] Message sent to Slack successfully");

    return NextResponse.json({ success: true, data: { sent: true } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[weekly-insights] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
