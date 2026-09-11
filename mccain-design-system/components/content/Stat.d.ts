import * as React from "react";
export interface StatProps { value: React.ReactNode; label: React.ReactNode; /** Dunkle Sektion: Wert als Verlaufstext */ onDark?: boolean; /** CSS-Verlauf für onDark, Standard var(--mc-stream-text-1) */ gradient?: string; /** md 26 px (Modal-Kennzahl), lg clamp(40,4.4vw,64) */ size?: "md" | "lg"; }
export declare function Stat(props: StatProps): JSX.Element;
