"use client";

import { useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { Download, BarChart2, FileSpreadsheet } from "lucide-react";
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
} from "recharts";

interface ChartProps {
  config: any;
  compact?: boolean;
}

const COLORS = ["#1d4ed8", "#dc2626", "#d97706", "#16a34a", "#0ea5e9", "#9333ea"];

const CHART_ANIMATION = {
  isAnimationActive: true,
  animationDuration: 900,
  animationEasing: "ease-out" as const,
};

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#ffffff",
    border: "1px solid rgba(15, 23, 42, 0.1)",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
    padding: "0.75rem 1rem",
    fontSize: "0.8125rem",
    color: "#0f172a",
  },
  itemStyle: { color: "#0f172a", fontWeight: 600, padding: "2px 0" },
  labelStyle: { color: "#64748b", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.75rem" },
  cursor: { fill: "rgba(29, 78, 216, 0.06)", stroke: "rgba(29, 78, 216, 0.2)", strokeWidth: 1 },
};

const AXIS_STYLE = {
  stroke: "#94a3b8",
  fontSize: 11,
  fontFamily: "var(--font-inter, Inter), sans-serif",
  tickLine: false,
  axisLine: { stroke: "rgba(15,23,42,0.08)" },
};

const GRID_STYLE = {
  strokeDasharray: "4 4",
  stroke: "rgba(15,23,42,0.05)",
  horizontal: true,
  vertical: false,
};

const CHART_TYPES: Record<string, string> = {
  bar: "Bar Chart",
  line: "Line Chart",
  scatter: "Scatter Plot",
  pie: "Donut Chart",
  histogram: "Histogram",
};

export default function ChartRenderer({ config, compact = false }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const chartHeight = compact ? 260 : 340;

  useEffect(() => {
    setMounted(true);
  }, []);

  const downloadChart = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${config.title || "chart"}.png`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  const exportToExcel = () => {
    const { data, title } = config;
    if (!data || data.length === 0) return;
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Chart Data");
      XLSX.writeFile(workbook, `${title || "chart-data"}.xlsx`);
    } catch (err) {
      console.error("Excel export failed", err);
    }
  };

  const renderChart = () => {
    const { type, data, x_column, y_column, y_columns, multi_series } = config;
    // multi_series is a boolean flag; actual series names come from y_columns array
    const seriesKeys: string[] = multi_series && Array.isArray(y_columns) ? y_columns : [];

    // nl_query.py always renames x_col→"name" and y_col→"value" in the data records.
    // chart_engine.py keeps original column names (e.g. "Product Category", "sales_jan").
    // Detect which format we have by inspecting the first data record.
    const firstRow = data && data.length > 0 ? data[0] : null;
    const xKey = firstRow && "name" in firstRow ? "name" : (x_column || "name");
    const yKey = firstRow && "value" in firstRow ? "value" : (y_column || "value");
    if (!data || data.length === 0)
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: chartHeight,
            color: "var(--text-muted)",
            fontSize: "0.875rem",
          }}
        >
          No data available
        </div>
      );

    if (!mounted) {
      return (
        <div style={{ height: chartHeight, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="skeleton" style={{ width: "90%", height: "70%" }} />
        </div>
      );
    }

    switch (type) {
      case "bar":
      case "histogram":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} margin={{ top: 12, right: 20, left: 24, bottom: 8 }} barCategoryGap="28%">
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey={xKey} {...AXIS_STYLE} tick={{ fill: "#64748b" }} />
              <YAxis {...AXIS_STYLE} tick={{ fill: "#64748b" }} />
              <Tooltip {...TOOLTIP_STYLE} />
              {seriesKeys.length > 0 ? (
                <>
                  <Legend
                    wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }}
                    iconType="circle"
                    iconSize={8}
                  />
                  {seriesKeys.map((series: string, i: number) => (
                    <Bar
                      key={series}
                      dataKey={series}
                      name={series}
                      fill={COLORS[i % COLORS.length]}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={52}
                      {...CHART_ANIMATION}
                    />
                  ))}
                </>
              ) : (
                <Bar dataKey={yKey} name={y_column || yKey} radius={[6, 6, 0, 0]} maxBarSize={52} {...CHART_ANIMATION}>
                  {data.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={data} margin={{ top: 12, right: 20, left: 24, bottom: 8 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey={xKey} {...AXIS_STYLE} tick={{ fill: "#64748b" }} />
              <YAxis {...AXIS_STYLE} tick={{ fill: "#64748b" }} />
              <Tooltip {...TOOLTIP_STYLE} />
              {seriesKeys.length > 0 ? (
                <>
                  <Legend
                    wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }}
                    iconType="circle"
                    iconSize={8}
                  />
                  {seriesKeys.map((series: string, i: number) => (
                    <Line
                      key={series}
                      type="monotone"
                      dataKey={series}
                      name={series}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 0 }}
                      activeDot={{ r: 5, fill: "#fff", stroke: COLORS[i % COLORS.length], strokeWidth: 2 }}
                      {...CHART_ANIMATION}
                    />
                  ))}
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey={yKey}
                  name={y_column || yKey}
                  stroke={COLORS[0]}
                  strokeWidth={3}
                  dot={{ r: 0 }}
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
            <ScatterChart margin={{ top: 12, right: 20, left: 8, bottom: 8 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="x" name={x_column} type="number" {...AXIS_STYLE} tick={{ fill: "#64748b" }} />
              <YAxis dataKey="y" name={y_column} type="number" {...AXIS_STYLE} tick={{ fill: "#64748b" }} />
              <Tooltip
                {...TOOLTIP_STYLE}
                cursor={{ strokeDasharray: "4 4", stroke: "rgba(29,78,216,0.25)" }}
              />
              <Scatter
                name="Values"
                data={data}
                fill={COLORS[0]}
                fillOpacity={0.75}
                {...CHART_ANIMATION}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={compact ? 88 : 118}
                innerRadius={compact ? 54 : 74}
                paddingAngle={3}
                strokeWidth={2}
                stroke="#fff"
                {...CHART_ANIMATION}
              >
                {data.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "0.75rem", fontWeight: 500 }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const chartTypeName = CHART_TYPES[config.type] || config.type;

  return (
    <div className="card chart-card">
      <div className="chart-card-header">
        <div>
          <p className="chart-card-title">{config.title}</p>
          <span className="chart-type-badge">
            <BarChart2 size={10} />
            {chartTypeName}
          </span>
        </div>
        <div className="chart-card-actions">
          <button
            onClick={exportToExcel}
            className="btn btn-outline btn-icon"
            title="Export data to Excel"
          >
            <FileSpreadsheet size={15} />
          </button>
          <button
            onClick={downloadChart}
            className="btn btn-outline btn-icon"
            title="Download as PNG"
          >
            <Download size={15} />
          </button>
        </div>
      </div>

      <div ref={chartRef} className="chart-body">
        {renderChart()}
      </div>
    </div>
  );
}
