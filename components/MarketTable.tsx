"use client";

import type { PromoEntry } from "@/lib/types";
import { getFlag, statusClass, deltaClass } from "@/lib/format";
import type { Translation } from "@/lib/translations";
import React from "react";

interface MarketTableProps {
  market: string;
  competitors: Record<string, PromoEntry[]>;
  t: Translation;
}

function StatusPill({ status, noDataLabel }: { status: string; noDataLabel: string }) {
  const cls = statusClass(status);
  const emoji =
    cls === "win" ? "🟢" : cls === "lose" ? "🔴" : "⚪";
  const label = status
    .replace("🔴 ", "")
    .replace("🟢 ", "")
    .replace("⚪ ", "")
    .trim();

  return (
    <span className={`pill pill-${cls}`}>
      {emoji} {label || noDataLabel}
    </span>
  );
}

function DeltaCell({ value }: { value: string }) {
  const cls = deltaClass(value);
  return (
    <span className={`delta delta-${cls}`}>{value || "—"}</span>
  );
}

function PromoCell({
  hasPromo,
  desc,
  delta,
  activeLabel,
}: {
  hasPromo: boolean;
  desc: string;
  delta: string;
  activeLabel: string;
}) {
  if (!hasPromo) {
    return (
      <td
        style={{ padding: "8px 14px", fontSize: 12, color: "var(--muted)", textAlign: "center" }}
      >
        —
      </td>
    );
  }

  return (
    <td style={{ padding: "8px 14px", textAlign: "center" }}>
      <span className="promo-tag">
        ⚠️ {activeLabel}
        <span className="tooltip">{desc}</span>
      </span>
    </td>
  );
}

export default function MarketTable({ market, competitors, t }: MarketTableProps) {
  return (
    <div style={{ marginBottom: 28 }}>
      {/* Market header */}
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
          {getFlag(market)} {market}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[t.competitor, t.product, t.status, t.baseDelta, t.promoImpact, t.promoDelta].map(
                (h, i) => (
                  <th
                    key={i}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                      padding: "9px 14px",
                      textAlign: i >= 2 ? "center" : "left",
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
            {Object.entries(competitors).map(([competitor, products]) => (
              <React.Fragment key={`competitor-${competitor}`}>
                {/* Competitor group row */}
                <tr
                  key={`group-${competitor}`}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td
                    colSpan={6}
                    style={{
                      padding: "9px 14px 3px",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "var(--accent)",
                      background: "rgba(59,130,246,0.04)",
                    }}
                  >
                    {competitor}
                  </td>
                </tr>

                {/* Product rows */}
                {products.map((p, pi) => {
                  const hasPromo = p.promoImpact.includes("Active");
                  return (
                    <tr
                      key={`${competitor}-${pi}`}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLTableRowElement).style.background =
                          "var(--surface2)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLTableRowElement).style.background =
                          "transparent")
                      }
                    >
                      {/* Competitor cell (empty — grouped above) */}
                      <td style={{ padding: "8px 14px" }} />

                      {/* Product */}
                      <td
                        style={{
                          padding: "8px 14px 8px 28px",
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        {p.product}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "8px 14px", textAlign: "center" }}>
                        <StatusPill status={p.status} noDataLabel={t.noData} />
                      </td>

                      {/* Base delta */}
                      <td style={{ padding: "8px 14px", textAlign: "right" }}>
                        <DeltaCell value={p.baseDelta} />
                      </td>

                      {/* Promo impact */}
                      <PromoCell
                        hasPromo={hasPromo}
                        desc={p.promoDesc}
                        delta={p.promoDelta}
                        activeLabel={t.active}
                      />

                      {/* Promo delta */}
                      <td style={{ padding: "8px 14px", textAlign: "right" }}>
                        {hasPromo ? (
                          <DeltaCell value={p.promoDelta} />
                        ) : (
                          <span
                            style={{ color: "var(--muted)", fontSize: 12 }}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
