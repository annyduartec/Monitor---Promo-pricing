"use client";

import { useState, useEffect, useCallback } from "react";
import BarChart from "@/components/BarChart";
import { countBy, fmtISODate } from "@/lib/format";
import type { RawPromo, InsightsPeriod, AIAnalysis } from "@/lib/types";

interface InsightsViewProps {
  promos: RawPromo[];
  loading: boolean;
  error: string | null;
}

function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) =>
      l
        .replace(/^[-•*·▸▶►]\s*/, "")
        .replace(/^\d+\.\s*/, "")
        .trim()
    )
    .filter((l) => l.length > 2);
}

function AIBullets({ text }: { text: string }) {
  const lines = parseBullets(text);
  if (!lines.length)
    return <p style={{ color: "var(--muted)", fontSize: 12 }}>{text}</p>;

  return (
    <div className="ai-bullets">
      {lines.map((line, i) => (
        <div key={i} className="ai-bullet">
          <div className="ai-bullet-dot" />
          <div
            className="ai-bullet-text"
            dangerouslySetInnerHTML={{
              // We only receive text from our own Anthropic API route — safe to render
              // bold markers. Strip any HTML tags first, then convert **bold** markers.
              __html: line
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
            }}
          />
        </div>
      ))}
    </div>
  );
}

function AICard({
  icon,
  title,
  content,
  loading,
}: {
  icon: string;
  title: string;
  content: string;
  loading: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "13px 18px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--surface2)",
        }}
      >
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "16px 18px" }}>
        {loading ? (
          <div
            className="ai-loading"
            style={{
              color: "var(--muted)",
              fontStyle: "italic",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                border: "1.5px solid var(--border2)",
                borderTopColor: "var(--promo)",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
                flexShrink: 0,
              }}
            />
            Analizando…
          </div>
        ) : content ? (
          <AIBullets text={content} />
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 12 }}>
            Sin datos suficientes.
          </p>
        )}
      </div>
    </div>
  );
}

function IkpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--promo)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
        {sub}
      </div>
    </div>
  );
}

export default function InsightsView({
  promos,
  loading,
  error,
}: InsightsViewProps) {
  const [period, setPeriod] = useState<InsightsPeriod>(15);
  const [aiAnalysis, setAiAnalysis] = useState<Partial<AIAnalysis>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Filter promos by the selected time period
  const filtered = period === 0
    ? promos
    : promos.filter((p) => {
        if (!p.date) return true;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - period);
        return new Date(p.date) >= cutoff;
      });

  // Derived counts for charts and KPIs
  const compCounts = countBy(filtered as unknown as Record<string, unknown>[], "competitor");
  const prodCounts = countBy(filtered as unknown as Record<string, unknown>[], "product");
  const mktCounts  = countBy(filtered as unknown as Record<string, unknown>[], "market");

  const periodLabel =
    period === 0 ? "todo el historial" : `los últimos ${period} días`;

  const runAIAnalysis = useCallback(async () => {
    if (!filtered.length) return;
    setAiLoading(true);
    setAiError(null);
    setAiAnalysis({});

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promos: filtered.slice(0, 80), period: periodLabel }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "AI analysis failed");
      setAiAnalysis(json.data as AIAnalysis);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setAiLoading(false);
    }
  }, [filtered, periodLabel]);

  // Re-run AI whenever the period or data changes
  useEffect(() => {
    if (filtered.length > 0) {
      runAIAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, promos.length]);

  const PERIOD_OPTIONS: { label: string; value: InsightsPeriod }[] = [
    { label: "Últimos 15 días", value: 15 },
    { label: "Último mes", value: 30 },
    { label: "Todo el historial", value: 0 },
  ];

  if (loading) {
    return (
      <div style={{ color: "var(--muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>
        <div
          style={{
            width: 24,
            height: 24,
            border: "2px solid var(--border2)",
            borderTopColor: "var(--promo)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
            margin: "0 auto 12px",
          }}
        />
        Cargando datos de promos…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "var(--lose-bg)",
          border: "1px solid var(--lose)",
          color: "var(--lose)",
          padding: "12px 16px",
          borderRadius: 8,
          fontSize: 13,
          marginBottom: 20,
        }}
      >
        Error al cargar Promo Raw: {error}
      </div>
    );
  }

  return (
    <div>
      {/* Period tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 16px",
              borderRadius: 7,
              border:
                period === opt.value
                  ? "1px solid rgba(245,158,11,0.4)"
                  : "1px solid var(--border2)",
              background:
                period === opt.value ? "var(--promo-bg)" : "var(--surface)",
              color: period === opt.value ? "var(--promo)" : "var(--muted)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={runAIAnalysis}
          disabled={aiLoading || !filtered.length}
          style={{
            marginLeft: "auto",
            fontSize: 11,
            fontWeight: 500,
            padding: "6px 14px",
            borderRadius: 7,
            border: "1px solid var(--border2)",
            background: "var(--surface2)",
            color: "var(--muted)",
            cursor: aiLoading || !filtered.length ? "not-allowed" : "pointer",
            opacity: aiLoading || !filtered.length ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {aiLoading ? (
            <span
              style={{
                width: 10,
                height: 10,
                border: "1.5px solid var(--border2)",
                borderTopColor: "var(--promo)",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
                display: "inline-block",
              }}
            />
          ) : (
            "✦"
          )}{" "}
          Re-analizar
        </button>
      </div>

      {/* KPI row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <IkpiCard
          label="Promos registradas"
          value={String(filtered.length)}
          sub={period === 0 ? "en todo el historial" : `en los últimos ${period} días`}
        />
        <IkpiCard
          label="Competidores activos"
          value={String(compCounts.length)}
          sub={compCounts.slice(0, 2).map((c) => c[0]).join(", ") || "—"}
        />
        <IkpiCard
          label="Producto más atacado"
          value={prodCounts[0]?.[0] || "—"}
          sub={prodCounts[0] ? `${prodCounts[0][1]} veces` : ""}
        />
        <IkpiCard
          label="Mercado más activo"
          value={mktCounts[0]?.[0] || "—"}
          sub={mktCounts[0] ? `${mktCounts[0][1]} promos` : ""}
        />
      </div>

      {/* AI error banner */}
      {aiError && (
        <div
          style={{
            background: "var(--lose-bg)",
            border: "1px solid var(--lose)",
            color: "var(--lose)",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          ⚠️ AI analysis unavailable: {aiError}
        </div>
      )}

      {/* AI analysis cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <AICard
          icon="🎯"
          title="Foco de Producto"
          content={aiAnalysis.productFocus ?? ""}
          loading={aiLoading}
        />
        <AICard
          icon="💡"
          title="Intención Estratégica"
          content={aiAnalysis.intent ?? ""}
          loading={aiLoading}
        />
        <AICard
          icon="👤"
          title="Perfil de Usuario Objetivo"
          content={aiAnalysis.userProfile ?? ""}
          loading={aiLoading}
        />
        <AICard
          icon="⚡"
          title="Implicaciones para Nuestra Estrategia"
          content={aiAnalysis.strategy ?? ""}
          loading={aiLoading}
        />
      </div>

      {/* Bar charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {[
          { title: "Promos por Producto", data: prodCounts },
          { title: "Promos por Competidor", data: compCounts },
        ].map(({ title, data }) => (
          <div
            key={title}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {title}
            </div>
            <div style={{ padding: 16 }}>
              <BarChart data={data} />
            </div>
          </div>
        ))}
      </div>

      {/* Raw promo history table */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
            Historial de Promociones
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>
            {filtered.length} registros
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 800,
            }}
          >
            <thead>
              <tr>
                {["Fecha", "Mercado", "Competidor", "Producto", "Tipo de Promo", "Descripción", "Estado"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        color: "var(--muted)",
                        padding: "9px 14px",
                        textAlign: "left",
                        background: "var(--surface2)",
                        borderBottom: "1px solid var(--border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      color: "var(--muted)",
                      padding: 24,
                      fontSize: 12,
                    }}
                  >
                    Sin datos en este período
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLTableRowElement).style.background =
                        "var(--surface2)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLTableRowElement).style.background =
                        "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "8px 14px",
                        fontSize: 12,
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtISODate(p.date)}
                    </td>
                    <td style={{ padding: "8px 14px", fontSize: 12 }}>
                      {p.market || "—"}
                    </td>
                    <td
                      style={{
                        padding: "8px 14px",
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {p.competitor || "—"}
                    </td>
                    <td
                      style={{
                        padding: "8px 14px",
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      {p.product || "—"}
                    </td>
                    <td style={{ padding: "8px 14px", fontSize: 12 }}>
                      {p.promoType || "—"}
                    </td>
                    <td
                      style={{
                        padding: "8px 14px",
                        fontSize: 11,
                        color: "#94a3b8",
                        lineHeight: 1.5,
                        maxWidth: 300,
                      }}
                    >
                      {p.description || "—"}
                    </td>
                    <td style={{ padding: "8px 14px", fontSize: 11 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: p.active
                              ? "var(--win)"
                              : "var(--muted)",
                            display: "inline-block",
                          }}
                        />
                        {p.active ? "Activa" : "Finalizada"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
