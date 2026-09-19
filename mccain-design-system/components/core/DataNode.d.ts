import * as React from "react";
export interface DataNodeProps extends React.HTMLAttributes<HTMLSpanElement> { /** Mono-Text wie "LLM → tool_call" oder "TLS 1.3 ✓" */ label: string; /** Farbe des 7-px-Quadrats (Stromfarben) */ color?: string; /** dark = KI-Ereignis (Navy), light = Web/Infra (Weiß) */ tone?: "light" | "dark"; /** aktiv (Navy) – bei Hover auf zugehöriger Kachel */ hot?: boolean; }
export declare function DataNode(props: DataNodeProps): JSX.Element;
