"use client";

import { useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { Download, BarChart2, FileSpreadsheet, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  TooltipProps,
} from "recharts";

interface ChartProps {
  config: any;
  compact?: boolean;
}

// ─── Bright, vivid palette — no gradients ────────────────────────────────────
const COLORS = [
  "#2563EB", // vivid blue
  "#F97316", // vivid orange
  "#16A34A", // vivid green
  "#DC2626", // vivid red
  "#7C3AED", // vivid violet
  "#0891B2", // vivid cyan
  "#D97706", // vivid amber
  "#DB2777", // vivid pink
];

const CHART_ANIMATION = {
  isAnimationActive: true,
  animationDuration: 800,
  animationEasing: "ease-out" as const,
};

// ─── Shared axis/grid style ───────────────────────────────────────────────────
const AXIS_STYLE = {
  stroke: "#CBD5E1",
  fontSize: 11,
  fontFamily: "var(--font-inter, Inter), sans-serif",
  tickLine: false,
  axisLine: { stroke: "#E2E8F0" },
};

const GRID_STYLE = {
  strokeDasharray: "3 3",
  stroke: "#F1F5F9",
  horizontal: true,
  vertical: false,
};

// ─── Custom rich Tooltip ──────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(15,23,42,0.13)",
        padding: "10px 14px",
        minWidth: 150,
        fontFamily: "var(--font-inter, Inter), sans-serif",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#64748B",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </p>
      {payload.map((entry: any, i: number) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginBottom: i < payload.length - 1 ? 5 : 0,
          }}
        >
          {/* colored indicator — square for bar, line/circle for line */}
          {entry.type === "line" ? (
            <svg width={16} height={10} style={{ flexShrink: 0 }}>
              <line x1={0} y1={5} x2={16} y2={5} stroke={entry.color} strokeWidth={2.5} />
              <circle cx={8} cy={5} r={3} fill={entry.color} />
            </svg>
          ) : (
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: 3,
                backgroundColor: entry.color,
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ fontSize: 12, color: "#475569", flex: 1 }}>{entry.name}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>
            {smartFormat(Number(entry.value))}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Custom Legend ────────────────────────────────────────────────────────────
const CustomLegend = ({ payload }: { payload?: any[] }) => {
  if (!payload || payload.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "10px 18px",
        paddingTop: 10,
        fontFamily: "var(--font-inter, Inter), sans-serif",
      }}
    >
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {entry.type === "line" ? (
            <svg width={20} height={10} style={{ flexShrink: 0 }}>
              <line x1={0} y1={5} x2={20} y2={5} stroke={entry.color} strokeWidth={2.5} />
              <circle cx={10} cy={5} r={3} fill={entry.color} />
            </svg>
          ) : (
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: entry.color,
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Chart type labels ────────────────────────────────────────────────────────
const CHART_TYPES: Record<string, string> = {
  bar: "Bar Chart",
  line: "Line Chart",
  scatter: "Scatter Plot",
  pie: "Donut Chart",
  histogram: "Histogram",
  combo: "Combo Chart",
};

// ─── Smart number formatter ───────────────────────────────────────────────────
const smartFormat = (value: number, decimals = 2): string => {
  if (isNaN(value)) return String(value);
  const absVal = Math.abs(value);
  if (absVal >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(decimals)}B`;
  if (absVal >= 1_000_000)     return `${(value / 1_000_000).toFixed(decimals)}M`;
  if (absVal >= 1_000)         return `${(value / 1_000).toFixed(decimals)}k`;
  if (absVal > 0 && absVal < 1) return value.toPrecision(3).replace(/\.?0+$/, "");
  return Number.isInteger(value) ? String(value) : value.toFixed(decimals).replace(/\.?0+$/, "");
};

// ─── Axis split: ratio-based (>20× difference → separate axis) ───────────────
const RATIO_THRESHOLD = 20;

const buildAxisMap = (data: any[], seriesKeys: string[]): Record<string, "left" | "right"> => {
  const maxVals: Record<string, number> = {};
  seriesKeys.forEach(key => {
    maxVals[key] = Math.max(...data.map(d => {
      const val = Number(d[key]);
      return isNaN(val) ? 0 : Math.abs(val);
    }));
  });

  const sorted = [...seriesKeys].sort((a, b) => maxVals[b] - maxVals[a]);
  const dominantMax = maxVals[sorted[0]] || 1;

  const axisMap: Record<string, "left" | "right"> = {};
  sorted.forEach(key => {
    const ratio = dominantMax / (maxVals[key] || 1);
    axisMap[key] = ratio > RATIO_THRESHOLD ? "right" : "left";
  });

  return axisMap;
};

// ─── Shared tick formatter ────────────────────────────────────────────────────
const tickFmt = (v: any) => { const n = Number(v); return isNaN(n) ? v : smartFormat(n, 1); };

// ─── Shared axis label style ──────────────────────────────────────────────────
const axisLabelStyle = { fontSize: 10, fill: "#94A3B8", fontFamily: "var(--font-inter, Inter), sans-serif" };

// ─── Adaptive X-axis: angle labels when >8 data points (e.g. 12 months) ─────
// Returns spread-ready props for <XAxis>. Angles ticks at -38° and forces
// interval=0 so all ticks always render; increases height to fit angled text.
const getXAxisProps = (dataLength: number) => {
  const dense = dataLength > 8;
  return {
    interval: (dense ? 0 : "preserveStartEnd") as 0 | "preserveStartEnd",
    angle: dense ? -38 : 0,
    textAnchor: (dense ? "end" : "middle") as "end" | "middle",
    height: dense ? 58 : 30,
    tick: { fill: "#94A3B8", fontSize: dense ? 10 : 11 },
  };
};

export default function ChartRenderer({ config, compact = false }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);   // refs the whole card for download
  const [mounted,       setMounted]       = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const chartHeight = compact ? 270 : 350;

  useEffect(() => { setMounted(true); }, []);

  const downloadChart = async () => {
    if (!chartRef.current) return;
    setIsDownloading(true);
    // Double requestAnimationFrame ensures React re-renders + recharts repaints
    // the SVG before html2canvas reads the DOM.
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await new Promise(r => setTimeout(r, 120)); // extra buffer for SVG paint
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `${config.title || "chart"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const exportToExcel = () => {
    const { data, title } = config;
    if (!data || data.length === 0) return;
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Chart Data");
      XLSX.writeFile(wb, `${title || "chart-data"}.xlsx`);
    } catch (err) { console.error("Excel export failed", err); }
  };

  const renderChart = () => {
    const { type, data, x_column, y_column, y_columns, multi_series } = config;
    const seriesKeys: string[] = multi_series && Array.isArray(y_columns) ? y_columns : [];

    const firstRow = data && data.length > 0 ? data[0] : null;
    const xKey = firstRow && "name" in firstRow ? "name" : (x_column || "name");
    const yKey = firstRow && "value" in firstRow ? "value" : (y_column || "value");

    if (!data || data.length === 0) {
      return (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height: chartHeight, color:"#94A3B8", fontSize:"0.875rem" }}>
          No data available
        </div>
      );
    }

    if (!mounted) {
      return (
        <div style={{ height: chartHeight, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div className="skeleton" style={{ width:"90%", height:"70%" }} />
        </div>
      );
    }

    // ── COMBO CHART (Excel-style: bars on left + line overlay on right) ────────
    if (type === "combo" && seriesKeys.length >= 2) {
      const axisMap    = buildAxisMap(data, seriesKeys);
      const barKeys    = seriesKeys.filter(k => axisMap[k] === "left");
      const lineKeys   = seriesKeys.filter(k => axisMap[k] === "right");
      const hasRight   = lineKeys.length > 0;
      // If ratio didn't split any to right, force last key(s) to right
      const resolvedBarKeys  = barKeys.length > 0 ? barKeys : seriesKeys.slice(0, -1);
      const resolvedLineKeys = lineKeys.length > 0 ? lineKeys : seriesKeys.slice(-1);

      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart data={data} margin={{ top: 16, right: hasRight ? 60 : 20, left: 60, bottom: data.length > 8 ? 24 : 8 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey={xKey} {...AXIS_STYLE} {...getXAxisProps(data.length)} />

            {/* Left Y-axis — for bars */}
            <YAxis
              yAxisId="left"
              orientation="left"
              {...AXIS_STYLE}
              tick={{ fill: "#94A3B8", fontSize: 11 }}
              tickFormatter={tickFmt}
              label={{
                value: resolvedBarKeys.join(" / "),
                angle: -90,
                position: "insideLeft",
                style: axisLabelStyle,
                offset: -12,
              }}
            />

            {/* Right Y-axis — for lines */}
            {(hasRight || resolvedLineKeys.length > 0) && (
              <YAxis
                yAxisId="right"
                orientation="right"
                {...AXIS_STYLE}
                tick={{ fill: "#94A3B8", fontSize: 11 }}
                tickFormatter={tickFmt}
                label={{
                  value: resolvedLineKeys.join(" / "),
                  angle: 90,
                  position: "insideRight",
                  style: axisLabelStyle,
                  offset: -12,
                }}
              />
            )}

            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />

            {/* Grouped bars */}
            {resolvedBarKeys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                yAxisId="left"
                fill={COLORS[idx % COLORS.length]}
                name={key}
                radius={[5, 5, 0, 0]}
                maxBarSize={48}
                {...CHART_ANIMATION}
              />
            ))}

            {/* Line overlay */}
            {resolvedLineKeys.map((key, idx) => {
              const color = COLORS[(resolvedBarKeys.length + idx) % COLORS.length];
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  yAxisId={hasRight || resolvedLineKeys.length > 0 ? "right" : "left"}
                  stroke={color}
                  strokeWidth={2.5}
                  name={key}
                  dot={{ r: 3.5, fill: color, stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#fff", stroke: color, strokeWidth: 2.5 }}
                  {...CHART_ANIMATION}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    // ── AUTO DUAL-AXIS for bar/line multi-series ───────────────────────────────
    if ((type === "bar" || type === "line") && multi_series && seriesKeys.length >= 2) {
      const axisMap       = buildAxisMap(data, seriesKeys);
      const needsMultiAxis = new Set(Object.values(axisMap)).size > 1;

      if (needsMultiAxis) {
        const leftNames  = seriesKeys.filter(k => axisMap[k] === "left");
        const rightNames = seriesKeys.filter(k => axisMap[k] === "right");

        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={data} margin={{ top: 16, right: 60, left: 60, bottom: data.length > 8 ? 24 : 8 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey={xKey} {...AXIS_STYLE} {...getXAxisProps(data.length)} />

              <YAxis
                yAxisId="left" orientation="left"
                {...AXIS_STYLE} tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={tickFmt}
                label={{ value: leftNames.join(" / "), angle: -90, position: "insideLeft", style: axisLabelStyle, offset: -12 }}
              />
              <YAxis
                yAxisId="right" orientation="right"
                {...AXIS_STYLE} tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={tickFmt}
                label={{ value: rightNames.join(" / "), angle: 90, position: "insideRight", style: axisLabelStyle, offset: -12 }}
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />

              {seriesKeys.map((key, index) =>
                type === "line" ? (
                  <Line
                    key={key} type="monotone" dataKey={key} yAxisId={axisMap[key]}
                    stroke={COLORS[index % COLORS.length]} name={key} strokeWidth={2.5}
                    dot={{ r: 3, fill: COLORS[index % COLORS.length], stroke: "#fff", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#fff", stroke: COLORS[index % COLORS.length], strokeWidth: 2.5 }}
                    {...CHART_ANIMATION}
                  />
                ) : (
                  <Bar
                    key={key} dataKey={key} yAxisId={axisMap[key]}
                    fill={COLORS[index % COLORS.length]} name={key}
                    radius={[5, 5, 0, 0]} maxBarSize={48}
                    {...CHART_ANIMATION}
                  />
                )
              )}
            </ComposedChart>
          </ResponsiveContainer>
        );
      }
    }

    // ── STANDARD CHARTS ────────────────────────────────────────────────────────
    switch (type) {
      case "bar":
      case "histogram":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} margin={{ top: 16, right: 20, left: 40, bottom: data.length > 8 ? 24 : 8 }} barCategoryGap="28%">
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey={xKey} {...AXIS_STYLE} {...getXAxisProps(data.length)} />
              <YAxis {...AXIS_STYLE} tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={tickFmt} />
              <Tooltip content={<CustomTooltip />} />
              {seriesKeys.length > 0 ? (
                <>
                  <Legend content={<CustomLegend />} />
                  {seriesKeys.map((series, i) => (
                    <Bar key={series} dataKey={series} name={series}
                      fill={COLORS[i % COLORS.length]} radius={[5, 5, 0, 0]} maxBarSize={48}
                      {...CHART_ANIMATION}
                    />
                  ))}
                </>
              ) : (
                <Bar dataKey={yKey} name={y_column || yKey} radius={[5, 5, 0, 0]} maxBarSize={48} {...CHART_ANIMATION}>
                  {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={data} margin={{ top: 16, right: 20, left: 40, bottom: data.length > 8 ? 24 : 8 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey={xKey} {...AXIS_STYLE} {...getXAxisProps(data.length)} />
              <YAxis {...AXIS_STYLE} tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={tickFmt} />
              <Tooltip content={<CustomTooltip />} />
              {seriesKeys.length > 0 ? (
                <>
                  <Legend content={<CustomLegend />} />
                  {seriesKeys.map((series, i) => (
                    <Line key={series} type="monotone" dataKey={series} name={series}
                      stroke={COLORS[i % COLORS.length]} strokeWidth={2.5}
                      dot={{ r: 3, fill: COLORS[i % COLORS.length], stroke: "#fff", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#fff", stroke: COLORS[i % COLORS.length], strokeWidth: 2.5 }}
                      {...CHART_ANIMATION}
                    />
                  ))}
                </>
              ) : (
                <Line type="monotone" dataKey={yKey} name={y_column || yKey}
                  stroke={COLORS[0]} strokeWidth={3}
                  dot={{ r: 3, fill: COLORS[0], stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#fff", stroke: COLORS[0], strokeWidth: 2.5 }}
                  {...CHART_ANIMATION}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ScatterChart margin={{ top: 16, right: 20, left: 24, bottom: 8 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="x" name={x_column} type="number" {...AXIS_STYLE} tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={tickFmt} />
              <YAxis dataKey="y" name={y_column} type="number" {...AXIS_STYLE} tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={tickFmt} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "4 4", stroke: "rgba(37,99,235,0.25)" }} />
              <Scatter name="Values" data={data} fill={COLORS[0]} fillOpacity={0.82} {...CHART_ANIMATION} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={data} dataKey="value" nameKey="name"
                cx="45%" cy="50%"
                outerRadius={compact ? 90 : 120}
                innerRadius={compact ? 56 : 76}
                paddingAngle={3} strokeWidth={2} stroke="#fff"
                {...CHART_ANIMATION}
              >
                {data.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="vertical" verticalAlign="middle" align="right"
                content={<CustomLegend />}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const chartTypeName = CHART_TYPES[config.type] || config.type;
  const isCombo = config.type === "combo";
  const exportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div
      ref={chartRef}
      className="card chart-card"
      style={isDownloading ? {
        padding: "28px 32px 20px",
        boxShadow: "none",
        border: "1.5px solid #E2E8F0",
        borderRadius: 16,
        background: "#ffffff",
        maxWidth: "none",
      } : undefined}
    >
      <div className="chart-card-header">
        <div>
          <p className="chart-card-title">{config.title}</p>
          <span className="chart-type-badge">
            {isCombo ? <TrendingUp size={10} /> : <BarChart2 size={10} />}
            {chartTypeName}
          </span>
        </div>

        {/* Hide action buttons during PNG capture; show date instead */}
        {!isDownloading ? (
          <div className="chart-card-actions">
            <button onClick={exportToExcel} className="btn btn-outline btn-icon" title="Export data to Excel">
              <FileSpreadsheet size={15} />
            </button>
            <button
              onClick={downloadChart}
              className="btn btn-outline btn-icon"
              title="Download as PNG"
              disabled={isDownloading}
            >
              <Download size={15} />
            </button>
          </div>
        ) : (
          <span style={{
            fontSize: "0.7rem", color: "#94A3B8", fontWeight: 500,
            alignSelf: "flex-start", marginTop: 3,
          }}>
            {exportDate}
          </span>
        )}
      </div>

      <div className="chart-body">
        {renderChart()}
      </div>

      {/* Export-only footer — invisible in the UI, appears in downloaded PNG */}
      {isDownloading && (
        <div style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: "1px solid #F1F5F9",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.68rem",
          color: "#94A3B8",
          fontFamily: "var(--font-inter, Inter), sans-serif",
          letterSpacing: "0.01em",
        }}>
          <span style={{ fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#64748B" }}>
            Kinetic Analytics
          </span>
          <span>{exportDate}</span>
        </div>
      )}
    </div>
  );
}