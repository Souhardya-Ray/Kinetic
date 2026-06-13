"use client";
import HomeFooter from "@/components/HomeFooter";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import KPICard from "@/components/KPICard";
import ChartRenderer from "@/components/ChartRenderer";
import NLChartBuilder from "@/components/NLChartBuilder";
import Navbar from "@/components/Navbar";
import {
  Search,
  AlertTriangle,
  Home,
  BarChart3,
  TrendingUp,
  Layers,
  FileSpreadsheet,
} from "lucide-react";

function DashboardContent() {
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("upload_id");
  const router = useRouter();

  const [data, setData] = useState<{ charts: any[]; schema: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uploadId) {
      router.push("/");
      return;
    }
    api.getAnalytics(uploadId)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load analytics");
        setLoading(false);
      });
  }, [uploadId, router]);

  if (loading) {
    return (
      <>
        <Navbar uploadId={uploadId} />
        <div className="loading-screen">
          <div style={{ position: "relative" }}>
            <div className="spinner-ring" />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BarChart3 size={22} color="var(--blue)" />
            </div>
          </div>
          <div className="animate-up">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.375rem", letterSpacing: "-0.02em" }}>
              Building your dashboard
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Analysing schema, generating charts…</p>
            <div className="loading-dots" style={{ justifyContent: "center", marginTop: "1rem" }}>
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="grid grid-4 animate-up stagger-2" style={{ width: "100%", maxWidth: "960px" }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div className="skeleton" style={{ height: 12, width: "60%" }} />
                <div className="skeleton" style={{ height: 40, width: "80%" }} />
                <div className="skeleton" style={{ height: 10, width: "40%" }} />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Navbar uploadId={uploadId} />
        <div className="page" style={{ paddingTop: "4rem" }}>
          <div className="card empty-state" style={{ maxWidth: "480px", margin: "0 auto" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--red-pale)",
                border: "1px solid var(--red)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <AlertTriangle size={28} color="var(--red)" />
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>Failed to load dashboard</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "2rem" }}>{error}</p>
            <Link href="/" className="btn btn-primary" style={{ width: "100%" }}>
              <Home size={15} /> Go Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  const kpiCharts = data.charts.filter((c) => c.type === "kpi");
  const otherCharts = data.charts.filter((c) => c.type !== "kpi");
  const numericCols = data.schema.filter((c) => c.type === "numeric").length;
  const catCols = data.schema.filter((c) => c.type === "categorical").length;

  return (
    <>
      <Navbar uploadId={uploadId} />

      <div className="page">
        <header className="page-header animate-up">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "0.75rem" }}>
              <div className="page-icon-wrap" style={{ background: "var(--blue-pale)" }}>
                <BarChart3 size={24} color="var(--blue)" />
              </div>
              <h1 className="page-title">Analytics Dashboard</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginLeft: "3.75rem", flexWrap: "wrap" }}>
              <span className="badge badge-gray">
                <Layers size={9} /> {data.schema.length} columns
              </span>
              <span className="badge badge-blue">
                <TrendingUp size={9} /> {numericCols} numeric
              </span>
              <span className="badge badge-yellow">{catCols} categorical</span>
            </div>
          </div>

          <Link href={`/dashboard/search?upload_id=${uploadId}`} className="btn btn-primary">
            <Search size={16} />
            Data Explorer
          </Link>
        </header>

        {kpiCharts.length > 0 && kpiCharts[0].data?.length > 0 && (
          <section className="animate-up stagger-1" style={{ marginBottom: "3rem" }}>
            <div className="section-label">
              <TrendingUp size={14} /> Key Metrics
            </div>
            <div className="grid grid-4">
              {kpiCharts[0].data.map((kpi: any, i: number) => (
                <KPICard key={i} label={kpi.label} value={kpi.value} mean={kpi.mean} index={i} />
              ))}
            </div>
          </section>
        )}

        {otherCharts.length > 0 && (
          <section className="animate-up stagger-2" style={{ marginBottom: "3rem" }}>
            <div className="section-label">
              <BarChart3 size={14} /> Auto-generated Insights
            </div>
            <div className="grid grid-2">
              {otherCharts.map((chart, i) => (
                <div key={i} className={`animate-up stagger-${Math.min(i + 1, 8)}`}>
                  <ChartRenderer config={chart} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="animate-up stagger-3" style={{ marginBottom: "3rem" }}>
          <div className="section-label">
            <FileSpreadsheet size={14} /> Schema Overview
          </div>
          <div className="card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              {data.schema.map((col: any, i: number) => {
                const typeClass =
                  col.type === "numeric"
                    ? "badge-blue"
                    : col.type === "categorical"
                    ? "badge-yellow"
                    : col.type === "datetime"
                    ? "badge-green"
                    : "badge-gray";

                return (
                  <div
                    key={col.name}
                    className="schema-chip"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {col.name}
                    </span>
                    <span className={`badge ${typeClass}`}>{col.type}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <NLChartBuilder uploadId={uploadId as string} schema={data.schema} />
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-screen">
          <div className="spinner-ring" />
        </div>
      }
    >
      <DashboardContent />
      <HomeFooter />
    </Suspense>
  );
}
