"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import Sidebar from "@/components/Sidebar";
import StatsCards from "@/components/StatsCards";
import PromoAlerts from "@/components/PromoAlerts";
import MarketTable from "@/components/MarketTable";
import InsightsView from "@/components/InsightsView";
import ToastContainer, { ToastMessage } from "@/components/Toast";
import { statusClass } from "@/lib/format";
import { translations } from "@/lib/translations";
import type { Lang } from "@/lib/translations";
import type { MonitorData, PromoEntry, RawPromo, AppView } from "@/lib/types";

// ── Toast helpers ─────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2);
}

// ── Filter select (monitor view) ──────────────────────────────────────────────

function MonitorFilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
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
          <option key={opt.value} value={opt.value}>
            {opt.label}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  // ── Language ───────────────────────────────────────────────────────────────

  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const saved = localStorage.getItem("lang");
    return saved === "en" || saved === "es" ? saved : "en";
  });
  const t = translations[lang];

  // tRef lets stable fetch callbacks read the current translation without
  // being recreated on every language change (which would re-trigger effects).
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  const handleLangChange = useCallback((newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
  }, []);

  // ── Navigation & data state ────────────────────────────────────────────────

  const [currentView, setCurrentView] = useState<AppView>("monitor");
  const [activeMarket, setActiveMarket] = useState<string>("all");

  const [monitorData, setMonitorData]       = useState<MonitorData | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(true);
  const [monitorError, setMonitorError]     = useState<string | null>(null);

  const [rawPromos, setRawPromos]   = useState<RawPromo[]>([]);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError]     = useState<string | null>(null);
  const [rawLoaded, setRawLoaded]   = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // ── Monitor filter state ───────────────────────────────────────────────────

  const [filterCompetitor,  setFilterCompetitor]  = useState("");
  const [filterProduct,     setFilterProduct]     = useState("");
  const [filterStatus,      setFilterStatus]      = useState("");
  const [filterPromoActive, setFilterPromoActive] = useState("");

  const hasMonitorFilters = !!(filterCompetitor || filterProduct || filterStatus || filterPromoActive);

  const clearMonitorFilters = useCallback(() => {
    setFilterCompetitor("");
    setFilterProduct("");
    setFilterStatus("");
    setFilterPromoActive("");
  }, []);

  // ── Toast helpers ──────────────────────────────────────────────────────────

  const addToast = useCallback(
    (message: string, variant: ToastMessage["variant"] = "info") => {
      setToasts((prev) => [...prev, { id: makeId(), message, variant }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchMonitor = useCallback(async () => {
    setMonitorLoading(true);
    setMonitorError(null);
    try {
      const res = await fetch("/api/monitor-data");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load monitor data");
      setMonitorData(json.data as MonitorData);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setMonitorError(msg);
      addToast(`${tRef.current.errorLoadMonitor}: ${msg}`, "error");
    } finally {
      setMonitorLoading(false);
    }
  }, [addToast]);

  const fetchRawPromos = useCallback(async () => {
    if (rawLoaded) return;
    setRawLoading(true);
    setRawError(null);
    try {
      const res = await fetch("/api/promo-raw");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load promo raw");
      setRawPromos(json.data as RawPromo[]);
      setRawLoaded(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setRawError(msg);
      addToast(`${tRef.current.errorLoadPromo}: ${msg}`, "error");
    } finally {
      setRawLoading(false);
    }
  }, [rawLoaded, addToast]);

  const handleRefresh = useCallback(async () => {
    setRawLoaded(false);
    await fetchMonitor();
    if (currentView === "insights") await fetchRawPromos();
    addToast(tRef.current.dataRefreshed, "success");
  }, [fetchMonitor, fetchRawPromos, currentView, addToast]);

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => { fetchMonitor(); }, [fetchMonitor]);

  useEffect(() => {
    if (currentView === "insights" && !rawLoaded) fetchRawPromos();
  }, [currentView, rawLoaded, fetchRawPromos]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const visibleMarkets = useMemo(
    () =>
      monitorData?.marketNames.filter(
        (m) => activeMarket === "all" || m.toLowerCase() === activeMarket
      ) ?? [],
    [monitorData, activeMarket]
  );

  const allEntries = useMemo<PromoEntry[]>(() => {
    if (!monitorData) return [];
    return Object.values(monitorData.markets).flatMap((mkt) =>
      Object.values(mkt).flat()
    );
  }, [monitorData]);

  const competitorOptions = useMemo(
    () => [...new Set(allEntries.map((e) => e.competitor).filter(Boolean))].sort(),
    [allEntries]
  );
  const productOptions = useMemo(
    () => [...new Set(allEntries.map((e) => e.product).filter(Boolean))].sort(),
    [allEntries]
  );

  const filteredMarkets = useMemo<MonitorData["markets"]>(() => {
    if (!monitorData) return {};
    const result: MonitorData["markets"] = {};

    for (const market of visibleMarkets) {
      const mktData = monitorData.markets[market];
      if (!mktData) continue;

      const filteredComps: Record<string, PromoEntry[]> = {};

      for (const [comp, products] of Object.entries(mktData)) {
        if (filterCompetitor && comp !== filterCompetitor) continue;

        const kept = products.filter((p) => {
          if (filterProduct && p.product !== filterProduct) return false;

          if (filterStatus === "winning" && statusClass(p.status) !== "win")  return false;
          if (filterStatus === "losing"  && statusClass(p.status) !== "lose") return false;
          if (filterStatus === "nodata"  && !p.status.includes("No Data") && p.status.trim() !== "") return false;

          if (filterPromoActive === "active"   && !p.promoImpact.includes("Active")) return false;
          if (filterPromoActive === "inactive" &&  p.promoImpact.includes("Active")) return false;

          return true;
        });

        if (kept.length > 0) filteredComps[comp] = kept;
      }

      if (Object.keys(filteredComps).length > 0) result[market] = filteredComps;
    }

    return result;
  }, [monitorData, visibleMarkets, filterCompetitor, filterProduct, filterStatus, filterPromoActive]);

  const filteredEntries = useMemo<PromoEntry[]>(
    () => Object.values(filteredMarkets).flatMap((m) => Object.values(m).flat()),
    [filteredMarkets]
  );

  const filteredMarketNames     = Object.keys(filteredMarkets);
  const filteredCompetitorCount = new Set(filteredEntries.map((e) => e.competitor)).size;
  const filteredTrackable       = filteredEntries.filter((e) => !e.status.includes("No Data"));
  const filteredWins            = filteredTrackable.filter((e) => e.status.includes("Winning"));
  const filteredActivePromos    = filteredEntries.filter((e) => e.promoImpact.includes("Active"));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <DashboardHeader
        lastUpdate={monitorData?.lastUpdate ?? "—"}
        loading={monitorLoading}
        onRefresh={handleRefresh}
        lang={lang}
        onLangChange={handleLangChange}
        t={t}
      />

      {/* Initial full-screen loading overlay */}
      {monitorLoading && !monitorData && (
        <div
          style={{
            position: "fixed", inset: 0, background: "var(--bg)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 16, zIndex: 999,
          }}
        >
          <div
            style={{
              width: 32, height: 32,
              border: "2.5px solid var(--border2)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ fontSize: 13, color: "var(--muted)" }}>{t.loadingData}</p>
        </div>
      )}

      <div style={{ display: "flex", minHeight: "calc(100vh - 76px)" }}>
        <Sidebar
          currentView={currentView}
          marketNames={monitorData?.marketNames ?? []}
          activeMarket={activeMarket}
          activePromoCount={monitorData?.activePromos.length ?? 0}
          onSetView={setCurrentView}
          onFilterMarket={setActiveMarket}
          t={t}
        />

        <main style={{ flex: 1, padding: "28px 32px", overflowX: "auto" }}>

          {/* ── Monitor View ── */}
          {currentView === "monitor" && (
            <div>
              {/* Error banner */}
              {monitorError && (
                <div
                  style={{
                    background: "var(--lose-bg)", border: "1px solid var(--lose)",
                    color: "var(--lose)", padding: "12px 16px", borderRadius: 8,
                    fontSize: 13, marginBottom: 20,
                  }}
                >
                  {monitorError}
                </div>
              )}

              {/* Filter bar */}
              {monitorData && (
                <div
                  style={{
                    display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
                    padding: "10px 14px", marginBottom: 20,
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                >
                  <MonitorFilterSelect
                    value={filterCompetitor}
                    onChange={setFilterCompetitor}
                    placeholder={t.allCompetitors}
                    options={competitorOptions.map((c) => ({ value: c, label: c }))}
                  />
                  <MonitorFilterSelect
                    value={filterProduct}
                    onChange={setFilterProduct}
                    placeholder={t.allProducts}
                    options={productOptions.map((p) => ({ value: p, label: p }))}
                  />
                  <MonitorFilterSelect
                    value={filterStatus}
                    onChange={setFilterStatus}
                    placeholder={t.allStatuses}
                    options={[
                      { value: "winning", label: t.filterWinning },
                      { value: "losing",  label: t.filterLosing  },
                      { value: "nodata",  label: t.noData         },
                    ]}
                  />
                  <MonitorFilterSelect
                    value={filterPromoActive}
                    onChange={setFilterPromoActive}
                    placeholder={t.allPromos}
                    options={[
                      { value: "active",   label: t.filterActivePromo },
                      { value: "inactive", label: t.filterNoPromo     },
                    ]}
                  />

                  {hasMonitorFilters && (
                    <button
                      onClick={clearMonitorFilters}
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
              )}

              {/* KPI cards */}
              <StatsCards
                marketCount={filteredMarketNames.length}
                marketNames={filteredMarketNames}
                competitorCount={filteredCompetitorCount}
                productComparisons={filteredEntries.length}
                wins={filteredWins.length}
                trackable={filteredTrackable.length}
                activePromoCount={filteredActivePromos.length}
                activePromoSub={
                  filteredActivePromos.length
                    ? filteredActivePromos
                        .map((p) => `${p.competitor} (${p.market.slice(0, 3).toUpperCase()})`)
                        .join(" · ")
                    : t.noActivePromotions
                }
                t={t}
              />

              {/* Active promo alerts */}
              <div id="promo-section" style={{ marginBottom: 28 }}>
                <div
                  style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13, fontWeight: 600, color: "var(--text)",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 3, height: 13, borderRadius: 2,
                        background: "var(--accent)", display: "inline-block",
                      }}
                    />
                    {t.activeCompetitorPromos}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 11, color: "var(--muted)" }}>
                    {[
                      { color: "var(--win)",     label: t.legendWinning },
                      { color: "var(--lose)",    label: t.legendLosing  },
                      { color: "var(--neutral)", label: t.noData        },
                    ].map(({ color, label }) => (
                      <span key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <PromoAlerts activePromos={filteredActivePromos} t={t} />
              </div>

              {/* Per-market tables */}
              {monitorData && filteredMarketNames.length > 0 &&
                filteredMarketNames.map((market) => (
                  <MarketTable
                    key={market}
                    market={market}
                    competitors={filteredMarkets[market]}
                    t={t}
                  />
                ))}

              {/* Empty state when filters leave no rows */}
              {monitorData && !monitorLoading && filteredMarketNames.length === 0 && (
                <div
                  style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 10, padding: "48px 20px",
                    textAlign: "center", marginBottom: 20,
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>◎</div>
                  <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 6 }}>
                    {t.noMatchFilters}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
                    {allEntries.length > 0
                      ? t.comparisonsAvailable(allEntries.length)
                      : t.noMonitorData}
                  </p>
                  {hasMonitorFilters && (
                    <button
                      onClick={clearMonitorFilters}
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
              )}

              {/* No data at all */}
              {!monitorLoading && !monitorData && !monitorError && (
                <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", paddingTop: 60 }}>
                  {t.noDataCheckUrl}
                </p>
              )}
            </div>
          )}

          {/* ── Insights View ── */}
          {currentView === "insights" && (
            <InsightsView promos={rawPromos} loading={rawLoading} error={rawError} t={t} lang={lang} />
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
