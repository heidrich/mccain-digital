import React from "react";
export function DataNode({ label, color = "#5FC3FF", tone = "light", hot = false, style, ...rest }) {
  const look = hot ? { background: "var(--accent)", color: "#fff", boxShadow: "var(--shadow-node-hot)" } : tone === "dark" ? { background: "var(--mc-navy)", color: "#fff", boxShadow: "var(--shadow-node)" } : { background: "rgba(255,255,255,.94)", color: "var(--mc-navy)", boxShadow: "0 0 0 1px var(--mc-line), var(--shadow-node)" };
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 9px", borderRadius: "var(--r-chip)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", transition: "box-shadow var(--dur-state), background var(--dur-state), color var(--dur-state)", ...look, ...style }} {...rest}><span style={{ width: 7, height: 7, borderRadius: 2, background: color }} />{label}</span>;
}
