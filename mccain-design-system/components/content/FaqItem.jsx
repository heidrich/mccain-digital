import React, { useState } from "react";
export function FaqItem({ q, a, open, defaultOpen = false, onToggle }) {
  const [inner, setInner] = useState(defaultOpen); const isOpen = open == null ? inner : open;
  const toggle = () => { if (onToggle) onToggle(!isOpen); if (open == null) setInner(!inner); };
  return (<div style={{ borderBottom: "1px solid var(--mc-line)", fontFamily: "var(--font-sans)" }}>
    <button type="button" aria-expanded={isOpen} onClick={toggle} style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 0", background: "none", border: 0, cursor: "pointer", textAlign: "left", font: "inherit", fontSize: 17, fontWeight: 600, color: "var(--text-heading)", lineHeight: 1.4 }}>{q}<span aria-hidden="true" style={{ flex: "none", width: 28, height: 28, borderRadius: "50%", background: isOpen ? "var(--accent)" : "var(--mc-action-tint)", color: isOpen ? "#fff" : "var(--accent)", display: "grid", placeItems: "center", transform: isOpen ? "rotate(45deg)" : "none", transition: "transform var(--dur-state) var(--ease-out), background var(--dur-state), color var(--dur-state)" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></span></button>
    <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows var(--dur-state) var(--ease-out)" }}><div style={{ overflow: "hidden" }}><p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.6, color: "var(--text-body)", maxWidth: "70ch" }}>{a}</p></div></div>
  </div>);
}
