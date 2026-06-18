"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Filter, SlidersHorizontal, X, ChevronDown, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

export interface SortFilterState {
  sortBy: string;
  sortDir: "asc" | "desc";
  filterField: string;
  filterValue: string;
  filters?: { column: string; operator: string; value: string }[];
}

interface ExplorerToolbarProps {
  uploadId: string;
  schema: { name: string; type: string }[];
  sortFilter: SortFilterState;
  onSortFilterChange: (next: SortFilterState) => void;
}

// Operators that need a free-text / number input instead of a facet dropdown
const COMPARISON_OPS = new Set(["gt", "lt", "gte", "lte", "neq"]);

export default function ExplorerToolbar({
  uploadId,
  schema,
  sortFilter,
  onSortFilterChange,
}: ExplorerToolbarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<
    { column: string; operator: string; value: string }[]
  >([]);

  // Per-column cache: column name → distinct values fetched from /facets API
  const [facetCache, setFacetCache] = useState<Record<string, string[]>>({});
  const [loadingFacets, setLoadingFacets] = useState<Record<string, boolean>>({});

  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const sortableCols =
    schema.length > 0 ? schema : [{ name: "row_index", type: "numeric" }];
  const filterableCols = schema;

  const hasActiveFilter = Boolean(
    (sortFilter.filterField && sortFilter.filterValue) ||
      (sortFilter.filters && sortFilter.filters.length > 0)
  );
  const hasCustomSort =
    sortFilter.sortBy !== "row_index" || sortFilter.sortDir !== "asc";

  /* ── Facet fetching ──────────────────────────────────────────────────── */
  const fetchFacets = useCallback(
    async (col: string) => {
      if (!col || col in facetCache) return; // already cached (even if empty)
      setLoadingFacets((prev) => ({ ...prev, [col]: true }));
      try {
        const res = await api.getFacetValues(uploadId, col);
        setFacetCache((prev) => ({ ...prev, [col]: res.values }));
      } catch {
        setFacetCache((prev) => ({ ...prev, [col]: [] }));
      } finally {
        setLoadingFacets((prev) => ({ ...prev, [col]: false }));
      }
    },
    [uploadId, facetCache]
  );

  /* ── Close dropdowns on outside click ───────────────────────────────── */
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node))
        setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFilterOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  /* ── Sync local filters when panel opens & pre-fetch facets ─────────── */
  useEffect(() => {
    if (!filterOpen) return;
    const initial =
      sortFilter.filters && sortFilter.filters.length > 0
        ? [...sortFilter.filters]
        : [
            {
              column: filterableCols[0]?.name || "",
              operator: filterableCols[0]?.type === "numeric" ? "eq" : "contains",
              value: "",
            },
          ];
    setLocalFilters(initial);
    // Pre-fetch facets for each column already in the list
    initial.forEach((f) => {
      if (f.column) fetchFacets(f.column);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOpen]);

  /* ── Filter row helpers ──────────────────────────────────────────────── */
  const addLocalFilter = () => {
    const col = filterableCols[0]?.name || "";
    const op = filterableCols[0]?.type === "numeric" ? "eq" : "contains";
    setLocalFilters((prev) => [...prev, { column: col, operator: op, value: "" }]);
    if (col) fetchFacets(col);
  };

  const removeLocalFilter = (index: number) => {
    setLocalFilters((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateLocalFilter = (
    index: number,
    patch: Partial<{ column: string; operator: string; value: string }>
  ) => {
    setLocalFilters((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
    if (patch.column) fetchFacets(patch.column);
  };

  /* ── Sort helpers ────────────────────────────────────────────────────── */
  const applySort = (sortBy: string, sortDir: "asc" | "desc") => {
    onSortFilterChange({ ...sortFilter, sortBy, sortDir });
    setSortOpen(false);
  };

  /* ── Filter apply / clear ────────────────────────────────────────────── */
  const applyFilter = () => {
    const active = localFilters.filter((f) => f.column && f.value !== "");
    onSortFilterChange({ ...sortFilter, filters: active });
    setFilterOpen(false);
  };

  const clearFilter = () => {
    onSortFilterChange({ ...sortFilter, filters: [] });
    setFilterOpen(false);
  };

  const dropdownActive = sortOpen || filterOpen;

  return (
    <div
      className={`explorer-toolbar ${dropdownActive ? "explorer-toolbar-expanded" : ""}`}
    >
      {/* ── SORT ── */}
      <div className="explorer-dropdown-wrap" ref={sortRef}>
        <button
          type="button"
          className={`btn btn-outline explorer-tool-btn ${hasCustomSort ? "explorer-tool-btn-active" : ""}`}
          onClick={() => {
            setSortOpen((o) => !o);
            setFilterOpen(false);
          }}
          aria-expanded={sortOpen}
        >
          <SlidersHorizontal size={15} />
          Sort
          {hasCustomSort && <span className="explorer-active-dot" />}
          <ChevronDown
            size={14}
            className={sortOpen ? "explorer-chevron-open" : ""}
          />
        </button>

        {sortOpen && (
          <div className="explorer-dropdown">
            <p className="explorer-dropdown-title">Sort by</p>
            <select
              className="input"
              value={sortFilter.sortBy}
              onChange={(e) =>
                onSortFilterChange({ ...sortFilter, sortBy: e.target.value })
              }
            >
              <option value="row_index">Row index</option>
              {sortableCols.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name.replace(/_/g, " ")} ({c.type})
                </option>
              ))}
            </select>

            <p
              className="explorer-dropdown-title"
              style={{ marginTop: "0.75rem" }}
            >
              Direction
            </p>
            <div className="explorer-sort-dir">
              <button
                type="button"
                className={`btn ${sortFilter.sortDir === "asc" ? "btn-outline-blue" : "btn-outline"}`}
                onClick={() => applySort(sortFilter.sortBy, "asc")}
              >
                Ascending
              </button>
              <button
                type="button"
                className={`btn ${sortFilter.sortDir === "desc" ? "btn-outline-blue" : "btn-outline"}`}
                onClick={() => applySort(sortFilter.sortBy, "desc")}
              >
                Descending
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "0.75rem" }}
              onClick={() => applySort(sortFilter.sortBy, sortFilter.sortDir)}
            >
              Apply sort
            </button>
          </div>
        )}
      </div>

      {/* ── FILTER ── */}
      {filterableCols.length > 0 && (
        <div className="explorer-dropdown-wrap" ref={filterRef}>
          <button
            type="button"
            className={`btn btn-outline explorer-tool-btn ${hasActiveFilter ? "explorer-tool-btn-active" : ""}`}
            onClick={() => {
              setFilterOpen((o) => !o);
              setSortOpen(false);
            }}
            aria-expanded={filterOpen}
          >
            <Filter size={15} />
            Filter
            {hasActiveFilter && <span className="explorer-active-dot" />}
            <ChevronDown
              size={14}
              className={filterOpen ? "explorer-chevron-open" : ""}
            />
          </button>

          {filterOpen && (
            <div
              className="explorer-dropdown explorer-dropdown-wide"
              style={{ minWidth: "480px" }}
            >
              {/* Header row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <p className="explorer-dropdown-title" style={{ margin: 0 }}>
                  Active Filters
                </p>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{
                    padding: "0.25rem 0.5rem",
                    height: "auto",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                  onClick={addLocalFilter}
                >
                  <Plus size={12} /> Add Filter
                </button>
              </div>

              {/* Empty state */}
              {localFilters.length === 0 ? (
                <div
                  style={{
                    padding: "1.5rem 0",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "0.875rem",
                  }}
                >
                  No active filters. Click &ldquo;Add Filter&rdquo; to start.
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: "260px",
                    overflowY: "auto",
                    marginBottom: "1rem",
                    paddingRight: "4px",
                  }}
                >
                  {localFilters.map((filter, index) => {
                    const selectedCol = schema.find(
                      (c) => c.name === filter.column
                    );
                    const isNumeric = selectedCol?.type === "numeric";

                    // eq / contains → facet dropdown; gt / lt / gte / lte / neq → free input
                    const useDropdown = !COMPARISON_OPS.has(filter.operator);
                    const facets = facetCache[filter.column] ?? [];
                    const isFetchingFacets =
                      loadingFacets[filter.column] ?? false;

                    const operators = isNumeric
                      ? [
                          { value: "eq",  label: "= (equals)" },
                          { value: "neq", label: "≠ (not equals)" },
                          { value: "gt",  label: "> (greater than)" },
                          { value: "lt",  label: "< (less than)" },
                          { value: "gte", label: "≥ (greater or equal)" },
                          { value: "lte", label: "≤ (less or equal)" },
                        ]
                      : [
                          { value: "contains", label: "contains" },
                          { value: "eq",       label: "= (equals)" },
                          { value: "neq",      label: "≠ (not equals)" },
                        ];

                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {/* Column selector */}
                        <select
                          className="input"
                          style={{
                            flex: 1.8,
                            minWidth: "120px",
                            height: "38px",
                            padding: "0 0.5rem",
                          }}
                          value={filter.column}
                          onChange={(e) => {
                            const colName = e.target.value;
                            const col = schema.find((c) => c.name === colName);
                            const defaultOp =
                              col?.type === "numeric" ? "eq" : "contains";
                            updateLocalFilter(index, {
                              column: colName,
                              operator: defaultOp,
                              value: "",
                            });
                          }}
                        >
                          {filterableCols.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>

                        {/* Operator selector */}
                        <select
                          className="input"
                          style={{
                            flex: 1.2,
                            minWidth: "90px",
                            height: "38px",
                            padding: "0 0.5rem",
                          }}
                          value={filter.operator}
                          onChange={(e) =>
                            updateLocalFilter(index, {
                              operator: e.target.value,
                              value: "", // reset value when operator changes
                            })
                          }
                        >
                          {operators.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>

                        {/* Value — dropdown for eq/contains, text/number for comparisons */}
                        {useDropdown ? (
                          <select
                            className="input"
                            style={{
                              flex: 1.8,
                              minWidth: "100px",
                              height: "38px",
                              padding: "0 0.5rem",
                              color: filter.value ? "inherit" : "var(--text-muted)",
                            }}
                            value={filter.value}
                            onChange={(e) =>
                              updateLocalFilter(index, { value: e.target.value })
                            }
                            disabled={isFetchingFacets}
                          >
                            <option value="" disabled>
                              {isFetchingFacets ? "Loading…" : "Select value…"}
                            </option>
                            {facets.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={isNumeric ? "number" : "text"}
                            className="input"
                            style={{
                              flex: 1.8,
                              minWidth: "100px",
                              height: "38px",
                            }}
                            placeholder={isNumeric ? "number…" : "value…"}
                            value={filter.value}
                            onChange={(e) =>
                              updateLocalFilter(index, { value: e.target.value })
                            }
                          />
                        )}

                        {/* Delete row */}
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{
                            padding: "0",
                            width: "38px",
                            height: "38px",
                            color: "var(--red)",
                            borderColor: "var(--border-mid)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                          onClick={() => removeLocalFilter(index)}
                          title="Remove filter"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer actions */}
              <div
                className="explorer-dropdown-actions"
                style={{
                  borderTop: "1px solid var(--border-mid)",
                  paddingTop: "0.75rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={clearFilter}
                >
                  Clear All
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={applyFilter}
                  disabled={localFilters.some(
                    (f) => !f.column || f.value === ""
                  )}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RESET ALL ── */}
      {(hasActiveFilter || hasCustomSort) && (
        <button
          type="button"
          className="btn btn-outline explorer-clear-all"
          onClick={() =>
            onSortFilterChange({
              sortBy: "row_index",
              sortDir: "asc",
              filterField: "",
              filterValue: "",
              filters: [],
            })
          }
        >
          <X size={14} />
          Reset
        </button>
      )}
    </div>
  );
}

function getPageNumbers(
  current: number,
  total: number,
  maxVisible = 7
): number[] {
  if (total <= 1) return total === 0 ? [] : [1];
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export { getPageNumbers };