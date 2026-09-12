import * as React from "react";
/** @startingPoint section="Content" subtitle="Leistungs-/Projekt-Kachel mit Verlaufsbühne, öffnet ein Modal" viewport="700x600" */
export interface TileProps { title: React.ReactNode; text?: React.ReactNode; /** Zeile über dem Titel, z. B. Badges */ meta?: React.ReactNode; /** Drei Stromfarben für das driftende Farbfeld */ colors?: [string, string, string]; minHeight?: number; /** 26 Desktop, 20 mobil */ padding?: number; /** Macht die Kachel klickbar (Expand-Icon erscheint) */ onClick?: (e: React.SyntheticEvent) => void; /** UI-Mockup, absolut in der Bühne positioniert */ children?: React.ReactNode; style?: React.CSSProperties; }
export declare function Tile(props: TileProps): JSX.Element;
