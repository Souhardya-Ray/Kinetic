import Link from "next/link";
import { Database, Mail, GitBranch, Link2 } from "lucide-react";

export default function HomeFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <Link href="/" className="site-footer-logo">
              <span className="brand-mark">
                <Database size={16} color="white" />
              </span>
              <span>
                Kine<span>tic</span>
              </span>
            </Link>
            <p className="site-footer-tagline">
              Material management analytics powered by intelligent spreadsheet ingestion,
              visual dashboards, and natural-language queries.
            </p>
            <div className="site-footer-social">
              <a href="mailto:support@kinetic.app" className="site-footer-social-link" aria-label="Email">
                <Mail size={18} />
              </a>
              <a href="https://github.com" className="site-footer-social-link" aria-label="GitHub" target="_blank" rel="noopener noreferrer">
                <GitBranch size={18} />
              </a>
              <a href="https://linkedin.com" className="site-footer-social-link" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                <Link2 size={18} />
              </a>
            </div>
          </div>

          <div className="site-footer-col">
            <h4>Product</h4>
            <ul>
              <li><Link href="/#upload">Upload Data</Link></li>
              <li><Link href="/#features">Features</Link></li>
              <li><Link href="/#how-it-works">How It Works</Link></li>
              <li><Link href="/#datasets">Recent Datasets</Link></li>
            </ul>
          </div>

          <div className="site-footer-col">
            <h4>Capabilities</h4>
            <ul>
              <li>CSV & Excel import</li>
              <li>Auto-generated charts</li>
              <li>Full-text data search</li>
              <li>AI chart builder</li>
            </ul>
          </div>

          <div className="site-footer-col">
            <h4>Technology</h4>
            <ul>
              <li>MongoDB Atlas</li>
              <li>Claude AI</li>
              <li>Next.js & FastAPI</li>
              <li>Recharts visualization</li>
            </ul>
          </div>
        </div>

        <div className="site-footer-bottom">
          <p>© {year} Kinetic. All rights reserved.</p>
          <div className="site-footer-bottom-links">
            <span>Privacy</span>
            <span className="site-footer-dot">·</span>
            <span>Terms</span>
            <span className="site-footer-dot">·</span>
            <span>Material Management System</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
