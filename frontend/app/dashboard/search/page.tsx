"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import SearchBar from "@/components/SearchBar";
import ProductCard from "@/components/ProductCard";
import Navbar from "@/components/Navbar";
import ExplorerToolbar, {
  getPageNumbers,
  type SortFilterState,
} from "@/components/ExplorerToolbar";
import {
  Loader2,
  Search,
  Rows3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const LIMIT = 20;

const DEFAULT_SORT_FILTER: SortFilterState = {
  sortBy: "row_index",
  sortDir: "asc",
  filterField: "",
  filterValue: "",
  filters: [],
};

function SearchContent() {
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("upload_id");
  const router = useRouter();

  const [schema, setSchema] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortFilter, setSortFilter] = useState<SortFilterState>(DEFAULT_SORT_FILTER);

  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    if (!uploadId) {
      router.push("/");
      return;
    }
    api.getAnalytics(uploadId).then((res) => setSchema(res.schema)).catch(console.error);
  }, [uploadId, router]);

  const loadData = useCallback(async () => {
    if (!uploadId) return;
    setLoading(true);
    try {
      const data = await api.search(uploadId, {
        query,
        page,
        limit: LIMIT,
        sortBy: sortFilter.sortBy,
        sortDir: sortFilter.sortDir,
        filterField: sortFilter.filterField,
        filterValue: sortFilter.filterValue,
        filters: sortFilter.filters,
      });
      setResults(data.results);
      setTotal(data.total);
      setTotalPages(data.total_pages ?? (Math.ceil(data.total / LIMIT) || 0));
    } catch (err) {
      console.error(err);
      setResults([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [uploadId, query, page, sortFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = useCallback((q: string) => {
    if (q !== queryRef.current) {
      setPage(1);
    }
    setQuery(q);
  }, []);

  const handleSortFilterChange = useCallback((next: SortFilterState) => {
    setSortFilter(next);
    setPage(1);
  }, []);

  const pageNumbers = getPageNumbers(page, totalPages);

  if (!uploadId) return null;

  return (
    <>
      <Navbar uploadId={uploadId} />

      <div className="page">
        <header className="page-header animate-up">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "0.75rem" }}>
              <div className="page-icon-wrap" style={{ background: "var(--green-pale)" }}>
                <Search size={24} color="var(--green)" />
              </div>
              <h1 className="page-title">Data Explorer</h1>
            </div>
            <p className="page-subtitle" style={{ marginLeft: "3.75rem" }}>
              Full-text search across all {schema.length} columns in your dataset
            </p>
          </div>
        </header>

        <div className="explorer-search-row animate-up stagger-1">
          <SearchBar onSearch={handleSearch} placeholder="Search across all columns…" />
          <ExplorerToolbar
            uploadId={uploadId}
            schema={schema}
            sortFilter={sortFilter}
            onSortFilterChange={handleSortFilterChange}
          />
        </div>

        {!loading && (
          <div className="results-meta">
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
              <Rows3 size={16} color="var(--text-muted)" />
              <span style={{ fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--text-primary)" }}>{total.toLocaleString()}</strong> result
                {total !== 1 ? "s" : ""}
                {query && (
                  <span style={{ color: "var(--text-muted)" }}>
                    {" "}
                    for &ldquo;<span style={{ color: "var(--blue)" }}>{query}</span>&rdquo;
                  </span>
                )}
                {sortFilter.filters && sortFilter.filters.length > 0 && (
                  <span style={{ color: "var(--text-muted)" }}>
                    {" "}
                    · filtered by {sortFilter.filters.map(f => {
                      const opSymbols: Record<string, string> = {
                        eq: "=",
                        neq: "≠",
                        contains: "contains",
                        gt: ">",
                        lt: "<",
                        gte: "≥",
                        lte: "≤",
                      };
                      return `${f.column} ${opSymbols[f.operator] || f.operator} ${f.value}`;
                    }).join(" & ")}
                  </span>
                )}
              </span>
            </div>
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Page {page} of {totalPages || 1}
            </span>
          </div>
        )}

        {loading && results.length === 0 ? (
          <div className="loading-screen" style={{ minHeight: "40vh" }}>
            <Loader2 size={36} className="animate-spin" color="var(--blue)" />
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: 500 }}>Loading records…</p>
            <div className="loading-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">
              <Search size={24} color="var(--text-muted)" />
            </div>
            <h3 style={{ fontWeight: 800, marginBottom: "0.5rem", fontSize: "1.25rem" }}>No results found</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
              {query || sortFilter.filterValue
                ? "Try adjusting your search or filters."
                : "No records available"}
            </p>
          </div>
        ) : (
          <div className="grid grid-4 explorer-results-grid">
            {loading && (
              <div className="results-overlay">
                <Loader2 size={28} className="animate-spin" color="var(--blue)" />
              </div>
            )}
            {results.map((product, i) => (
              <div key={product._id} className={`animate-up stagger-${Math.min((i % 8) + 1, 8)}`}>
                <ProductCard product={product} schema={schema} />
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination animate-up">
            <button
              type="button"
              className="btn btn-outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} /> Prev
            </button>

            <div className="pagination-pages">
              {pageNumbers[0] > 1 && (
                <>
                  <button
                    type="button"
                    className="btn btn-outline pagination-page"
                    disabled={loading}
                    onClick={() => setPage(1)}
                  >
                    1
                  </button>
                  {pageNumbers[0] > 2 && <span className="pagination-ellipsis">…</span>}
                </>
              )}

              {pageNumbers.map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`btn pagination-page ${pageNum === page ? "btn-outline-blue" : "btn-outline"}`}
                  disabled={loading}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                    <span className="pagination-ellipsis">…</span>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline pagination-page"
                    disabled={loading}
                    onClick={() => setPage(totalPages)}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              className="btn btn-outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-screen">
          <div className="spinner-ring" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}