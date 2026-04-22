"use client";

import type { AppView } from "@/lib/types";
import { getFlag } from "@/lib/format";

interface SidebarProps {
  currentView: AppView;
  marketNames: string[];
  activeMarket: string;
  activePromoCount: number;
  onSetView: (view: AppView) => void;
  onFilterMarket: (market: string) => void;
}

interface NavItemProps {
  active?: boolean;
  isInsights?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: string | number;
}

function NavItem({
  active,
  isInsights,
  onClick,
  children,
  badge,
}: NavItemProps) {
  const accentColor = isInsights ? "var(--promo)" : "var(--accent)";
  const accentBg = isInsights ? "var(--promo-bg)" : "var(--accent-bg)";

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "9px 22px",
        cursor: "pointer",
        color: active ? (isInsights ? "var(--promo)" : "var(--text)") : "var(--muted)",
        fontSize: 13,
        fontWeight: 500,
        transition: "all 0.15s",
        borderLeft: active ? `2px solid ${accentColor}` : "2px solid transparent",
        background: active ? accentBg : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLDivElement).style.color = "var(--text)";
          (e.currentTarget as HTMLDivElement).style.background = "var(--surface2)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLDivElement).style.color = "var(--muted)";
          (e.currentTarget as HTMLDivElement).style.background = "transparent";
        }
      }}
    >
      <span style={{ flex: 1 }}>{children}</span>
      {badge !== undefined && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: 10,
            background: active ? accentBg : "var(--surface2)",
            color: active ? accentColor : "var(--muted)",
            border: active ? `1px solid ${accentColor}33` : "none",
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--muted)",
        padding: "0 22px 8px",
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: "var(--border)",
        margin: "14px 0",
      }}
    />
  );
}

export default function Sidebar({
  currentView,
  marketNames,
  activeMarket,
  activePromoCount,
  onSetView,
  onFilterMarket,
}: SidebarProps) {
  return (
    <aside
      style={{
        width: 204,
        flexShrink: 0,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        padding: "24px 0",
        position: "sticky",
        top: 61,
        height: "calc(100vh - 61px)",
        overflowY: "auto",
      }}
    >
      <SidebarLabel>Markets</SidebarLabel>

      <NavItem
        active={currentView === "monitor" && activeMarket === "all"}
        onClick={() => {
          onSetView("monitor");
          onFilterMarket("all");
        }}
        badge={marketNames.length || undefined}
      >
        All Markets
      </NavItem>

      {marketNames.map((m) => (
        <NavItem
          key={m}
          active={currentView === "monitor" && activeMarket === m.toLowerCase()}
          onClick={() => {
            onSetView("monitor");
            onFilterMarket(m.toLowerCase());
          }}
        >
          {getFlag(m)} {m}
        </NavItem>
      ))}

      <Divider />

      <SidebarLabel>Active Promos</SidebarLabel>

      <NavItem
        active={false}
        onClick={() => {
          onSetView("monitor");
          onFilterMarket("all");
          setTimeout(() => {
            document
              .getElementById("promo-section")
              ?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }}
      >
        {activePromoCount > 0
          ? `⚠️ ${activePromoCount} Active`
          : "✅ No active promos"}
      </NavItem>

      <Divider />

      <SidebarLabel>Analysis</SidebarLabel>

      <NavItem
        isInsights
        active={currentView === "insights"}
        onClick={() => onSetView("insights")}
      >
        ✦ Promo Insights
      </NavItem>
    </aside>
  );
}
