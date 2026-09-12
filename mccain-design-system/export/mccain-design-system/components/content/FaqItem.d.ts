import * as React from "react";
export interface FaqItemProps { q: React.ReactNode; a: React.ReactNode; /** kontrolliert */ open?: boolean; defaultOpen?: boolean; onToggle?: (open: boolean) => void; }
export declare function FaqItem(props: FaqItemProps): JSX.Element;
