"use client";

import { useEffect, useRef, useState } from "react";
import { Filter, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";

export interface SortFilterState {
  sortBy: string;
  sortDir: "asc" | "desc";
  filterField: string;
  filterValue: string;
}

interface ExplorerToolbarProps {
  uploadId: string;
  schema: { name: string; type: string }[];
  sortFilter: SortFilterState;
  onSortFilterChange: (next: SortFilterState) => void;
}

export default function ExplorerToolbar({
  uploadId,
  schema,
  sortFilter,
  onSortFilterChange,
}: ExplorerToolbarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [facetValues, setFacetValues] = useState<string[]>([]);
  const [loadingFacets, setLoadingFacets] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const sortableCols = schema.length > 0 ? schema : [{ name: "row_index", type: "numeric" }];
  const filterableCols = schema;

  const hasActiveFilter = Boolean(sortFilter.filterField && sortFilter.filterValue);
  const hasCustomSort =
    sortFilter.sortBy !== "row_index" || sortFilter.sortDir !== "asc";

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!filterOpen || !sortFilter.filterField || !uploadId) {
      setFacetValues([]);
      return;
    }

    let cancelled = false;
    setLoadingFacets(true);
    api
      .getFacetValues(uploadId, sortFilter.filterField)
      .then((res) => {
        if (!cancelled) setFacetValues(res.values);
      })
      .catch(() => {
        if (!cancelled) setFacetValues([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingFacets(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filterOpen, sortFilter.filterField, uploadId]);

  const applySort = (sortBy: string, sortDir: "asc" | "desc") => {
    onSortFilterChange({ ...sortFilter, sortBy, sortDir });
    setSortOpen(false);
  };

  const applyFilter = () => {
    onSortFilterChange({ ...sortFilter });
    setFilterOpen(false);
  };

  const clearFilter = () => {
    onSortFilterChange({ ...sortFilter, filterField: "", filterValue: "" });
    setFilterOpen(false);
  };

  const dropdownActive = sortOpen || filterOpen;

  return (
    <div className={`explorer-toolbar ${dropdownActive ? "explorer-toolbar-expanded" : ""}`}>
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
          <ChevronDown size={14} className={sortOpen ? "explorer-chevron-open" : ""} />
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

            <p className="explorer-dropdown-title" style={{ marginTop: "0.75rem" }}>
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
            <ChevronDown size={14} className={filterOpen ? "explorer-chevron-open" : ""} />
          </button>

          {filterOpen && (
            <div className="explorer-dropdown explorer-dropdown-wide">
              <p className="explorer-dropdown-title">Filter by column</p>
              <select
                className="input"
                value={sortFilter.filterField}
                onChange={(e) =>
                  onSortFilterChange({
                    ...sortFilter,
                    filterField: e.target.value,
                    filterValue: "",
                  })
                }
              >
                <option value="">Select column…</option>
                {filterableCols.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name.replace(/_/g, " ")} ({c.type})
                  </option>
                ))}
              </select>

              {sortFilter.filterField && (
                <>
                  <p className="explorer-dropdown-title" style={{ marginTop: "0.75rem" }}>
                    Value
                  </p>
                  {facetValues.length > 0 ? (
                    <select
                      className="input"
                      value={sortFilter.filterValue}
                      onChange={(e) =>
                        onSortFilterChange({ ...sortFilter, filterValue: e.target.value })
                      }
                    >
                      <option value="">Select value…</option>
                      {facetValues.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="input"
                      placeholder={loadingFacets ? "Loading values…" : "Enter value"}
                      value={sortFilter.filterValue}
                      onChange={(e) =>
                        onSortFilterChange({ ...sortFilter, filterValue: e.target.value })
                      }
                    />
                  )}
                </>
              )}

              <div className="explorer-dropdown-actions">
                <button type="button" className="btn btn-outline" onClick={clearFilter}>
                  Clear
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={applyFilter}
                  disabled={!sortFilter.filterField || !sortFilter.filterValue}
                >
                  Apply filter
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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

function getPageNumbers(current: number, total: number, maxVisible = 7): number[] {
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
