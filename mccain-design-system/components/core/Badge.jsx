import React from "react";
const T = { success: { background: "var(--mc-success-soft)", color: "var(--mc-success-text)" }, accent: { background: "var(--mc-action-tint)", color: "var(--text-accent)" }, neutral: { background: "var(--mc-surface)", color: "var(--mc-navy)", boxShadow: "inset 0 0 0 1px var(--mc-line)" }, dark: { background: "var(--mc-navy)", color: "#fff" } };
export function Badge({ tone = "neutral", dot = false, size = "sm", children, style }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: size === "md" ? "4px 12px" : "3px 9px", borderRadius: 999, fontFamily: "var(--font-sans)", fontSize: size === "md" ? 13 : 12, fontWeight: 600, lineHeight: 1.4, whiteSpace: "nowrap", ...T[tone], ...style }}>{dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone === "dark" ? "var(--mc-success)" : "currentColor" }} />}{children}</span>;
}
