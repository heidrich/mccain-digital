import React, { useState } from "react";
export function Input({ as = "input", onDark = false, label, hint, style, ...rest }) {
  const [focus, setFocus] = useState(false);
  const Tag = as;
  const base = onDark ? { background: "rgba(255,255,255,.06)", color: "#fff", border: "1px solid " + (focus ? "var(--accent)" : "rgba(255,255,255,.14)") } : { background: "#fff", color: "var(--mc-navy)", border: "1px solid " + (focus ? "var(--accent)" : "var(--mc-line)") };
  const field = <Tag {...rest} onFocus={(e) => { setFocus(true); rest.onFocus && rest.onFocus(e); }} onBlur={(e) => { setFocus(false); rest.onBlur && rest.onBlur(e); }} style={{ display: "block", width: "100%", boxSizing: "border-box", minHeight: as === "textarea" ? 120 : 48, height: as === "textarea" ? undefined : 48, padding: as === "textarea" ? "12px 16px" : "0 16px", borderRadius: "var(--r-input)", fontFamily: "var(--font-sans)", fontSize: 15, outline: "none", resize: "vertical", boxShadow: focus ? "var(--focus-ring)" : "none", transition: "border-color var(--dur-micro), box-shadow var(--dur-micro)", ...base, ...style }} />;
  if (!label && !hint) return field;
  return <label style={{ display: "grid", gap: 6, fontFamily: "var(--font-sans)" }}>{label && <span style={{ fontSize: 13, fontWeight: 600, color: onDark ? "var(--mc-dark-text-2)" : "var(--mc-navy)" }}>{label}</span>}{field}{hint && <span style={{ fontSize: 12, color: onDark ? "var(--mc-dark-muted)" : "var(--text-muted)" }}>{hint}</span>}</label>;
}
