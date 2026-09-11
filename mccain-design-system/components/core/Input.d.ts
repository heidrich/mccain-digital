import * as React from "react";
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { /** input oder textarea */ as?: "input" | "textarea"; /** Konsolen-Variante auf dunkler Fläche */ onDark?: boolean; label?: React.ReactNode; hint?: React.ReactNode; }
export declare function Input(props: InputProps): JSX.Element;
