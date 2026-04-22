"use client";

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
}: StatsCardsProps) {
  const cards: StatCard[] = [
    {
      label: "Markets Tracked",
      value: String(marketCount || "—"),
      sub: marketNames.join(" · ") || "—",
      variant: "accent",
    },
    {
      label: "Competitors",
      value: String(competitorCount || "—"),
      sub: `${productComparisons} product comparisons`,
      variant: "accent",
    },
    {
      label: "Winning",
      value: trackable ? `${wins}/${trackable}` : "—",
      sub: "of tracked comparisons",
      variant: "win",
    },
    {
      label: "Active Promos",
      value: String(activePromoCount || "—"),
      sub: activePromoSub || "No active promotions",
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
