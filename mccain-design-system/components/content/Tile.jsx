import React, { useState } from "react";
const EXPAND = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="m21 3-7 7" /><path d="m3 21 7-7" /></svg>;
export function Tile({ title, text, meta, colors = ["#FF5A8C", "#FFB46B", "#C05CFF"], minHeight = 560, padding = 26, onClick, children, style }) {
  const [hover, setHover] = useState(false);
  const [a, b, c] = colors;
  return (<article role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick} onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); } } : undefined} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    style={{ position: "relative", display: "flex", flexDirection: "column", minHeight, height: "100%", background: "#fff", borderRadius: "var(--r-card)", boxShadow: hover ? "var(--shadow-card-hover)" : "var(--shadow-card)", overflow: "hidden", cursor: onClick ? "pointer" : "default", transform: hover ? "translateY(-4px)" : "none", transition: "transform var(--dur-lift) var(--ease-out), box-shadow var(--dur-lift)", fontFamily: "var(--font-sans)", ...style }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: padding + "px " + padding + "px 0" }}>
      <div>{meta}<h3 style={{ margin: meta ? "12px 0 0" : 0, fontSize: "var(--fs-h3)", lineHeight: 1.15, letterSpacing: "-.025em", fontWeight: 600, color: "var(--text-heading)", textWrap: "balance" }}>{title}</h3></div>
      {onClick && <span aria-hidden="true" style={{ flex: "none", width: 40, height: 40, borderRadius: 8, background: hover ? "var(--accent)" : "var(--mc-indigo-tint)", color: hover ? "#fff" : "var(--accent)", display: "grid", placeItems: "center", transition: "background var(--dur-state), color var(--dur-state)" }}>{EXPAND}</span>}
    </div>
    {text && <p style={{ margin: 0, padding: "12px " + padding + "px 0", fontSize: 15, lineHeight: 1.55, color: "var(--text-body)", textWrap: "pretty" }}>{text}</p>}
    <div style={{ position: "relative", flex: 1, minHeight: 280, marginTop: 24, overflow: "hidden" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: "-40%", filter: "blur(36px)", opacity: .94 }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(42% 46% at 30% 36%, " + a + " 0%, transparent 100%), radial-gradient(46% 50% at 74% 28%, " + b + " 0%, transparent 100%), linear-gradient(135deg, " + a + ", " + c + ")", animation: "mc-flow-a var(--flow-a) ease-in-out infinite" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(48% 52% at 66% 72%, " + c + " 0%, transparent 100%), radial-gradient(36% 40% at 22% 78%, " + b + " 0%, transparent 100%)", animation: "mc-flow-b var(--flow-b) ease-in-out infinite", mixBlendMode: "screen" }} />
      </div>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0) 42%)" }} />
      <div style={{ position: "absolute", inset: 0, transform: hover ? "scale(1.02)" : "none", transition: "transform var(--dur-lift) var(--ease-out)" }}>{children}</div>
    </div>
  </article>);
}
