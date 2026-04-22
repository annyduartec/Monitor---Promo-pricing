import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { AIAnalysis, APIResponse } from "@/lib/types";

export const runtime = "nodejs";
// AI calls can take a while — give them 60 s on Vercel Pro, 10 s on Hobby
export const maxDuration = 60;

const RawPromoShape = z.object({
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
});

function buildPrompt(ctx: string, instruction: string): string {
  return `${ctx}${instruction}`;
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

  const { promos, period } = parsed.data;

  const client = new Anthropic({ apiKey });

  // Build a compact summary (max 80 entries × 150 chars each)
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

  try {
    const results = await Promise.all(
      prompts.map((prompt) =>
        client.messages
          .create({
            model: "claude-opus-4-5",
            max_tokens: 400,
            messages: [{ role: "user", content: prompt }],
          })
          .then((r) =>
            r.content[0]?.type === "text" ? r.content[0].text : ""
          )
      )
    );

    const [productFocus, intent, userProfile, strategy] = results;

    return NextResponse.json({
      success: true,
      data: { productFocus, intent, userProfile, strategy },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Anthropic API call failed";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
