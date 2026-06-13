"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Zap,
  X,
} from "lucide-react";

export default function FileUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setError(null);
      setIsUploading(true);

      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + Math.random() * 12, 85));
      }, 300);

      try {
        const result = await api.uploadFile(file);
        clearInterval(progressInterval);
        setUploadProgress(100);
        setTimeout(() => {
          router.push(`/dashboard?upload_id=${result.upload_id}`);
        }, 500);
      } catch (err: any) {
        clearInterval(progressInterval);
        setError(err.message || "Failed to upload file. Please try again.");
        setIsUploading(false);
        setUploadProgress(0);
        setSelectedFile(null);
      }
    },
    [router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? "active" : ""}`}
        style={{ pointerEvents: isUploading ? "none" : "auto" }}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                background: "var(--blue-pale)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pulse-scale 2s ease-in-out infinite",
                boxShadow: "0 0 0 8px var(--blue-glow)",
              }}
            >
              <UploadCloud size={34} color="var(--blue)" />
            </div>

            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 800, fontSize: "1.25rem", marginBottom: "0.375rem", color: "var(--text-primary)" }}>
                {uploadProgress < 50 ? "Uploading…" : uploadProgress < 90 ? "Analysing data…" : "Almost done…"}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>{selectedFile?.name}</p>
            </div>

            <div style={{ width: "100%", maxWidth: 380 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 500 }}>Progress</span>
                <span style={{ fontSize: "0.8125rem", color: "var(--blue)", fontWeight: 700 }}>
                  {Math.round(uploadProgress)}%
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>

            <div className="loading-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", position: "relative", zIndex: 1 }}>
            <div className={`dropzone-icon ${isDragActive ? "active" : ""}`}>
              {isDragActive ? (
                <UploadCloud size={40} color="var(--blue)" />
              ) : (
                <FileSpreadsheet size={40} color="var(--text-secondary)" />
              )}
            </div>

            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  marginBottom: "0.5rem",
                  color: isDragActive ? "var(--blue)" : "var(--text-primary)",
                  transition: "color 0.3s",
                }}
              >
                {isDragActive ? "Release to upload" : "Drop your spreadsheet here"}
              </p>
              <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
                or click to browse — supports <strong>.csv</strong>, <strong>.xlsx</strong>
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.25rem" }}>
              {[
                { icon: <Zap size={14} />, label: "Instant detection", color: "var(--blue)" },
                { icon: <CheckCircle2 size={14} />, label: "Auto charts", color: "var(--red)" },
                { icon: <CheckCircle2 size={14} />, label: "AI search", color: "var(--green)" },
              ].map((f, i) => (
                <span key={i} className="badge badge-gray animate-up" style={{ padding: "0.4rem 0.875rem", fontSize: "0.75rem", animationDelay: `${0.2 + i * 0.06}s` }}>
                  <span style={{ color: f.color, display: "flex" }}>{f.icon}</span> {f.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          className="animate-up"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            background: "var(--red-pale)",
            border: "1px solid var(--red)",
            borderRadius: "12px",
            color: "var(--red)",
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Upload failed</p>
            <p style={{ fontSize: "0.875rem", opacity: 0.9, marginTop: "0.25rem" }}>{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.7, flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
