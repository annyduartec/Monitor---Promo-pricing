"use client";

import type { Lang, Translation } from "@/lib/translations";

interface DashboardHeaderProps {
  lastUpdate: string;
  loading: boolean;
  onRefresh: () => void;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  t: Translation;
}

export default function DashboardHeader({
  lastUpdate,
  loading,
  onRefresh,
  lang,
  onLangChange,
  t,
}: DashboardHeaderProps) {
  return (
    <header
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "18px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* ── Left: title + subtitle ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "0 0 8px var(--accent)",
            marginTop: 4,
            flexShrink: 0,
          }}
        />
        <div>
          <h1
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text)",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Promo Pricing Monitor
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "var(--muted)",
              margin: "4px 0 0",
              lineHeight: 1.2,
            }}
          >
            Real-time view of competitor promos and Airtm positioning
          </p>
        </div>
      </div>

      {/* ── Right: controls ────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

        {/* Language toggle */}
        <div
          style={{
            display: "flex",
            border: "1px solid var(--border2)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          {(["en", "es"] as Lang[]).map((l, i) => (
            <button
              key={l}
              onClick={() => onLangChange(l)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.05em",
                padding: "5px 10px",
                border: "none",
                borderRight: i === 0 ? "1px solid var(--border2)" : "none",
                background: lang === l ? "var(--accent)" : "var(--surface2)",
                color: lang === l ? "#fff" : "var(--muted)",
                cursor: lang === l ? "default" : "pointer",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Vertical divider */}
        <div
          style={{
            width: 1,
            height: 20,
            background: "var(--border2)",
            flexShrink: 0,
          }}
        />

        {/* Last update */}
        {lastUpdate && lastUpdate !== "—" && (
          <div
            style={{
              fontSize: 12,
              color: "var(--muted)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--win)",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            {t.lastUpdate}: {lastUpdate}
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: "6px 14px",
            borderRadius: 6,
            border: "1px solid var(--border2)",
            background: "var(--surface2)",
            color: "var(--muted)",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: loading ? 0.6 : 1,
            transition: "color 0.15s, border-color 0.15s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border2)";
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            style={loading ? { animation: "spin 0.7s linear infinite" } : {}}
          >
            <path d="M10.5 6A4.5 4.5 0 1 1 6 1.5c1.3 0 2.47.55 3.3 1.42L10.5 4.5" />
            <path d="M8 4.5h2.5V2" />
          </svg>
          {loading ? t.refreshing : t.refresh}
        </button>
      </div>
    </header>
  );
}
