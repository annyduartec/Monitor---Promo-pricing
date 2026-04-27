"use client";

import type { Translation } from "@/lib/translations";

interface StatCard {
  label: string;
  value: string;
  sub: string;
  variant: "accent" | "win" | "promo";
}

interface StatsCardsProps {
  marketCount: number;
  marketNames: string[];
  competitorCount: number;
  productComparisons: number;
  wins: number;
  trackable: number;
  activePromoCount: number;
  activePromoSub: string;
  t: Translation;
}

const VARIANT_COLOR: Record<StatCard["variant"], string> = {
  accent: "var(--accent)",
  win: "var(--win)",
  promo: "var(--promo)",
};

function KpiCard({ label, value, sub, variant }: StatCard) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          color: VARIANT_COLOR[variant],
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</div>
    </div>
  );
}

export default function StatsCards({
  marketCount,
  marketNames,
  competitorCount,
  productComparisons,
  wins,
  trackable,
  activePromoCount,
  activePromoSub,
  t,
}: StatsCardsProps) {
  const cards: StatCard[] = [
    {
      label: t.marketsTracked,
      value: String(marketCount || "—"),
      sub: marketNames.join(" · ") || "—",
      variant: "accent",
    },
    {
      label: t.competitors,
      value: String(competitorCount || "—"),
      sub: `${productComparisons} ${t.productComparisons}`,
      variant: "accent",
    },
    {
      label: t.winning,
      value: trackable ? `${wins}/${trackable}` : "—",
      sub: t.ofTrackedComparisons,
      variant: "win",
    },
    {
      label: t.activePromos,
      value: String(activePromoCount || "—"),
      sub: activePromoSub || t.noActivePromotions,
      variant: "promo",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 14,
        marginBottom: 28,
      }}
    >
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
