"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialQuery?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search...",
  initialQuery = "",
}: SearchBarProps) {
  const [value, setValue] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchRef.current(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className={`search-input-wrap ${focused ? "focused" : ""}`} style={{ position: "relative", flex: 1 }}>
      <div
        style={{
          position: "absolute",
          left: "1rem",
          top: "50%",
          transform: "translateY(-50%)",
          color: focused ? "var(--blue)" : "var(--text-muted)",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          transition: "color 0.25s",
        }}
      >
        <Search size={18} />
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="input"
        style={{
          paddingLeft: "3rem",
          paddingRight: value ? "3rem" : "1rem",
          height: "52px",
          fontSize: "0.9375rem",
          borderRadius: "14px",
        }}
      />

      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="animate-fade"
          style={{
            position: "absolute",
            right: "0.875rem",
            top: "50%",
            transform: "translateY(-50%)",
            background: "var(--bg-subtle)",
            border: "none",
            borderRadius: "50%",
            width: 28,
            height: 28,
            cursor: "pointer",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--red-pale)";
            e.currentTarget.style.color = "var(--red)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-subtle)";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
