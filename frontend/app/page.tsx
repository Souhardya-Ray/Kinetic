"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import FileUploader from "@/components/FileUploader";
import Navbar from "@/components/Navbar";
import HomeFooter from "@/components/HomeFooter";
import HomeHeroPreview from "@/components/HomeHeroPreview";
import {
  BarChart3,
  Clock,
  FileSpreadsheet,
  Rows3,
  ArrowRight,
  CheckCircle2,
  Zap,
  Brain,
  ShieldCheck,
  Upload,
  Search,
  Sparkles,
  Database,
  LineChart,
  Table2,
  ChevronDown,
} from "lucide-react";

export default function Home() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUploads()
      .then((data) => {
        setUploads(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalRows = uploads.reduce((sum, u) => sum + (u.row_count || 0), 0);
    const active = uploads.filter((u) => u.is_active).length;
    return {
      datasets: uploads.length,
      totalRows,
      active,
      chartTypes: 5,
    };
  }, [uploads]);

  const features = [
    {
      icon: <Zap size={20} />,
      color: "var(--blue)",
      bg: "var(--blue-pale)",
      title: "Instant Parsing",
      desc: "Upload CSV or Excel — schema, types, and column mapping detected automatically in seconds.",
    },
    {
      icon: <BarChart3 size={20} />,
      color: "var(--red)",
      bg: "var(--red-pale)",
      title: "Auto-Generated Charts",
      desc: "Bar, line, scatter, pie, and histogram views built from your data without manual configuration.",
    },
    {
      icon: <Brain size={20} />,
      color: "var(--yellow)",
      bg: "var(--yellow-pale)",
      title: "AI Chart Builder",
      desc: "Describe what you want in plain English. Claude turns questions into live, interactive visualizations.",
    },
    {
      icon: <Search size={20} />,
      color: "var(--green)",
      bg: "var(--green-pale)",
      title: "Data Explorer",
      desc: "Full-text search across every column. Browse records, inspect fields, and paginate large datasets.",
    },
    {
      icon: <ShieldCheck size={20} />,
      color: "#7c3aed",
      bg: "#ede9fe",
      title: "Schema-Agnostic",
      desc: "No fixed templates. Works with inventory, procurement, BOMs, or any material-management spreadsheet.",
    },
    {
      icon: <Database size={20} />,
      color: "#0891b2",
      bg: "#cffafe",
      title: "MongoDB Atlas Storage",
      desc: "Datasets persist in the cloud with fast indexing for analytics queries and search at scale.",
    },
  ];

  const steps = [
    {
      num: 1,
      title: "Upload your file",
      desc: "Drag and drop a .csv or .xlsx file. Kinertic validates structure and ingests rows into MongoDB Atlas.",
    },
    {
      num: 2,
      title: "Explore insights",
      desc: "KPIs, charts, and schema overview are generated instantly based on numeric and categorical columns.",
    },
    {
      num: 3,
      title: "Query with AI",
      desc: "Use natural language to build custom charts, or search records across your entire dataset.",
    },
  ];

  const scrollToUpload = () => {
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="home">
      <Navbar />

      <main className="home-main">
        {/* Hero */}
        <section className="home-hero">
          <div className="home-hero-copy animate-up">
            <div className="home-hero-badge">
              <Zap size={12} /> MongoDB Atlas + Claude AI
            </div>

            <h1 className="home-hero-title">
              Material data, turned into{" "}
              <span className="home-hero-accent">actionable intelligence</span>
            </h1>

            <p className="home-hero-desc">
              Kinetic is a professional analytics platform for material
              management teams. Upload spreadsheets, get instant dashboards,
              searchable records, and AI-powered chart generation — no BI setup
              required.
            </p>

            <div className="home-hero-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={scrollToUpload}
              >
                <Upload size={16} />
                Upload Spreadsheet
              </button>
              <a href="#how-it-works" className="btn btn-outline">
                See how it works
                <ChevronDown size={16} />
              </a>
            </div>

            <div className="home-hero-metrics">
              <div className="home-hero-metric">
                <strong>{stats.chartTypes}+</strong>
                <span>Chart types</span>
              </div>
              <div className="home-hero-metric">
                <strong>&lt; 30s</strong>
                <span>To first dashboard</span>
              </div>
              <div className="home-hero-metric">
                <strong>100%</strong>
                <span>Schema-agnostic</span>
              </div>
            </div>
          </div>

          <div className="animate-up stagger-2">
            <HomeHeroPreview />
          </div>
        </section>

        {/* Upload */}
        <section
          id="upload"
          className="home-upload-section animate-up stagger-3"
        >
          <div className="home-upload-panel">
            <div className="home-upload-header">
              <h2>Start with your data</h2>
              <p>
                Drop a CSV or Excel file below. We&apos;ll parse columns, store
                records, and open your analytics dashboard automatically.
              </p>
            </div>
            <FileUploader />
          </div>
        </section>

        {/* Live stats */}
        <section className="home-stats-strip">
          {[
            {
              icon: <FileSpreadsheet size={22} color="var(--blue)" />,
              bg: "var(--blue-pale)",
              value: loading ? "—" : stats.datasets.toLocaleString(),
              label: "Datasets uploaded",
            },
            {
              icon: <Rows3 size={22} color="var(--green)" />,
              bg: "var(--green-pale)",
              value: loading ? "—" : stats.totalRows.toLocaleString(),
              label: "Total rows processed",
            },
            {
              icon: <LineChart size={22} color="var(--red)" />,
              bg: "var(--red-pale)",
              value: stats.chartTypes.toString(),
              label: "Visualization types",
            },
            {
              icon: <CheckCircle2 size={22} color="var(--yellow)" />,
              bg: "var(--yellow-pale)",
              value: loading ? "—" : stats.active.toString(),
              label: "Active datasets",
            },
          ].map((s, i) => (
            <div
              key={i}
              className={`home-stat-card animate-up stagger-${i + 1}`}
            >
              <div className="home-stat-icon" style={{ background: s.bg }}>
                {s.icon}
              </div>
              <div>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section id="how-it-works" className="home-section">
          <div className="home-section-header animate-up">
            <div
              className="section-label"
              style={{ justifyContent: "center", marginBottom: "1rem" }}
            >
              Workflow
            </div>
            <h2>From spreadsheet to insights in three steps</h2>
            <p>
              A streamlined pipeline designed for procurement, inventory, and
              operations teams who need answers fast — not another complex BI
              tool.
            </p>
          </div>

          <div className="home-steps">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className={`home-step animate-up stagger-${i + 1}`}
              >
                <div className="home-step-num">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="home-section">
          <div className="home-section-header animate-up">
            <div
              className="section-label"
              style={{ justifyContent: "center", marginBottom: "1rem" }}
            >
              Platform
            </div>
            <h2>Everything you need for material analytics</h2>
            <p>
              Built for real-world spreadsheets — messy headers, mixed types,
              and large row counts included.
            </p>
          </div>

          <div className="home-features-grid">
            {features.map((f, i) => (
              <div
                key={i}
                className={`home-feature-card animate-up stagger-${Math.min(i + 1, 8)}`}
              >
                <div
                  className="feature-icon"
                  style={{ color: f.color, background: f.bg }}
                >
                  {f.icon}
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="home-tech-row animate-up stagger-4">
            {[
              "CSV",
              "XLSX",
              "MongoDB Atlas",
              "Claude AI",
              "Recharts",
              "FastAPI",
              "Next.js",
            ].map((tech) => (
              <span key={tech} className="home-tech-pill">
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Recent datasets */}
        <section id="datasets" className="home-section">
          <div className="home-section-header animate-up">
            <div
              className="section-label"
              style={{ justifyContent: "center", marginBottom: "1rem" }}
            >
              <Clock size={12} /> Your data
            </div>
            <h2>Recent datasets</h2>
            <p>
              Pick up where you left off — open any uploaded file in the
              analytics dashboard.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card" style={{ padding: "1.5rem" }}>
                  <div
                    className="skeleton"
                    style={{
                      height: 48,
                      width: 48,
                      borderRadius: 12,
                      marginBottom: "1rem",
                    }}
                  />
                  <div
                    className="skeleton"
                    style={{ height: 16, width: "70%", marginBottom: "0.5rem" }}
                  />
                  <div
                    className="skeleton"
                    style={{ height: 12, width: "40%" }}
                  />
                </div>
              ))}
            </div>
          ) : uploads.length > 0 ? (
            <div className="grid grid-3">
              {uploads.map((upload, i) => (
                <div
                  key={upload._id}
                  className={`card upload-card card-hover ${upload.is_active ? "card-blue" : ""} animate-up stagger-${Math.min(i + 1, 8)}`}
                >
                  {upload.is_active && (
                    <div
                      style={{
                        position: "absolute",
                        top: "1.25rem",
                        right: "1.25rem",
                      }}
                    >
                      <span className="badge badge-green">
                        <CheckCircle2 size={10} /> Active
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "1rem",
                    }}
                  >
                    <div
                      className="upload-icon home-stat-icon"
                      style={{ background: "var(--blue-pale)" }}
                    >
                      <FileSpreadsheet size={22} color="var(--blue)" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          fontWeight: 700,
                          fontSize: "1rem",
                          letterSpacing: "-0.01em",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {upload.filename}
                      </p>
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--text-muted)",
                          marginTop: "0.2rem",
                        }}
                      >
                        {new Date(upload.uploaded_at).toLocaleDateString(
                          undefined,
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "1.5rem",
                      padding: "1rem 0",
                      borderTop: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <p
                        className="stat-number"
                        style={{ fontSize: "1.35rem" }}
                      >
                        {upload.row_count.toLocaleString()}
                      </p>
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        <Rows3 size={12} /> rows indexed
                      </p>
                    </div>
                    <div style={{ marginLeft: "auto", textAlign: "right" }}>
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        <Table2
                          size={12}
                          style={{
                            display: "inline",
                            verticalAlign: -2,
                            marginRight: 4,
                          }}
                        />
                        Ready to explore
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard?upload_id=${upload._id}`}
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                  >
                    <BarChart3 size={16} />
                    Open Dashboard
                    <ArrowRight size={16} style={{ marginLeft: "auto" }} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="home-datasets-empty animate-up">
              <div className="empty-state-icon">
                <FileSpreadsheet size={28} color="var(--text-muted)" />
              </div>
              <h3>No datasets yet</h3>
              <p>
                Upload your first spreadsheet to see it listed here with row
                counts and quick access.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={scrollToUpload}
              >
                <Upload size={16} />
                Upload your first file
              </button>
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="home-cta animate-up">
          <h2>Ready to modernize your material analytics?</h2>
          <p>
            Join teams using Kinetic to turn procurement spreadsheets into
            searchable databases and executive-ready dashboards.
          </p>
          <div className="home-cta-actions">
            <button
              type="button"
              className="btn btn-cta-light"
              onClick={scrollToUpload}
            >
              <Sparkles size={16} />
              Get started free
            </button>
            <a href="#features" className="btn btn-cta-ghost">
              Explore features
            </a>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
