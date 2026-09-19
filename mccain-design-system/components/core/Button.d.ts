import * as React from "react";
/** @startingPoint section="Core" subtitle="Pill-Button: primary, ghost, dark, outline, onGradient" viewport="700x200" */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = Navy (auf Dunkel Himmel mit Navy-Schrift), ghost = Hairline (auf dunkel mit onDark), dark = Navy, outline = neutrale Hairline, onGradient = Weiß auf Hero-Verlauf */
  variant?: "primary" | "ghost" | "dark" | "outline" | "onGradient";
  /** sm 40 · md 44 · lg 48 px */
  size?: "sm" | "md" | "lg";
  /** Ghost-Variante auf dunkler Fläche */
  onDark?: boolean;
  /** Chevron rechts (Primär-CTA-Konvention) */
  chevron?: boolean;
  /** PixelFX.button() anwenden – benötigt assets/pixel-engine.js und die .pxbtn-Regeln */
  pixel?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
