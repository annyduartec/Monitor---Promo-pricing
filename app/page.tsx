"use client";

import { useState, useCallback, useEffect } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import Sidebar from "@/components/Sidebar";
import StatsCards from "@/components/StatsCards";
import PromoAlerts from "@/components/PromoAlerts";
import MarketTable from "@/components/MarketTable";
import InsightsView from "@/components/InsightsView";
import ToastContainer, { ToastMessage } from "@/components/Toast";
import type { MonitorData, RawPromo, AppView } from "@/lib/types";

// ── Toast helpers ─────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  // ── State ──────────────────────────────────────────────────────────────────

  const [currentView, setCurrentView] = useState<AppView>("monitor");
  const [activeMarket, setActiveMarket] = useState<string>("all");

  // Monitor data
  const [monitorData, setMonitorData] = useState<MonitorData | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(true);
  const [monitorError, setMonitorError] = useState<string | null>(null);

  // Insights (raw promos) data
  const [rawPromos, setRawPromos] = useState<RawPromo[]>([]);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);
  const [rawLoaded, setRawLoaded] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setMonitorError(msg);
      addToast(`Error al cargar monitor: ${msg}`, "error");
    } finally {
      setMonitorLoading(false);
    }
  }, [addToast]);

  const fetchRawPromos = useCallback(async () => {
    if (rawLoaded) return; // only load once per session (user can use refresh)
    setRawLoading(true);
    setRawError(null);
    try {
      const res = await fetch("/api/promo-raw");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load promo raw");
      setRawPromos(json.data as RawPromo[]);
      setRawLoaded(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setRawError(msg);
      addToast(`Error al cargar Promo Raw: ${msg}`, "error");
    } finally {
      setRawLoading(false);
    }
  }, [rawLoaded, addToast]);

  const handleRefresh = useCallback(async () => {
    setRawLoaded(false); // allow re-fetch of raw promos
    await fetchMonitor();
    if (currentView === "insights") {
      await fetchRawPromos();
    }
    addToast("Datos actualizados", "success");
  }, [fetchMonitor, fetchRawPromos, currentView, addToast]);

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  // Initial load
  useEffect(() => {
    fetchMonitor();
  }, [fetchMonitor]);

  // Load raw promos when navigating to insights
  useEffect(() => {
    if (currentView === "insights" && !rawLoaded) {
      fetchRawPromos();
    }
  }, [currentView, rawLoaded, fetchRawPromos]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const visibleMarkets =
    monitorData?.marketNames.filter(
      (m) => activeMarket === "all" || m.toLowerCase() === activeMarket
    ) ?? [];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <DashboardHeader
        lastUpdate={monitorData?.lastUpdate ?? "—"}
        loading={monitorLoading}
        onRefresh={handleRefresh}
      />

      {/* Initial full-screen loading overlay */}
      {monitorLoading && !monitorData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--bg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            zIndex: 999,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: "2.5px solid var(--border2)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            Cargando datos…
          </p>
        </div>
      )}

      <div
        style={{
          display: "flex",
          minHeight: "calc(100vh - 61px)",
        }}
      >
        <Sidebar
          currentView={currentView}
          marketNames={monitorData?.marketNames ?? []}
          activeMarket={activeMarket}
          activePromoCount={monitorData?.activePromos.length ?? 0}
          onSetView={setCurrentView}
          onFilterMarket={setActiveMarket}
        />

        <main
          style={{
            flex: 1,
            padding: "28px 32px",
            overflowX: "auto",
          }}
        >
          {/* ── Monitor View ── */}
          {currentView === "monitor" && (
            <div>
              {/* Error banner */}
              {monitorError && (
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
                  {monitorError}
                </div>
              )}

              {/* KPI cards */}
              <StatsCards
                marketCount={monitorData?.marketNames.length ?? 0}
                marketNames={monitorData?.marketNames ?? []}
                competitorCount={monitorData?.totalCompetitors ?? 0}
                productComparisons={monitorData?.productComparisons ?? 0}
                wins={monitorData?.wins ?? 0}
                trackable={monitorData?.trackable ?? 0}
                activePromoCount={monitorData?.activePromos.length ?? 0}
                activePromoSub={
                  monitorData?.activePromos.length
                    ? monitorData.activePromos
                        .map(
                          (p) =>
                            `${p.competitor} (${p.market.slice(0, 3).toUpperCase()})`
                        )
                        .join(" · ")
                    : "No active promotions"
                }
              />

              {/* Active promo alerts */}
              <div id="promo-section" style={{ marginBottom: 28 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 3,
                        height: 13,
                        borderRadius: 2,
                        background: "var(--accent)",
                        display: "inline-block",
                      }}
                    />
                    Active Competitor Promotions
                  </div>
                  {/* Legend */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 18,
                      fontSize: 11,
                      color: "var(--muted)",
                    }}
                  >
                    {[
                      { color: "var(--win)", label: "Winning" },
                      { color: "var(--lose)", label: "Losing" },
                      { color: "var(--neutral)", label: "No Data" },
                    ].map(({ color, label }) => (
                      <span
                        key={label}
                        style={{ display: "flex", alignItems: "center", gap: 5 }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: color,
                            display: "inline-block",
                          }}
                        />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <PromoAlerts activePromos={monitorData?.activePromos ?? []} />
              </div>

              {/* Per-market tables */}
              {monitorData &&
                visibleMarkets.map((market) => (
                  <MarketTable
                    key={market}
                    market={market}
                    competitors={monitorData.markets[market]}
                  />
                ))}

              {/* Empty state */}
              {!monitorLoading && !monitorData && !monitorError && (
                <p
                  style={{
                    color: "var(--muted)",
                    fontSize: 13,
                    textAlign: "center",
                    paddingTop: 60,
                  }}
                >
                  No hay datos disponibles. Verifica la URL del Google Sheet.
                </p>
              )}
            </div>
          )}

          {/* ── Insights View ── */}
          {currentView === "insights" && (
            <InsightsView
              promos={rawPromos}
              loading={rawLoading}
              error={rawError}
            />
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
