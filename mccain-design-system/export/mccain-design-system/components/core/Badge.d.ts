import * as React from "react";
export interface BadgeProps { /** success = Live/Status, indigo = Quelle/Meta, neutral = Stack-Chip, dark = Navy-Pill mit grünem Punkt */ tone?: "success" | "indigo" | "neutral" | "dark"; dot?: boolean; size?: "sm" | "md"; children?: React.ReactNode; style?: React.CSSProperties; }
export declare function Badge(props: BadgeProps): JSX.Element;
