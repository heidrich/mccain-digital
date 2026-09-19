import React, { useEffect, useState } from "react";
const X = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
export function Modal({ open, onClose, kicker, title, lead, actions, aside, stage, children, closeLabel = "Schließen", sheetBreakpoint = 960 }) {
  const [shown, setShown] = useState(false); const [mobile, setMobile] = useState(typeof window !== "undefined" && window.innerWidth < sheetBreakpoint);
  useEffect(() => { if (!open) { setShown(false); return; } const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true))); const onKey = (e) => { if (e.key === "Escape" && onClose) onClose(); }; const onRs = () => setMobile(window.innerWidth < sheetBreakpoint); window.addEventListener("keydown", onKey); window.addEventListener("resize", onRs); const prev = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { cancelAnimationFrame(r); window.removeEventListener("keydown", onKey); window.removeEventListener("resize", onRs); document.body.style.overflow = prev; }; }, [open]);
  if (!open) return null;
  const stg = (i) => ({ opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(18px)", transition: "opacity .5s var(--ease-out) " + (0.12 + i * 0.08) + "s, transform .6s var(--ease-out) " + (0.12 + i * 0.08) + "s" });
  return (<div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, overflowY: "auto", overscrollBehavior: "contain", padding: mobile ? "56px 0 0" : "clamp(12px,3vw,40px) clamp(12px,3vw,40px) clamp(40px,6vw,80px)", background: "rgba(10,37,64,.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", opacity: shown ? 1 : 0, transition: "opacity .3s", fontFamily: "var(--font-sans)" }}>
    <div role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: "var(--modal-max)", margin: "0 auto", minHeight: mobile ? "calc(100vh - 56px)" : 0, background: "#fff", borderRadius: mobile ? "20px 20px 0 0" : "var(--r-modal)", boxShadow: "var(--shadow-modal)", color: "var(--mc-navy)", transform: shown ? "none" : mobile ? "translateY(100vh)" : "translateY(28px) scale(.985)", opacity: shown ? 1 : 0, transition: "transform var(--dur-sheet) var(--ease-out), opacity .35s" }}>
      {mobile && <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 2, background: "#D5DCE6", margin: "10px auto 0" }} />}
      <button type="button" onClick={onClose} aria-label={closeLabel} style={{ position: mobile ? "sticky" : "absolute", top: mobile ? 10 : 22, right: mobile ? 12 : 22, marginLeft: "auto", marginRight: mobile ? 12 : 0, marginBottom: mobile ? -44 : 0, zIndex: 2, width: 44, height: 44, border: 0, borderRadius: 8, background: "var(--mc-action-tint)", color: "var(--accent)", display: "grid", placeItems: "center", cursor: "pointer" }}>{X}</button>
      <div style={{ padding: mobile ? "16px 20px 40px" : "clamp(28px,4vw,56px) clamp(22px,4.5vw,64px) clamp(32px,4vw,56px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.1fr .9fr", gap: "clamp(24px,4vw,64px)", alignItems: "start" }}>
          <div style={{ paddingRight: mobile ? 0 : "clamp(0px,3vw,40px)", ...stg(0) }}>
            {kicker && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-accent)" }}>{kicker}</div>}
            <h3 style={{ margin: "8px 0 0", fontSize: "var(--fs-modal)", lineHeight: 1.08, letterSpacing: "-.03em", fontWeight: 700, textWrap: "balance" }}>{title}</h3>
            {lead && <p style={{ margin: "18px 0 0", fontSize: "clamp(16px,1.25vw,18px)", lineHeight: 1.6, color: "var(--text-body)", textWrap: "pretty" }}>{lead}</p>}
            {actions && <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26 }}>{actions}</div>}
          </div>
          {aside && <div style={{ marginTop: mobile ? 0 : "clamp(0px,2vw,44px)", ...stg(1) }}>{aside}</div>}
        </div>
        {stage && <div style={{ position: "relative", marginTop: "clamp(28px,4vw,52px)", height: mobile ? 300 : "clamp(300px, 42vw, 500px)", borderRadius: 16, overflow: "hidden", background: "var(--mc-surface)", ...stg(2) }}>{stage}</div>}
        {children}
      </div>
    </div>
  </div>);
}
