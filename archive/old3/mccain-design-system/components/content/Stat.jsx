import React from "react";
export function Stat({ value, label, onDark = false, gradient, size = "md" }) {
  const big = size === "lg";
  const v = onDark ? { color: "#FF8FB8", background: gradient || "var(--mc-stream-text-1)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block" } : { color: "var(--text-heading)" };
  return <div style={{ fontFamily: "var(--font-sans)" }}><div style={{ fontSize: big ? "var(--fs-stat)" : 26, fontWeight: big ? 600 : 700, letterSpacing: big ? "-.04em" : "-.03em", lineHeight: 1, ...v }}>{value}</div><div style={{ marginTop: big ? 10 : 6, fontSize: big ? 14 : 13, fontWeight: big ? 600 : 400, lineHeight: 1.45, maxWidth: big ? "30ch" : "20ch", color: onDark ? "#fff" : "var(--text-muted)" }}>{label}</div></div>;
}
