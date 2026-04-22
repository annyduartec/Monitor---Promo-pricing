"use client";

interface DashboardHeaderProps {
  lastUpdate: string;
  loading: boolean;
  onRefresh: () => void;
}

export default function DashboardHeader({
  lastUpdate,
  loading,
  onRefresh,
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
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "0 0 10px var(--accent)",
          }}
        />
        <h1 style={{ fontSize: 15, fontWeight: 600 }}>
          Promo Pricing Monitor{" "}
          <span style={{ color: "var(--muted)", fontWeight: 400 }}>
            / Competitive Intelligence
          </span>
        </h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {lastUpdate && lastUpdate !== "—" && (
          <div
            style={{
              fontSize: 12,
              color: "var(--muted)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--win)",
                display: "inline-block",
              }}
            />
            Last update: {lastUpdate}
          </div>
        )}
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
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "var(--accent)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--border2)";
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
          Actualizar
        </button>
      </div>
    </header>
  );
}
