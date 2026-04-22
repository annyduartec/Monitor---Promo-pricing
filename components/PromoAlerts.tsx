"use client";

import type { PromoEntry } from "@/lib/types";

interface PromoAlertsProps {
  activePromos: PromoEntry[];
}

export default function PromoAlerts({ activePromos }: PromoAlertsProps) {
  if (activePromos.length === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: 13, padding: "12px 0" }}>
        No hay promociones activas en este momento.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {activePromos.map((p, i) => (
        <div
          key={`${p.competitor}-${p.market}-${i}`}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--promo)",
            borderRadius: 10,
            padding: "14px 18px",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 14,
            alignItems: "start",
          }}
        >
          <span style={{ fontSize: 16, marginTop: 2 }}>⚠️</span>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {p.competitor}{" "}
              <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 11 }}>
                · {p.market}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
              {p.product}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                marginTop: 5,
                lineHeight: 1.5,
                maxWidth: 680,
              }}
            >
              {p.promoDesc}
            </div>
          </div>

          <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            <div
              style={{ fontSize: 18, fontWeight: 700, color: "var(--lose)" }}
            >
              {p.promoDelta !== "—" ? p.promoDelta : "—"}
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
              Promo ∆
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
