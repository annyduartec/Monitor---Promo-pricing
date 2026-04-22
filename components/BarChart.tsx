"use client";

interface BarChartProps {
  data: [string, number][];
  maxItems?: number;
}

const COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#a78bfa",
  "#22d3ee",
  "#22c55e",
  "#f04f5a",
  "#fb7185",
  "#34d399",
];

export default function BarChart({ data, maxItems = 7 }: BarChartProps) {
  if (!data.length) {
    return (
      <div style={{ color: "var(--muted)", fontSize: 12 }}>Sin datos</div>
    );
  }

  const max = data[0][1];
  const visible = data.slice(0, maxItems);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {visible.map(([label, count], i) => {
        const color = COLORS[i % COLORS.length];
        const pct = ((count / max) * 100).toFixed(1);

        return (
          <div key={label} className="bar-row">
            <div className="bar-label" title={label}>
              {label}
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${pct}%`,
                  background: `${color}22`,
                  borderRight: `2px solid ${color}`,
                }}
              >
                <span style={{ color }}>{count}</span>
              </div>
            </div>
            <div className="bar-count">{count}</div>
          </div>
        );
      })}
    </div>
  );
}
