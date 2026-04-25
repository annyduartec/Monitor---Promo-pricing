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
});

type PromoInput = z.infer<typeof RawPromoShape>;

function buildPrompt(ctx: string, instruction: string): string {
  return `${ctx}${instruction}`;
}

function parseWeeklyJSON(text: string): WeeklySummary | null {
  // Strip markdown code fences if Claude wraps the JSON
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

function buildWeeklyPrompt(weeklyPromos: PromoInput[]): string {
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

  return `Eres analista de competitive intelligence para Airtm, una fintech de pagos y remesas en LATAM.

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
3. Cualquier afirmación que NO sea directamente observable en los datos debe empezar con "Inferencia:".
4. Si una sección no tiene datos suficientes, escribe exactamente: "Sin datos suficientes."
5. En recommendedActions, cada acción debe ser concreta, incluir una justificación breve y referenciar un competidor o mercado específico de los datos.
6. En dataLimitations, lista lo que NO puedes saber con estos datos (mercados sin cobertura, promos sin fecha, competidores activos en otras semanas pero ausentes esta).

=== OUTPUT ===
Responde SOLO con un objeto JSON válido con esta estructura exacta (sin texto antes ni después del JSON):

{
  "executiveSummary": "2-3 oraciones. Solo hechos directamente observables. Qué pasó esta semana en términos de actividad promocional.",
  "keyCompetitorMoves": ["bullet por cada movimiento relevante. Solo lo observable."],
  "marketsUnderPressure": ["bullet por mercado activo. Incluir: nombre del mercado, número de promos, competidores activos en él."],
  "targetUserHypothesis": ["TODOS los bullets deben empezar con 'Inferencia:'. Inferir perfil de usuario desde condiciones de la promo (montos mínimos, requisitos, canal)."],
  "strategicIntentHypothesis": ["TODOS los bullets deben empezar con 'Inferencia:'. Inferir si la intención es adquisición, retención, volumen, cross-sell u otra."],
  "implicationsForAirtm": ["bullets directos. Qué significa cada movimiento para Airtm específicamente. Mencionar producto Airtm afectado si aplica."],
  "recommendedActions": ["Formato: acción concreta — justificación breve referenciando el competidor o mercado específico."],
  "dataLimitations": ["bullets sobre gaps: mercados sin datos esta semana, promos sin fecha, competidores activos en otras semanas pero ausentes esta."]
}`;
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

  const { promos, period, weekly } = parsed.data;

  const client = new Anthropic({ apiKey });

  // Build a compact summary for the 4 existing prompts (max 80 entries × 150 chars each)
  const summary = promos
    .slice(0, 80)
    .map(
      (p) =>
        `${p.competitor}|${p.market}|${p.product}|${p.promoType}|${p.description.slice(0, 150)}`
    )
    .join("\n");

  const ctx = `Datos de promociones competitivas (fintech/remesas LATAM, ${period}):\n${summary}\n\n`;

  const prompts = [
    buildPrompt(
      ctx,
      "En español. Solo 3-4 bullets cortos y directos. ¿En qué productos o categorías están concentrando sus promociones los competidores? ¿Hay patrones claros por producto? Sin intro, solo bullets."
    ),
    buildPrompt(
      ctx,
      "En español. Solo 3-4 bullets cortos y directos. ¿Qué intención estratégica se puede inferir detrás de estas promociones? ¿Adquisición, retención, volumen, cross-sell? Sin intro, solo bullets."
    ),
    buildPrompt(
      ctx,
      "En español. Solo 3-4 bullets cortos y directos. ¿A qué tipo de usuario están dirigidas estas promociones? Infiere el perfil basándote en requisitos y condiciones. Sin intro, solo bullets."
    ),
    buildPrompt(
      ctx,
      "En español. Solo 3-4 bullets cortos y directos. ¿Qué implican estas promociones para nuestra estrategia de precios y productos? ¿Dónde tenemos riesgo u oportunidad? Sin intro, solo bullets."
    ),
  ];

  // Server-side 7-day filter — enforces recency independently of what the client sent
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyPromos = weekly
    ? promos.filter(
        (p) => p.date != null && new Date(p.date) >= sevenDaysAgo
      )
    : [];

  const weeklyPromptText =
    weekly && weeklyPromos.length > 0 ? buildWeeklyPrompt(weeklyPromos) : "";

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
