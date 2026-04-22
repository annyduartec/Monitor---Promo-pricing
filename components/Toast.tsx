"use client";

import { useEffect, useState } from "react";

export type ToastVariant = "error" | "success" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { bg: string; border: string; color: string }
> = {
  error: {
    bg: "var(--lose-bg)",
    border: "var(--lose)",
    color: "var(--lose)",
  },
  success: {
    bg: "var(--win-bg)",
    border: "var(--win)",
    color: "var(--win)",
  },
  info: {
    bg: "var(--accent-bg)",
    border: "var(--accent)",
    color: "var(--accent)",
  },
};

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const s = VARIANT_STYLES[toast.variant];

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        borderRadius: 8,
        padding: "12px 16px",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        minWidth: 280,
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <span>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: "none",
          border: "none",
          color: s.color,
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          flexShrink: 0,
          opacity: 0.7,
        }}
      >
        ×
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
