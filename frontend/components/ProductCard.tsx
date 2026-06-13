"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Hash, Layers, ExternalLink, FileText } from "lucide-react";

interface ProductCardProps {
  product: any;
  schema: any[];
}

type ColType = "numeric" | "categorical" | "datetime" | "text";

function getColType(schema: any[], key: string): ColType {
  const col = schema.find((c) => c.name === key);
  const t = col?.type;
  if (t === "numeric" || t === "categorical" || t === "datetime") return t;
  return "text";
}

function formatValue(value: unknown, type: ColType): string {
  if (value === null || value === undefined) return "—";
  if (type === "numeric" && typeof value === "number") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  if (type === "numeric" && !isNaN(Number(value))) {
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(value);
}

function lockBodyScroll(lock: boolean) {
  if (lock) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.classList.add("modal-open");
    document.body.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : "";
  } else {
    document.body.classList.remove("modal-open");
    document.body.style.paddingRight = "";
  }
}

export default function ProductCard({ product, schema }: ProductCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const closeModal = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    lockBodyScroll(isOpen);
    return () => lockBodyScroll(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeModal]);

  const idCol = schema.find((c) => c.name.toLowerCase().includes("id"))?.name;
  const nameCol = schema.find((c) => c.name.toLowerCase().includes("name"))?.name;

  const id = idCol ? product.data[idCol] : `#${product.row_index}`;
  const name = nameCol ? product.data[nameCol] : `Row ${product.row_index + 1}`;

  const dataEntries = useMemo(
    () =>
      Object.entries(product.data).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      ),
    [product.data]
  );

  const sortedEntries = useMemo(() => {
    const priority: Record<ColType, number> = {
      numeric: 0,
      categorical: 1,
      datetime: 2,
      text: 3,
    };
    const isPriorityKey = (k: string) => k === idCol || k === nameCol;

    return [...dataEntries].sort(([ka], [kb]) => {
      if (isPriorityKey(ka) && !isPriorityKey(kb)) return -1;
      if (!isPriorityKey(ka) && isPriorityKey(kb)) return 1;
      const ta = getColType(schema, ka);
      const tb = getColType(schema, kb);
      return priority[ta] - priority[tb] || ka.localeCompare(kb);
    });
  }, [dataEntries, schema, idCol, nameCol]);

  const typeCounts = useMemo(() => {
    const counts = { numeric: 0, categorical: 0, datetime: 0, text: 0 };
    dataEntries.forEach(([key]) => {
      const t = getColType(schema, key);
      counts[t]++;
    });
    return counts;
  }, [dataEntries, schema]);

  const previewEntries = dataEntries
    .filter(([k]) => k !== idCol && k !== nameCol)
    .slice(0, 4);

  const numericEntries = dataEntries.filter(([k]) => getColType(schema, k) === "numeric");
  const categoricalEntries = dataEntries.filter(([k]) => getColType(schema, k) === "categorical");

  return (
    <>
      <div
        className="card card-hover product-card"
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <div className="product-card-header">
          <div className="product-card-title-block">
            <span className="badge badge-gray product-card-id">
              <Hash size={9} /> {id}
            </span>
            <h3 className="product-card-title">{name}</h3>
          </div>
          <ExternalLink size={14} color="var(--text-muted)" className="product-card-icon" />
        </div>

        {previewEntries.length > 0 && (
          <div className="product-card-chips">
            {previewEntries.map(([key, value]) => (
              <span key={key} className="chip" title={`${key}: ${String(value)}`}>
                <span className="chip-key">{key}:</span>
                {String(value)}
              </span>
            ))}
          </div>
        )}

        <div className="product-card-footer">
          {numericEntries.length > 0 && (
            <span className="product-card-meta">
              <Layers size={11} /> {numericEntries.length} numeric
            </span>
          )}
          {categoricalEntries.length > 0 && (
            <span className="product-card-meta">
              <Layers size={11} /> {categoricalEntries.length} categorical
            </span>
          )}
          <span className="product-card-meta product-card-meta-count">
            {dataEntries.length} fields
          </span>
        </div>
      </div>

      {isOpen &&
        mounted &&
        createPortal(
          <div
            className="modal-overlay"
            onClick={closeModal}
            role="presentation"
          >
            <div
              className="record-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="record-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="record-modal-accent" />

              <header className="record-modal-header">
                <div className="record-modal-header-top">
                  <div>
                    <span className="record-modal-id">
                      <Hash size={11} /> {id}
                    </span>
                    <h2 id="record-modal-title" className="record-modal-title">
                      {name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="record-modal-close"
                    onClick={closeModal}
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="record-modal-meta">
                  <span className="record-modal-meta-pill">
                    <FileText size={12} />
                    {dataEntries.length} fields
                  </span>
                  {typeCounts.numeric > 0 && (
                    <span className="record-modal-meta-pill">
                      <Layers size={12} />
                      {typeCounts.numeric} numeric
                    </span>
                  )}
                  {typeCounts.categorical > 0 && (
                    <span className="record-modal-meta-pill">
                      {typeCounts.categorical} categorical
                    </span>
                  )}
                </div>
              </header>

              <div className="record-modal-body">
                <div className="record-field-grid">
                  {sortedEntries.map(([key, value]) => {
                    const colType = getColType(schema, key);
                    const isLong =
                      String(value).length > 48 ||
                      key === nameCol ||
                      colType === "text";

                    return (
                      <div
                        key={key}
                        className={`record-field record-field--${colType} ${isLong ? "record-field--full" : ""}`}
                      >
                        <div className="record-field-header">
                          <span className="record-field-label" title={key}>
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className={`record-field-type record-field-type--${colType}`}>
                            {colType}
                          </span>
                        </div>
                        <span
                          className={`record-field-value ${colType === "numeric" || key === idCol ? "record-field-value--mono" : ""}`}
                        >
                          {formatValue(value, colType)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <footer className="record-modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                  Close
                </button>
              </footer>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
