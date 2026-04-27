import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { AIAnalysis, WeeklySummary, APIResponse } from "@/lib/types";

export const runtime = "nodejs";
// AI calls can take a while — give them 60 s on Vercel Pro, 10 s on Hobby
export const maxDuration = 60;

const RawPromoShape = z.object({
  date: z.string().nullable().optional(),
  competitor: z.string(),
  market: z.string(),
  product: z.string(),
  promoType: z.string(),
  description: z.string(),
  active: z.boolean(),
});

const RequestSchema = z.object({
  promos: z.array(RawPromoShape).min(1, "At least one promo required"),
  period: z.string(),
  weekly: z.boolean().optional().default(false),
  lang: z.enum(["en", "es"]).optional().default("es"),
});

type PromoInput = z.infer<typeof RawPromoShape>;
type Lang = "en" | "es";

function buildPrompt(ctx: string, instruction: string): string {
  return `${ctx}${instruction}`;
}

function parseWeeklyJSON(text: string): WeeklySummary | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as WeeklySummary;
  } catch {
    return null;
  }
}

// ── Language-aware instruction sets ──────────────────────────────────────────

function standardInstructions(lang: Lang): string[] {
  if (lang === "en") {
    return [
      "In English. Only 3-4 short, direct bullets. Which products or categories are competitors focusing their promotions on? Are there clear patterns by product? No intro, bullets only.",
      "In English. Only 3-4 short, direct bullets. What strategic intent can be inferred behind these promotions? Acquisition, retention, volume, cross-sell? No intro, bullets only.",
      "In English. Only 3-4 short, direct bullets. What type of user are these promotions targeting? Infer the profile based on requirements and conditions. No intro, bullets only.",
      "In English. Only 3-4 short, direct bullets. What do these promotions imply for our pricing and product strategy? Where do we have risk or opportunity? No intro, bullets only.",
    ];
  }
  return [
    "En español. Solo 3-4 bullets cortos y directos. ¿En qué productos o categorías están concentrando sus promociones los competidores? ¿Hay patrones claros por producto? Sin intro, solo bullets.",
    "En español. Solo 3-4 bullets cortos y directos. ¿Qué intención estratégica se puede inferir detrás de estas promociones? ¿Adquisición, retención, volumen, cross-sell? Sin intro, solo bullets.",
    "En español. Solo 3-4 bullets cortos y directos. ¿A qué tipo de usuario están dirigidas estas promociones? Infiere el perfil basándote en requisitos y condiciones. Sin intro, solo bullets.",
    "En español. Solo 3-4 bullets cortos y directos. ¿Qué implican estas promociones para nuestra estrategia de precios y productos? ¿Dónde tenemos riesgo u oportunidad? Sin intro, solo bullets.",
  ];
}

// ── Weekly prompt ─────────────────────────────────────────────────────────────

function buildWeeklyPrompt(weeklyPromos: PromoInput[], lang: Lang): string {
  const uniqueCompetitors = [
    ...new Set(weeklyPromos.map((p) => p.competitor).filter(Boolean)),
  ];
  const uniqueMarkets = [
    ...new Set(weeklyPromos.map((p) => p.market).filter(Boolean)),
  ];
  const rows = weeklyPromos
    .slice(0, 80)
    .map(
      (p) =>
        `${p.competitor}|${p.market}|${p.product}|${p.promoType}|${p.description.slice(0, 150)}`
    )
    .join("\n");

  const base = `Eres analista de competitive intelligence para Airtm, una fintech de pagos y remesas en LATAM.

=== INVENTARIO DE DATOS ===
Estás analizando ${weeklyPromos.length} promociones de ${uniqueCompetitors.length} competidores en ${uniqueMarkets.length} mercados, registradas en los últimos 7 días.

Competidores presentes en los datos (SOLO estos existen, no menciones ningún otro):
${uniqueCompetitors.join(", ")}

Mercados presentes en los datos (SOLO estos existen, no menciones ningún otro):
${uniqueMarkets.join(", ")}

Datos en bruto (formato: competidor | mercado | producto | tipo de promo | descripción):
${rows}

=== REGLAS ESTRICTAS ===
1. NUNCA menciones competidores, mercados o productos que no aparezcan en los datos anteriores.
2. NUNCA generalices a "LATAM en general" ni a mercados no listados.
3. Cualquier afirmación que NO sea directamente observable en los datos debe empezar con "${lang === "en" ? "Inference:" : "Inferencia:"}".
4. Si una sección no tiene datos suficientes, escribe exactamente: "${lang === "en" ? "Insufficient data." : "Sin datos suficientes."}".
5. En recommendedActions, cada acción debe ser concreta, incluir una justificación breve y referenciar un competidor o mercado específico de los datos.
6. En dataLimitations, lista lo que NO puedes saber con estos datos (mercados sin cobertura, promos sin fecha, competidores activos en otras semanas pero ausentes esta).

=== OUTPUT ===
Responde SOLO con un objeto JSON válido con esta estructura exacta (sin texto antes ni después del JSON):

{
  "executiveSummary": "2-3 sentences. Directly observable facts only. What happened this week in terms of promotional activity.",
  "keyCompetitorMoves": ["one bullet per relevant move. Observable facts only."],
  "marketsUnderPressure": ["one bullet per active market. Include: market name, number of promos, active competitors."],
  "targetUserHypothesis": ["ALL bullets must start with '${lang === "en" ? "Inference:" : "Inferencia:"}'. Infer user profile from promo conditions (minimum amounts, requirements, channel)."],
  "strategicIntentHypothesis": ["ALL bullets must start with '${lang === "en" ? "Inference:" : "Inferencia:"}'. Infer whether the intent is acquisition, retention, volume, cross-sell or other."],
  "implicationsForAirtm": ["direct bullets. What each move means for Airtm specifically. Mention affected Airtm product if applicable."],
  "recommendedActions": ["Format: concrete action — brief justification referencing the specific competitor or market."],
  "dataLimitations": ["bullets about gaps: markets without data this week, promos without dates, competitors active in other weeks but absent this one."]
}`;

  if (lang === "en") {
    return (
      base +
      "\n\nCRITICAL LANGUAGE INSTRUCTION: Generate your ENTIRE response in English. All JSON string values must be written in English."
    );
  }
  return (
    base +
    "\n\nINSTRUCCIÓN DE IDIOMA: Genera toda tu respuesta en español. Todos los valores de cadena JSON deben estar en español."
  );
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<APIResponse<AIAnalysis>>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error:
          "ANTHROPIC_API_KEY is not configured. Add it to your environment variables to enable AI analysis.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.message },
      { status: 400 }
    );
  }

  const { promos, period, weekly, lang } = parsed.data;

  const client = new Anthropic({ apiKey });

  const summary = promos
    .slice(0, 80)
    .map(
      (p) =>
        `${p.competitor}|${p.market}|${p.product}|${p.promoType}|${p.description.slice(0, 150)}`
    )
    .join("\n");

  const ctx = `Competitive promotions data (fintech/remittances LATAM, ${period}):\n${summary}\n\n`;
  const instructions = standardInstructions(lang);
  const prompts = instructions.map((instr) => buildPrompt(ctx, instr));

  // Server-side 7-day filter
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyPromos = weekly
    ? promos.filter(
        (p) => p.date != null && new Date(p.date) >= sevenDaysAgo
      )
    : [];

  const weeklyPromptText =
    weekly && weeklyPromos.length > 0
      ? buildWeeklyPrompt(weeklyPromos, lang)
      : "";

  try {
    const runStandardPrompt = (prompt: string) =>
      client.messages
        .create({
          model: "claude-opus-4-5",
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }],
        })
        .then((r) =>
          r.content[0]?.type === "text" ? r.content[0].text : ""
        );

    const [productFocus, intent, userProfile, strategy, weeklyRaw] =
      await Promise.all([
        runStandardPrompt(prompts[0]),
        runStandardPrompt(prompts[1]),
        runStandardPrompt(prompts[2]),
        runStandardPrompt(prompts[3]),
        weeklyPromptText
          ? client.messages
              .create({
                model: "claude-opus-4-5",
                max_tokens: 1500,
                messages: [{ role: "user", content: weeklyPromptText }],
              })
              .then((r) =>
                r.content[0]?.type === "text" ? r.content[0].text : ""
              )
          : Promise.resolve(""),
      ]);

    const weeklySummary =
      weeklyRaw ? parseWeeklyJSON(weeklyRaw) ?? undefined : undefined;

    return NextResponse.json({
      success: true,
      data: { productFocus, intent, userProfile, strategy, weeklySummary },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Anthropic API call failed";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
