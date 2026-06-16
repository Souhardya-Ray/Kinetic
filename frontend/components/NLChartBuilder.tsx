"use client";

import { useState } from "react";
import {
  Sliders,
  MessageSquare,
  Send,
  Loader2,
  History,
  Plus,
  Trash2,
  ChevronDown,
  BarChart2,
  TrendingUp,
  PieChart,
  ScatterChart,
  Activity,
  Sparkles,
  X,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import ChartRenderer from "./ChartRenderer";

// ── Types ──────────────────────────────────────────────────────────────────

interface SchemaCol {
  name: string;
  type: string; // "numeric" | "categorical" | "datetime" | "text"
}

interface FilterRow {
  column: string;
  operator: string;
  value: string;
}

interface HistoryEntry {
  label: string;
  config: any;
}

interface NLChartBuilderProps {
  uploadId: string;
  schema: SchemaCol[];
}

// ── Constants ──────────────────────────────────────────────────────────────

const CHART_TYPES = [
  { value: "bar",       label: "Bar",       icon: BarChart2   },
  { value: "line",      label: "Line",      icon: TrendingUp  },
  { value: "combo",     label: "Combo",     icon: Layers      },
  { value: "pie",       label: "Pie",       icon: PieChart    },
  { value: "scatter",   label: "Scatter",   icon: ScatterChart },
  { value: "histogram", label: "Histogram", icon: Activity    },
];

const AGGREGATIONS = [
  { value: "sum",   label: "Sum" },
  { value: "mean",  label: "Average" },
  { value: "count", label: "Count" },
  { value: "min",   label: "Min" },
  { value: "max",   label: "Max" },
  { value: "none",  label: "None (raw)" },
];

const OPERATORS = [
  { value: "eq",       label: "equals" },
  { value: "neq",      label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "gt",       label: "greater than" },
  { value: "lt",       label: "less than" },
  { value: "gte",      label: "≥ (gte)" },
  { value: "lte",      label: "≤ (lte)" },
];

// ── Inline style helpers ───────────────────────────────────────────────────

const s = {
  tabBar: {
    display: "flex",
    gap: "0.375rem",
    background: "rgba(15,23,42,0.04)",
    borderRadius: "12px",
    padding: "0.3rem",
    marginBottom: "2rem",
  } as React.CSSProperties,

  tab: (active: boolean): React.CSSProperties => ({
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "0.6rem 1rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 600,
    transition: "all 0.2s ease",
    background: active ? "#ffffff" : "transparent",
    color: active ? "var(--blue)" : "var(--text-secondary)",
    boxShadow: active ? "0 2px 8px rgba(15,23,42,0.1)" : "none",
  }),

  fieldLabel: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: "0.45rem",
    display: "block",
  },

  select: {
    width: "100%",
    padding: "0.6rem 0.875rem",
    borderRadius: "10px",
    border: "1.5px solid rgba(15,23,42,0.12)",
    background: "#fff",
    fontSize: "0.875rem",
    color: "var(--text-primary)",
    cursor: "pointer",
    outline: "none",
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.75rem center",
    paddingRight: "2rem",
    transition: "border-color 0.15s",
  },

  input: {
    width: "100%",
    padding: "0.6rem 0.875rem",
    borderRadius: "10px",
    border: "1.5px solid rgba(15,23,42,0.12)",
    background: "#fff",
    fontSize: "0.875rem",
    color: "var(--text-primary)",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.15s",
  },

  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginBottom: "1.25rem",
  } as React.CSSProperties,

  filterRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr auto",
    gap: "0.625rem",
    alignItems: "end",
    marginBottom: "0.625rem",
  } as React.CSSProperties,

  yChipContainer: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
    marginTop: "0.5rem",
  },

  yChip: (active: boolean): React.CSSProperties => ({
    padding: "0.35rem 0.75rem",
    borderRadius: "100px",
    border: `1.5px solid ${active ? "var(--blue)" : "rgba(15,23,42,0.12)"}`,
    background: active ? "var(--blue-pale)" : "#fff",
    color: active ? "var(--blue)" : "var(--text-secondary)",
    fontSize: "0.8125rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    userSelect: "none" as const,
  }),
};

// ── Visual Query Builder ───────────────────────────────────────────────────

function VisualQueryBuilder({
  uploadId,
  schema,
  onResult,
  isLoading,
  setIsLoading,
  setError,
}: {
  uploadId: string;
  schema: SchemaCol[];
  onResult: (label: string, config: any) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
}) {
  const numericCols   = schema.filter((c) => c.type === "numeric");
  const allCols       = schema;

  const [chartType,    setChartType]    = useState("bar");
  const [xColumn,      setXColumn]      = useState(allCols[0]?.name || "");
  const [yColumns,     setYColumns]     = useState<string[]>(numericCols[0] ? [numericCols[0].name] : []);
  const [aggregation,  setAggregation]  = useState("sum");
  const [filters,      setFilters]      = useState<FilterRow[]>([]);
  const [sortBy,       setSortBy]       = useState("value");
  const [sortDir,      setSortDir]      = useState("desc");
  const [limit,        setLimit]        = useState(10);
  const [title,        setTitle]        = useState("");

  const toggleY = (col: string) => {
    setYColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const addFilter = () =>
    setFilters((f) => [...f, { column: allCols[0]?.name || "", operator: "eq", value: "" }]);

  const removeFilter = (i: number) =>
    setFilters((f) => f.filter((_, idx) => idx !== i));

  const updateFilter = (i: number, patch: Partial<FilterRow>) =>
    setFilters((f) => f.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!xColumn) return;

    // Combo requires at least 2 y-columns
    if (chartType === "combo" && yColumns.length < 2) {
      setError("Combo chart requires at least 2 Y-axis columns. Select more columns below.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        chart_type:  chartType,
        x_column:    xColumn,
        y_columns:   yColumns.length > 0 ? yColumns : undefined,
        aggregation,
        filters: filters.filter((f) => f.column && f.value),
        sort_by:  sortBy,
        sort_dir: sortDir,
        limit,
        title: title.trim() || undefined,
      };
      const config = await api.customQuery(uploadId, payload);
      const label =
        title.trim() ||
        (yColumns.length === 1
          ? `${aggregation} of ${yColumns[0]} by ${xColumn}`
          : yColumns.length > 1
          ? `${yColumns.join(", ")} by ${xColumn}`
          : `Count by ${xColumn}`);
      onResult(label, config);
    } catch (err: any) {
      setError(err.message || "Query failed. Please check your column selection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Determine which columns to show as Y options
  const yOptions =
    chartType === "histogram" || chartType === "pie"
      ? numericCols
      : numericCols;

  return (
    <form onSubmit={handleSubmit}>
      {/* Chart Type */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={s.fieldLabel}>Chart Type</label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {CHART_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setChartType(value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 0.9rem",
                borderRadius: "100px",
                border: `1.5px solid ${chartType === value ? "var(--blue)" : "rgba(15,23,42,0.12)"}`,
                background: chartType === value ? "var(--blue)" : "#fff",
                color: chartType === value ? "#fff" : "var(--text-secondary)",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* X + Y Columns */}
      <div style={s.formRow}>
        <div>
          <label style={s.fieldLabel}>X Axis / Group By</label>
          <select
            value={xColumn}
            onChange={(e) => setXColumn(e.target.value)}
            style={s.select}
            required
          >
            <option value="">— select column —</option>
            {allCols.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={s.fieldLabel}>Aggregation</label>
          <select
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value)}
            style={s.select}
          >
            {AGGREGATIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Y Columns — multi-select chips */}
      {chartType !== "histogram" && (
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={s.fieldLabel}>
            Y Axis — Values
            <span style={{ marginLeft: "0.5rem", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
              {chartType === "combo"
                ? "(select ≥2 columns — large-scale → bars, small-scale → line)"
                : "(click to toggle; select multiple for multi-series)"}
            </span>
          </label>
          {yOptions.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
              No numeric columns in schema.
            </p>
          ) : (
            <div style={s.yChipContainer}>
              {yOptions.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => toggleY(c.name)}
                  style={s.yChip(yColumns.includes(c.name))}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Combo helper banner */}
          {chartType === "combo" && (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.625rem 0.875rem",
                borderRadius: "10px",
                background: yColumns.length >= 2 ? "#f0fdf4" : "#fffbeb",
                border: `1px solid ${yColumns.length >= 2 ? "#86efac" : "#fcd34d"}`,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
                color: yColumns.length >= 2 ? "#15803d" : "#92400e",
                fontWeight: 500,
              }}
            >
              <Layers size={13} style={{ flexShrink: 0 }} />
              {yColumns.length >= 2
                ? `${yColumns.length} series selected — the frontend will auto-assign bars vs line based on scale.`
                : `Select at least 2 columns. The largest-magnitude columns become bars; smaller ones become the line overlay.`}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.625rem" }}>
          <label style={{ ...s.fieldLabel, margin: 0 }}>Filters</label>
          <button
            type="button"
            onClick={addFilter}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.3rem 0.75rem",
              borderRadius: "8px",
              border: "1.5px solid rgba(15,23,42,0.12)",
              background: "#fff",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <Plus size={12} /> Add filter
          </button>
        </div>

        {filters.length === 0 && (
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
            No filters — showing all rows.
          </p>
        )}

        {filters.map((f, i) => (
          <div key={i} style={s.filterRow}>
            <div>
              {i === 0 && <label style={s.fieldLabel}>Column</label>}
              <select
                value={f.column}
                onChange={(e) => updateFilter(i, { column: e.target.value })}
                style={s.select}
              >
                {allCols.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              {i === 0 && <label style={s.fieldLabel}>Operator</label>}
              <select
                value={f.operator}
                onChange={(e) => updateFilter(i, { operator: e.target.value })}
                style={s.select}
              >
                {OPERATORS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              {i === 0 && <label style={s.fieldLabel}>Value</label>}
              <input
                type="text"
                placeholder="value…"
                value={f.value}
                onChange={(e) => updateFilter(i, { value: e.target.value })}
                style={s.input}
              />
            </div>
            <div style={{ paddingTop: i === 0 ? "1.4rem" : 0 }}>
              <button
                type="button"
                onClick={() => removeFilter(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  borderRadius: "8px",
                  border: "1.5px solid rgba(220,38,38,0.25)",
                  background: "var(--red-pale)",
                  color: "var(--red)",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sort + Limit + Title */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <label style={s.fieldLabel}>Sort By</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={s.select}>
            <option value="value">Value</option>
            <option value="name">Name</option>
            <option value="none">None</option>
          </select>
        </div>
        <div>
          <label style={s.fieldLabel}>Direction</label>
          <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} style={s.select}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
        <div>
          <label style={s.fieldLabel}>Limit (0 = all)</label>
          <input
            type="number"
            min={0}
            max={1000}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={s.input}
          />
        </div>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <label style={s.fieldLabel}>Custom Title (optional)</label>
        <input
          type="text"
          placeholder="Leave blank for auto-generated title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={s.input}
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={isLoading || !xColumn}
        style={{ width: "100%", height: "48px", fontSize: "0.9375rem" }}
      >
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <BarChart2 size={18} />}
        {isLoading ? "Building chart…" : "Generate Chart"}
      </button>
    </form>
  );
}

// ── Text Query ─────────────────────────────────────────────────────────────

function TextQuery({
  uploadId,
  schema,
  onResult,
  isLoading,
  setIsLoading,
  setError,
}: {
  uploadId: string;
  schema: SchemaCol[];
  onResult: (label: string, config: any) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
}) {
  const [query, setQuery] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setIsLoading(true);
    setError(null);
    try {
      const config = await api.nlQuery(uploadId, q);
      onResult(q, config);
      setQuery("");
    } catch (err: any) {
      setError(err.message || "Failed to generate chart. Try rephrasing.");
    } finally {
      setIsLoading(false);
    }
  };

  const numCols = schema.filter((c) => c.type === "numeric").slice(0, 3).map((c) => c.name);
  const catCols = schema.filter((c) => c.type === "categorical").slice(0, 3).map((c) => c.name);
  const suggestions: string[] = [];
  if (numCols.length && catCols.length) {
    suggestions.push(`Average ${numCols[0]} by ${catCols[0]}`);
    suggestions.push(`Total ${numCols[0]} per ${catCols[1] || catCols[0]}`);
  }
  if (numCols.length >= 2) suggestions.push(`Scatter of ${numCols[0]} vs ${numCols[1]}`);
  if (catCols.length) suggestions.push(`Pie chart of ${catCols[0]}`);
  // Combo suggestion — shown when there are 2+ numeric columns
  if (numCols.length >= 2 && catCols.length) {
    suggestions.push(`Combo chart of ${numCols[0]} and ${numCols[1]} by ${catCols[0]}`);
  }
  const chips = suggestions.slice(0, 5);

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <input
          type="text"
          className="input"
          placeholder='e.g. "Show average price by category as a bar chart"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
          style={{ flex: 1, height: "48px", fontSize: "0.9375rem" }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading || !query.trim()}
          style={{ height: "48px", padding: "0 1.5rem", flexShrink: 0 }}
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {isLoading ? "Thinking…" : "Ask"}
        </button>
      </div>

      {chips.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 500 }}>Try:</span>
          {chips.map((chip, i) => (
            <button
              key={i}
              type="button"
              className="suggestion-chip"
              onClick={() => setQuery(chip)}
            >
              <Sparkles size={11} />
              {chip}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function NLChartBuilder({ uploadId, schema }: NLChartBuilderProps) {
  const [activeTab,  setActiveTab]  = useState<"visual" | "text">("visual");
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [history,    setHistory]    = useState<HistoryEntry[]>([]);
  const [activeHist, setActiveHist] = useState<number | null>(null);

  const onResult = (label: string, config: any) => {
    setHistory((h) => [{ label, config }, ...h]);
    setActiveHist(0);
    setError(null);
  };

  return (
    <div className="card nl-builder-card animate-up" style={{ marginBottom: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.75rem" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "14px",
            background: "linear-gradient(135deg, var(--blue-pale), #eff6ff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(29,78,216,0.12)",
          }}
        >
          <Sliders size={24} color="var(--blue)" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
            Chart Builder
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0, marginTop: "0.2rem" }}>
            Build precise charts visually, or ask in plain English
          </p>
        </div>
        {history.length > 0 && (
          <div className="badge badge-blue" style={{ flexShrink: 0 }}>
            <History size={10} /> {history.length} chart{history.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={s.tabBar}>
        <button
          type="button"
          style={s.tab(activeTab === "visual")}
          onClick={() => setActiveTab("visual")}
        >
          <Sliders size={14} /> Visual Builder
        </button>
        <button
          type="button"
          style={s.tab(activeTab === "text")}
          onClick={() => setActiveTab("text")}
        >
          <MessageSquare size={14} /> Text Query
        </button>
      </div>

      {/* Active tab content */}
      <div key={activeTab} className="animate-up" style={{ animationDuration: "0.3s" }}>
        {activeTab === "visual" ? (
          <VisualQueryBuilder
            uploadId={uploadId}
            schema={schema}
            onResult={onResult}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setError={setError}
          />
        ) : (
          <TextQuery
            uploadId={uploadId}
            schema={schema}
            onResult={onResult}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setError={setError}
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="animate-up"
          style={{
            marginTop: "1.25rem",
            padding: "0.875rem 1.125rem",
            background: "var(--red-pale)",
            border: "1px solid var(--red)",
            borderRadius: "10px",
            color: "var(--red)",
            fontSize: "0.875rem",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", flexShrink: 0 }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <>
          <div className="divider" style={{ marginTop: "2rem" }} />

          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
              Chart History
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {history.map((entry, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveHist(i)}
                  className={`btn ${activeHist === i ? "btn-outline-blue" : "btn-outline"}`}
                  style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem", borderRadius: "100px", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {i === 0 && <Sparkles size={11} />}
                  {entry.label.length > 34 ? entry.label.slice(0, 34) + "…" : entry.label}
                </button>
              ))}
            </div>
          </div>

          {activeHist !== null && history[activeHist] && (
            <div key={activeHist} className="animate-up" style={{ animationDuration: "0.35s" }}>
              <ChartRenderer config={history[activeHist].config} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
