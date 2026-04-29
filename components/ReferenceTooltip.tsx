"use client";

import { useState } from "react";
import type { Translation } from "@/lib/translations";

interface ReferenceTooltipProps {
  airtmReference?: string;
  competitorReference?: string;
  sourceReference?: string;
  calculationNote?: string;
  competitorName?: string;
  t: Translation;
}

const TOOLTIP_W = 248;

export default function ReferenceTooltip({
  airtmReference,
  competitorReference,
  sourceReference,
  calculationNote,
  competitorName,
  t,
}: ReferenceTooltipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const hasAirtm      = !!airtmReference?.trim();
  const hasCompetitor = !!competitorReference?.trim();
  const hasSource     = !!sourceReference?.trim();
  const hasNote       = !!calculationNote?.trim();
  const hasData       = hasAirtm || hasCompetitor;

  function handleEnter(e: React.MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(8, r.left + r.width / 2 - TOOLTIP_W / 2);
    setPos({ x, y: r.top });
  }

  function handleLeave() {
    setPos(null);
  }

  return (
    <>
      {/* Info icon */}
      <span
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{
          display: "inline-flex",
          alignItems: "center",
          cursor: "help",
          color: "var(--muted)",
          opacity: 0.65,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 11 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          aria-hidden="true"
        >
          <circle cx="5.5" cy="5.5" r="4.5" />
          <line x1="5.5" y1="5.2" x2="5.5" y2="8" strokeLinecap="round" />
          <circle cx="5.5" cy="3.3" r="0.55" fill="currentColor" stroke="none" />
        </svg>
      </span>

      {/* Tooltip — position:fixed escapes overflow:hidden on the table wrapper */}
      {pos && (
        <div
          style={{
            position: "fixed",
            top: pos.y - 8,
            left: pos.x,
            transform: "translateY(-100%)",
            width: TOOLTIP_W,
            background: "var(--surface2)",
            border: "1px solid var(--border2)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 11,
            lineHeight: 1.5,
            zIndex: 300,
            boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
            pointerEvents: "none",
          }}
        >
          {hasData ? (
            // Two-column grid: fixed 80px label column + flexible value column
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr",
                columnGap: 10,
                rowGap: 6,
                alignItems: "baseline",
              }}
            >
              {hasAirtm && (
                <>
                  <span style={{ fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>
                    Airtm
                  </span>
                  <span style={{ color: "var(--muted)", fontWeight: 500 }}>
                    {airtmReference}
                  </span>
                </>
              )}
              {hasCompetitor && (
                <>
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    {competitorName || t.competitor}
                  </span>
                  <span style={{ color: "var(--muted)", fontWeight: 500 }}>
                    {competitorReference}
                  </span>
                </>
              )}
              {hasSource && (
                <>
                  <span style={{ color: "var(--muted)", fontWeight: 500, opacity: 0.65, fontSize: 10 }}>
                    {t.source}
                  </span>
                  <span style={{ color: "var(--muted)", opacity: 0.65, fontSize: 10 }}>
                    {sourceReference}
                  </span>
                </>
              )}
              {hasNote && (
                <>
                  <span style={{ color: "var(--muted)", fontWeight: 500, opacity: 0.65, fontSize: 10 }}>
                    {t.note}
                  </span>
                  <span style={{ color: "var(--muted)", opacity: 0.65, fontSize: 10 }}>
                    {calculationNote}
                  </span>
                </>
              )}
            </div>
          ) : (
            <span style={{ color: "var(--muted)" }}>{t.referenceUnavailable}</span>
          )}
        </div>
      )}
    </>
  );
}
