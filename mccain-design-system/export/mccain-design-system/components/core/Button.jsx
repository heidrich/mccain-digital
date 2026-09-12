import React, { useEffect, useRef, useState } from "react";
const SIZES = { sm: [40, 16, 14], md: [44, 20, 15], lg: [48, 24, 16] };
const CHEV = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>;
export function Button({ variant = "primary", size = "md", onDark = false, chevron = false, pixel = false, disabled = false, children, style, ...rest }) {
  const ref = useRef(null); const [hover, setHover] = useState(false);
  useEffect(() => { if (pixel && ref.current && window.PixelFX) { try { window.PixelFX.button(ref.current); } catch (e) {} } }, [pixel]);
  const [h, px, fs] = SIZES[size] || SIZES.md;
  const V = {
    primary: [{ background: "var(--accent)", color: "#fff" }, { background: "var(--accent-hover)", transform: "translateY(-1px)" }],
    dark: [{ background: "var(--mc-navy)", color: "#fff" }, { background: "#1B3A5F", transform: "translateY(-1px)" }],
    onGradient: [{ background: "#fff", color: "var(--mc-navy)" }, { transform: "translateY(-1px)" }],
    ghost: onDark ? [{ background: "transparent", color: "#fff", boxShadow: "inset 0 0 0 1px rgba(143,161,230,.5)" }, { boxShadow: "inset 0 0 0 1px #fff", background: "rgba(255,255,255,.06)" }] : [{ background: "#fff", color: "var(--text-accent)", boxShadow: "inset 0 0 0 1px rgba(99,91,255,.35)" }, { boxShadow: "inset 0 0 0 1px var(--accent)", color: "var(--accent)" }],
    outline: [{ background: "#fff", color: "var(--mc-navy)", boxShadow: "inset 0 0 0 1px rgba(10,37,64,.16)" }, { boxShadow: "inset 0 0 0 1px rgba(10,37,64,.4)" }],
  };
  const [base, hov] = V[variant] || V.primary;
  return (<button ref={ref} type="button" disabled={disabled} className={pixel ? "pxbtn" : undefined} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, height: h, padding: "0 " + (chevron ? px - 8 : px) + "px 0 " + px + "px", borderRadius: 999, border: 0, fontFamily: "var(--font-sans)", fontSize: fs, fontWeight: 600, lineHeight: 1, whiteSpace: "nowrap", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, transition: "background var(--dur-micro), color var(--dur-micro), box-shadow var(--dur-micro), transform var(--dur-micro)", ...base, ...(hover && !disabled ? hov : null), ...style }} {...rest}>{children}{chevron && CHEV}</button>);
}
