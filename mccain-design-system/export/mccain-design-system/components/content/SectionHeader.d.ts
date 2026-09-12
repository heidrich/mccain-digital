import * as React from "react";
export interface SectionHeaderProps { eyebrow?: React.ReactNode; title: React.ReactNode; desc?: React.ReactNode; /** Dunkle Sektion: Titel weiß, Beschreibung als gedämpfter Nachsatz in derselben Zeile */ onDark?: boolean; as?: "h1" | "h2" | "h3"; style?: React.CSSProperties; }
export declare function SectionHeader(props: SectionHeaderProps): JSX.Element;
