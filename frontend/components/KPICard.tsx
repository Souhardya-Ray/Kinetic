import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface KPICardProps {
  label: string;
  value: number;
  mean: number;
  index?: number;
}

export default function KPICard({ label, value, mean, index = 0 }: KPICardProps) {
  const isPositive = value >= mean;
  const pctDiff = mean !== 0 ? (((value - mean) / mean) * 100).toFixed(1) : "0";

  const formatNumber = (num: number) => {
    if (Math.abs(num) >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
    if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
    if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(1) + "k";
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const accentColors = [
    { bar: "var(--blue)", bg: "var(--blue-pale)" },
    { bar: "var(--red)", bg: "var(--red-pale)" },
    { bar: "var(--yellow)", bg: "var(--yellow-pale)" },
    { bar: "var(--green)", bg: "var(--green-pale)" },
  ];

  const accent = accentColors[index % accentColors.length];

  return (
    <div
      className={`card card-hover kpi-card animate-up stagger-${Math.min(index + 1, 8)}`}
      style={{ borderLeft: `4px solid ${accent.bar}` }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
            lineHeight: 1.2,
            flex: 1,
          }}
        >
          {label}
        </p>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "10px",
            background: accent.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "transform 0.35s var(--ease-spring)",
          }}
          className="kpi-icon"
        >
          <Activity size={17} color={accent.bar} />
        </div>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <span className="stat-number">{formatNumber(value)}</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "1rem",
          borderTop: "1px solid var(--border)",
        }}
      >
        <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          avg{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatNumber(mean)}</span>
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: isPositive ? "var(--green)" : "var(--red)",
            background: isPositive ? "var(--green-pale)" : "var(--red-pale)",
            padding: "0.25rem 0.6rem",
            borderRadius: "100px",
            transition: "transform 0.25s var(--ease-spring)",
          }}
        >
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isPositive ? "+" : ""}
          {pctDiff}%
        </div>
      </div>
    </div>
  );
}
