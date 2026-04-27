"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import BarChart from "@/components/BarChart";
import { countBy, fmtISODate } from "@/lib/format";
import type { Lang, Translation } from "@/lib/translations";
import type { RawPromo, InsightsPeriod, AIAnalysis, WeeklySummary } from "@/lib/types";

interface InsightsViewProps {
  promos: RawPromo[];
  loading: boolean;
  error: string | null;
  t: Translation;
  lang: Lang;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function sanitizeAndBold(text: string): string {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
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

// ── Filter select ─────────────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  const active = value !== "";
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontSize: 12,
          fontWeight: active ? 600 : 400,
          padding: "5px 26px 5px 10px",
          borderRadius: 7,
          border: active ? "1px solid rgba(245,158,11,0.4)" : "1px solid var(--border2)",
          background: active ? "var(--promo-bg)" : "var(--surface)",
          color: active ? "var(--promo)" : "var(--muted)",
          cursor: "pointer",
          outline: "none",
          appearance: "none",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 8,
          pointerEvents: "none",
          color: active ? "var(--promo)" : "var(--muted)",
          fontSize: 9,
          lineHeight: 1,
        }}
      >
        ▾
      </span>
    </div>
  );
}

// ── AI card components ────────────────────────────────────────────────────────

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
            dangerouslySetInnerHTML={{ __html: sanitizeAndBold(line) }}
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
  analyzingLabel,
  noContentLabel,
}: {
  icon: string;
  title: string;
  content: string;
  loading: boolean;
  analyzingLabel: string;
  noContentLabel: string;
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
            {analyzingLabel}
          </div>
        ) : content ? (
          <AIBullets text={content} />
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 12 }}>
            {noContentLabel}
          </p>
        )}
      </div>
    </div>
  );
}

function IkpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
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
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--promo)", lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

// ── Weekly Summary components ─────────────────────────────────────────────────

function WeeklyBullets({
  items,
  dimInference = false,
  noDataLabel,
}: {
  items: string[];
  dimInference?: boolean;
  noDataLabel: string;
}) {
  if (!items.length)
    return <p style={{ color: "var(--muted)", fontSize: 12 }}>{noDataLabel}</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => {
        const isInference = dimInference && /^inferencia:|^inference:/i.test(item);
        return (
          <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: isInference ? "var(--muted)" : "var(--promo)",
                flexShrink: 0,
                marginTop: 6,
                opacity: isInference ? 0.5 : 1,
              }}
            />
            <span
              style={{ fontSize: 12, color: isInference ? "var(--muted)" : "#94a3b8", lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: sanitizeAndBold(item) }}
            />
          </div>
        );
      })}
    </div>
  );
}

function WeeklySection({
  label,
  items,
  dimInference = false,
  noDataLabel,
}: {
  label: string;
  items: string[];
  dimInference?: boolean;
  noDataLabel: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <WeeklyBullets items={items} dimInference={dimInference} noDataLabel={noDataLabel} />
    </div>
  );
}

function WeeklySummaryBlock({
  summary,
  loading,
  t,
}: {
  summary: WeeklySummary | undefined;
  loading: boolean;
  t: Translation;
}) {
  const cardStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
  };
  const header = (
    <div
      style={{
        padding: "14px 20px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: "var(--promo)", flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
          {t.weeklyReport}
        </span>
      </div>
      <span style={{ fontSize: 11, color: "var(--muted)" }}>{t.last7Days}</span>
    </div>
  );

  if (loading && !summary) {
    return (
      <div style={cardStyle}>
        {header}
        <div
          style={{
            padding: "36px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            color: "var(--muted)",
            fontSize: 12,
            fontStyle: "italic",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              border: "1.5px solid var(--border2)",
              borderTopColor: "var(--promo)",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
              flexShrink: 0,
            }}
          />
          {t.generatingWeeklyReport}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const twoColGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 1,
    background: "var(--border)",
    borderBottom: "1px solid var(--border)",
  };
  const twoColCell: React.CSSProperties = { padding: "16px 20px", background: "var(--surface)" };

  return (
    <div style={cardStyle}>
      {header}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
          {t.executiveSummary}
        </div>
        <p
          style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, margin: 0 }}
          dangerouslySetInnerHTML={{ __html: sanitizeAndBold(summary.executiveSummary) }}
        />
      </div>
      <div style={twoColGrid}>
        <div style={twoColCell}>
          <WeeklySection label={t.keyCompetitorMoves} items={summary.keyCompetitorMoves} noDataLabel={t.insufficientData} />
        </div>
        <div style={twoColCell}>
          <WeeklySection label={t.marketsUnderPressure} items={summary.marketsUnderPressure} noDataLabel={t.insufficientData} />
        </div>
      </div>
      <div style={twoColGrid}>
        <div style={twoColCell}>
          <WeeklySection label={t.targetUserHypothesis} items={summary.targetUserHypothesis} dimInference noDataLabel={t.insufficientData} />
        </div>
        <div style={twoColCell}>
          <WeeklySection label={t.strategicIntentHypothesis} items={summary.strategicIntentHypothesis} dimInference noDataLabel={t.insufficientData} />
        </div>
      </div>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
        <WeeklySection label={t.implicationsForAirtm} items={summary.implicationsForAirtm} noDataLabel={t.insufficientData} />
      </div>
      <div
        style={{
          padding: "16px 20px",
          background: "var(--accent-bg)",
          borderLeft: "3px solid var(--accent)",
          borderBottom: "1px solid rgba(59,130,246,0.15)",
        }}
      >
        <WeeklySection label={t.recommendedActions} items={summary.recommendedActions} noDataLabel={t.insufficientData} />
      </div>
      <div style={{ padding: "12px 20px" }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8, opacity: 0.55 }}>
          {t.dataLimitations}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {summary.dataLimitations.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--muted)", flexShrink: 0, marginTop: 6, opacity: 0.4 }} />
              <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5, opacity: 0.7 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InsightsView({ promos, loading, error, t, lang }: InsightsViewProps) {
  const [period, setPeriod] = useState<InsightsPeriod>(15);

  const [filterMarket,     setFilterMarket]     = useState("");
  const [filterCompetitor, setFilterCompetitor] = useState("");
  const [filterPromoType,  setFilterPromoType]  = useState("");
  const [filterProduct,    setFilterProduct]    = useState("");
  const [filterActive,     setFilterActive]     = useState("");

  const [aiAnalysis, setAiAnalysis] = useState<Partial<AIAnalysis>>({});
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiError,    setAiError]    = useState<string | null>(null);

  // ── Derived filter options ──────────────────────────────────────────────────

  const marketOptions = useMemo(
    () => [...new Set(promos.map((p) => p.market).filter(Boolean))].sort(),
    [promos]
  );
  const competitorOptions = useMemo(
    () => [...new Set(promos.map((p) => p.competitor).filter(Boolean))].sort(),
    [promos]
  );
  const promoTypeOptions = useMemo(
    () => [...new Set(promos.map((p) => p.promoType).filter(Boolean))].sort(),
    [promos]
  );
  const productOptions = useMemo(
    () => [...new Set(promos.map((p) => p.product).filter(Boolean))].sort(),
    [promos]
  );

  const hasFilters = !!(filterMarket || filterCompetitor || filterPromoType || filterProduct || filterActive);

  const clearFilters = useCallback(() => {
    setFilterMarket("");
    setFilterCompetitor("");
    setFilterPromoType("");
    setFilterProduct("");
    setFilterActive("");
  }, []);

  // ── Filtering chain ─────────────────────────────────────────────────────────

  const byPeriod = useMemo(
    () =>
      period === 0
        ? promos
        : promos.filter((p) => {
            if (!p.date) return true;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - period);
            return new Date(p.date) >= cutoff;
          }),
    [promos, period]
  );

  const filtered = useMemo(
    () =>
      byPeriod.filter((p) => {
        if (filterMarket     && p.market      !== filterMarket)     return false;
        if (filterCompetitor && p.competitor  !== filterCompetitor) return false;
        if (filterPromoType  && p.promoType   !== filterPromoType)  return false;
        if (filterProduct    && p.product     !== filterProduct)    return false;
        if (filterActive === "active"   && !p.active)  return false;
        if (filterActive === "inactive" &&  p.active)  return false;
        return true;
      }),
    [byPeriod, filterMarket, filterCompetitor, filterPromoType, filterProduct, filterActive]
  );

  // ── Derived counts ──────────────────────────────────────────────────────────

  const compCounts = countBy(filtered as unknown as Record<string, unknown>[], "competitor");
  const prodCounts = countBy(filtered as unknown as Record<string, unknown>[], "product");
  const mktCounts  = countBy(filtered as unknown as Record<string, unknown>[], "market");

  // periodLabel is sent to the AI API — kept in Spanish regardless of UI lang
  const periodLabel =
    period === 0 ? "todo el historial" :
    period === 7 ? "la última semana"  :
    `los últimos ${period} días`;

  // ── AI analysis ─────────────────────────────────────────────────────────────

  const runAIAnalysis = useCallback(async () => {
    if (!filtered.length) return;
    setAiLoading(true);
    setAiError(null);
    setAiAnalysis({});

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promos: filtered.slice(0, 80),
          period: periodLabel,
          weekly: period === 7,
          lang,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "AI analysis failed");
      setAiAnalysis(json.data as AIAnalysis);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setAiLoading(false);
    }
  }, [filtered, periodLabel, period, lang]);

  useEffect(() => {
    if (filtered.length > 0) {
      runAIAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, promos.length]);

  // ── Period options ──────────────────────────────────────────────────────────

  const PERIOD_OPTIONS: { label: string; value: InsightsPeriod }[] = [
    { label: t.lastWeek,   value: 7  },
    { label: t.last15Days, value: 15 },
    { label: t.lastMonth,  value: 30 },
    { label: t.allHistory, value: 0  },
  ];

  // ── KPI sub-text ────────────────────────────────────────────────────────────

  const periodSub =
    period === 0 ? t.inAllHistory :
    period === 7 ? t.inLastWeek   :
    t.inLastNDays(period);

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ color: "var(--muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>
        <div
          style={{
            width: 24, height: 24,
            border: "2px solid var(--border2)",
            borderTopColor: "var(--promo)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
            margin: "0 auto 12px",
          }}
        />
        {t.loadingPromos}
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "var(--lose-bg)", border: "1px solid var(--lose)",
          color: "var(--lose)", padding: "12px 16px", borderRadius: 8,
          fontSize: 13, marginBottom: 20,
        }}
      >
        {t.errorLoadingPromoRaw}: {error}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Period tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            style={{
              fontSize: 12, fontWeight: 600, padding: "6px 16px", borderRadius: 7,
              border:      period === opt.value ? "1px solid rgba(245,158,11,0.4)" : "1px solid var(--border2)",
              background:  period === opt.value ? "var(--promo-bg)"                : "var(--surface)",
              color:       period === opt.value ? "var(--promo)"                   : "var(--muted)",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={runAIAnalysis}
          disabled={aiLoading || !filtered.length}
          style={{
            marginLeft: "auto", fontSize: 11, fontWeight: 500,
            padding: "6px 14px", borderRadius: 7,
            border: "1px solid var(--border2)", background: "var(--surface2)",
            color: "var(--muted)",
            cursor: aiLoading || !filtered.length ? "not-allowed" : "pointer",
            opacity: aiLoading || !filtered.length ? 0.5 : 1,
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          {aiLoading ? (
            <span
              style={{
                width: 10, height: 10,
                border: "1.5px solid var(--border2)", borderTopColor: "var(--promo)",
                borderRadius: "50%", animation: "spin 0.7s linear infinite",
                display: "inline-block",
              }}
            />
          ) : "✦"}{" "}
          {t.reanalyze}
        </button>
      </div>

      {/* Filter row */}
      <div
        style={{
          display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center",
          padding: "10px 14px",
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
        }}
      >
        <FilterSelect
          value={filterMarket}
          onChange={setFilterMarket}
          placeholder={t.allMarkets}
          options={marketOptions}
        />
        <FilterSelect
          value={filterCompetitor}
          onChange={setFilterCompetitor}
          placeholder={t.allCompetitors}
          options={competitorOptions}
        />
        <FilterSelect
          value={filterPromoType}
          onChange={setFilterPromoType}
          placeholder={t.allPromoTypes}
          options={promoTypeOptions}
        />
        <FilterSelect
          value={filterProduct}
          onChange={setFilterProduct}
          placeholder={t.allProducts}
          options={productOptions}
        />
        <FilterSelect
          value={filterActive}
          onChange={setFilterActive}
          placeholder={t.allStatuses}
          options={["active", "inactive"]}
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              marginLeft: "auto", fontSize: 11, fontWeight: 500,
              padding: "5px 12px", borderRadius: 7,
              border: "1px solid var(--border2)", background: "transparent",
              color: "var(--muted)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>×</span> {t.clearFilters}
          </button>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div
          style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "48px 20px", textAlign: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>◎</div>
          <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 6 }}>
            {t.noMatchPromos}
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
            {promos.length === 0
              ? t.noPromoRawData
              : t.promosAvailable(promos.length)}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                fontSize: 12, fontWeight: 600, padding: "7px 18px", borderRadius: 7,
                border: "1px solid var(--border2)", background: "var(--surface2)",
                color: "var(--muted)", cursor: "pointer",
              }}
            >
              {t.clearFilters}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 14, marginBottom: 24,
            }}
          >
            <IkpiCard
              label={t.promosRegistered}
              value={String(filtered.length)}
              sub={periodSub}
            />
            <IkpiCard
              label={t.activeCompetitors}
              value={String(compCounts.length)}
              sub={compCounts.slice(0, 2).map((c) => c[0]).join(", ") || "—"}
            />
            <IkpiCard
              label={t.mostAttackedProduct}
              value={prodCounts[0]?.[0] || "—"}
              sub={prodCounts[0] ? t.times(prodCounts[0][1]) : ""}
            />
            <IkpiCard
              label={t.mostActiveMarket}
              value={mktCounts[0]?.[0] || "—"}
              sub={mktCounts[0] ? t.promoCount(mktCounts[0][1]) : ""}
            />
          </div>

          {/* Weekly Summary Block */}
          {period === 7 && (
            <WeeklySummaryBlock summary={aiAnalysis.weeklySummary} loading={aiLoading} t={t} />
          )}

          {/* AI error banner */}
          {aiError && (
            <div
              style={{
                background: "var(--lose-bg)", border: "1px solid var(--lose)",
                color: "var(--lose)", padding: "10px 14px", borderRadius: 8,
                fontSize: 12, marginBottom: 16,
              }}
            >
              ⚠️ {t.aiUnavailable}: {aiError}
            </div>
          )}

          {/* AI analysis cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16, marginBottom: 20,
            }}
          >
            <AICard icon="🎯" title={t.productFocus}         content={aiAnalysis.productFocus ?? ""} loading={aiLoading} analyzingLabel={t.analyzing} noContentLabel={t.insufficientData} />
            <AICard icon="💡" title={t.strategicIntent}      content={aiAnalysis.intent       ?? ""} loading={aiLoading} analyzingLabel={t.analyzing} noContentLabel={t.insufficientData} />
            <AICard icon="👤" title={t.targetUserProfile}    content={aiAnalysis.userProfile  ?? ""} loading={aiLoading} analyzingLabel={t.analyzing} noContentLabel={t.insufficientData} />
            <AICard icon="⚡" title={t.strategyImplications} content={aiAnalysis.strategy     ?? ""} loading={aiLoading} analyzingLabel={t.analyzing} noContentLabel={t.insufficientData} />
          </div>

          {/* Bar charts */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16, marginBottom: 20,
            }}
          >
            {[
              { title: t.promosByProduct,   data: prodCounts },
              { title: t.promosByCompetitor, data: compCounts },
            ].map(({ title, data }) => (
              <div
                key={title}
                style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 10, overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px", borderBottom: "1px solid var(--border)",
                    fontSize: 12, fontWeight: 600, color: "var(--text)",
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
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, overflow: "hidden", marginBottom: 20,
            }}
          >
            <div
              style={{
                padding: "12px 16px", borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                {t.promoHistory}
              </span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                {t.recordCount(filtered.length)}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                <thead>
                  <tr>
                    {[t.date, t.market, t.competitor, t.product, t.promoType, t.description, t.status].map(
                      (h, i) => (
                        <th
                          key={i}
                          style={{
                            fontSize: 10, fontWeight: 600, letterSpacing: "0.07em",
                            textTransform: "uppercase", color: "var(--muted)",
                            padding: "9px 14px", textAlign: "left",
                            background: "var(--surface2)", borderBottom: "1px solid var(--border)",
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
                  {filtered.map((p, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLTableRowElement).style.background = "var(--surface2)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")
                      }
                    >
                      <td style={{ padding: "8px 14px", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {fmtISODate(p.date)}
                      </td>
                      <td style={{ padding: "8px 14px", fontSize: 12 }}>{p.market || "—"}</td>
                      <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 500 }}>{p.competitor || "—"}</td>
                      <td style={{ padding: "8px 14px", fontSize: 12, color: "var(--muted)" }}>{p.product || "—"}</td>
                      <td style={{ padding: "8px 14px", fontSize: 12 }}>{p.promoType || "—"}</td>
                      <td style={{ padding: "8px 14px", fontSize: 11, color: "#94a3b8", lineHeight: 1.5, maxWidth: 300 }}>
                        {p.description || "—"}
                      </td>
                      <td style={{ padding: "8px 14px", fontSize: 11 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span
                            style={{
                              width: 6, height: 6, borderRadius: "50%",
                              background: p.active ? "var(--win)" : "var(--muted)",
                              display: "inline-block",
                            }}
                          />
                          {p.active ? t.activeStatus : t.endedStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
