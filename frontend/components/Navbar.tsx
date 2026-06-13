"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Search,
  ChevronRight,
  UploadCloud,
  Menu,
  X,
} from "lucide-react";

interface NavbarProps {
  uploadId?: string | null;
}

export default function Navbar({ uploadId }: NavbarProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isDashboard =
    pathname.includes("/dashboard") && !pathname.includes("search");
  const isSearch = pathname.includes("search");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const breadcrumb = uploadId ? (
    <div className="navbar-breadcrumb">
      <Link href="/" onClick={closeMenu}>
        Home
      </Link>
      <ChevronRight size={12} aria-hidden />
      <Link
        href={`/dashboard?upload_id=${uploadId}`}
        onClick={closeMenu}
        className={isDashboard ? "navbar-breadcrumb-active" : undefined}
      >
        Dashboard
      </Link>
      {isSearch && (
        <>
          <ChevronRight size={12} aria-hidden />
          <span className="navbar-breadcrumb-active">Explorer</span>
        </>
      )}
    </div>
  ) : null;

  const actions = uploadId ? (
    <>
      <Link
        href={`/dashboard?upload_id=${uploadId}`}
        className={`nav-pill ${isDashboard ? "active" : ""}`}
        onClick={closeMenu}
      >
        <BarChart3 size={15} />
        Dashboard
      </Link>
      <Link
        href={`/dashboard/search?upload_id=${uploadId}`}
        className={`btn btn-primary ${isSearch ? "navbar-cta-active" : ""}`}
        onClick={closeMenu}
      >
        <Search size={15} />
        Explorer
      </Link>
    </>
  ) : (
    <Link href="/#upload" className="btn btn-primary" onClick={closeMenu}>
      <UploadCloud size={15} />
      Upload Data
    </Link>
  );

  return (
    <nav
      className={`navbar ${scrolled ? "scrolled" : ""} ${menuOpen ? "menu-open" : ""}`}
    >
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo-zone navbar-brand-lockup" onClick={closeMenu}>
          <div className="navbar-logo-wide-slot">
            <img
              src="/logo.png"
              alt=""
              className="navbar-company-logo"
              draggable={false}
            />
          </div>

          <div className="navbar-divider navbar-divider-desktop" aria-hidden />

          <span className="brand-name">
            Kine<span>tic</span>
          </span>
        </Link>

        {breadcrumb && (
          <div className="navbar-breadcrumb-desktop">{breadcrumb}</div>
        )}

        <div className="navbar-actions navbar-actions-desktop">{actions}</div>

        <button
          type="button"
          className="navbar-toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen ? "true" : "false"}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        className="navbar-backdrop"
        onClick={closeMenu}
        aria-hidden={!menuOpen}
      />

      <div className={`navbar-drawer ${menuOpen ? "open" : ""}`}>
        {breadcrumb && (
          <div className="navbar-drawer-section">{breadcrumb}</div>
        )}
        <div className="navbar-drawer-actions">{actions}</div>
      </div>
    </nav>
  );
}
