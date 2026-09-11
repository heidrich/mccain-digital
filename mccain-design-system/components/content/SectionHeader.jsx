import React from "react";
export function SectionHeader({ eyebrow, title, desc, onDark = false, as = "h2", style }) {
  const H = as;
  if (onDark) return <div style={{ maxWidth: 820, fontFamily: "var(--font-sans)", ...style }}>{eyebrow && <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".02em", color: "var(--mc-dark-accent)" }}>{eyebrow}</div>}<H style={{ margin: eyebrow ? "14px 0 0" : 0, fontSize: "var(--fs-h2-dark)", lineHeight: 1.25, letterSpacing: "-.02em", fontWeight: 600, color: "#fff", textWrap: "pretty" }}>{title} {desc && <span style={{ color: "var(--mc-dark-muted)", fontWeight: 500 }}>{desc}</span>}</H></div>;
  return <div style={{ maxWidth: 720, fontFamily: "var(--font-sans)", ...style }}>{eyebrow && <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-accent)" }}>{eyebrow}</div>}<H style={{ margin: eyebrow ? "10px 0 0" : 0, fontSize: "var(--fs-h2)", lineHeight: 1.1, letterSpacing: "-.03em", fontWeight: 700, color: "var(--text-heading)", textWrap: "balance" }}>{title}</H>{desc && <p style={{ margin: "16px 0 0", fontSize: 18, lineHeight: 1.6, color: "var(--text-body)", textWrap: "pretty" }}>{desc}</p>}</div>;
}
