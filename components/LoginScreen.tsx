"use client";

import { useState, type FormEvent } from "react";
import type { Translation } from "@/lib/translations";

interface LoginScreenProps {
  onLogin: () => void;
  t: Translation;
}

export default function LoginScreen({ onLogin, t }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(false);
  const [focused, setFocused]   = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password === process.env.NEXT_PUBLIC_MONITOR_PASSWORD) {
      sessionStorage.setItem("monitor-auth", "true");
      onLogin();
    } else {
      setError(true);
      setPassword("");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "44px 40px",
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 8px var(--accent)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "var(--muted)",
              textTransform: "uppercase",
            }}
          >
            Airtm
          </span>
        </div>

        {/* Title */}
        <h1
          className="brand-title"
          style={{
            fontSize: 20,
            color: "var(--text)",
            margin: "0 0 6px",
            lineHeight: 1.2,
          }}
        >
          Promo Pricing Monitor
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 13,
            color: "var(--muted)",
            margin: "0 0 28px",
            lineHeight: 1.4,
          }}
        >
          {t.loginSubtitle}
        </p>

        {/* Password input */}
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          placeholder={t.loginPasswordPlaceholder}
          autoFocus
          autoComplete="current-password"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            padding: "10px 14px",
            fontSize: 13,
            background: "var(--surface)",
            border: `1px solid ${error ? "var(--lose)" : focused ? "var(--accent)" : "var(--border)"}`,
            borderRadius: 7,
            color: "var(--text)",
            outline: "none",
            marginBottom: error ? 8 : 20,
            transition: "border-color 0.15s",
          }}
        />

        {/* Error */}
        {error && (
          <p
            style={{
              fontSize: 12,
              color: "var(--lose)",
              margin: "0 0 16px",
            }}
          >
            {t.loginError}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          style={{
            padding: "10px",
            fontSize: 13,
            fontWeight: 600,
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 9999,
            cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.opacity = "0.85")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
          }
        >
          {t.loginButton}
        </button>
      </form>
    </div>
  );
}
