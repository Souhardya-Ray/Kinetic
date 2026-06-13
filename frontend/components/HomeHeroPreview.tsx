"use client";

import { BarChart3, TrendingUp, Search, Sparkles } from "lucide-react";

const MOCK_BARS = [42, 68, 55, 82, 61, 74, 48, 90, 58, 76];

export default function HomeHeroPreview() {
  return (
    <div className="hero-preview" aria-hidden>
      <div className="hero-preview-glow" />
      <div className="hero-preview-window">
        <div className="hero-preview-titlebar">
          <span className="hero-preview-dot" />
          <span className="hero-preview-dot" />
          <span className="hero-preview-dot" />
          <span className="hero-preview-title">Analytics Dashboard</span>
        </div>

        <div className="hero-preview-body">
          <div className="hero-preview-kpis">
            {[
              { label: "Total Records", value: "12.4k", trend: "+8.2%", icon: TrendingUp },
              { label: "Categories", value: "24", trend: "Live", icon: BarChart3 },
              { label: "Queries", value: "156", trend: "AI", icon: Sparkles },
            ].map((kpi, i) => (
              <div key={i} className="hero-preview-kpi">
                <kpi.icon size={14} className="hero-preview-kpi-icon" />
                <span className="hero-preview-kpi-label">{kpi.label}</span>
                <span className="hero-preview-kpi-value">{kpi.value}</span>
                <span className="hero-preview-kpi-trend">{kpi.trend}</span>
              </div>
            ))}
          </div>

          <div className="hero-preview-chart">
            <div className="hero-preview-chart-header">
              <span>Revenue by Category</span>
              <Search size={12} />
            </div>
            <div className="hero-preview-bars">
              {MOCK_BARS.map((h, i) => (
                <div
                  key={i}
                  className="hero-preview-bar"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 0.06}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
