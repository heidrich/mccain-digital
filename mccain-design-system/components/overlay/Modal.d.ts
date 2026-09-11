import * as React from "react";
/** @startingPoint section="Overlay" subtitle="Großes Detail-Modal, mobil als Bottom-Sheet, gestaffelter Inhalt" viewport="1180x700" */
export interface ModalProps { open: boolean; onClose?: () => void; /** z. B. "Leistung · KI-Tools" */ kicker?: React.ReactNode; title: React.ReactNode; lead?: React.ReactNode; /** Buttons unter dem Lead */ actions?: React.ReactNode; /** rechte Spalte, z. B. Checkliste */ aside?: React.ReactNode; /** Bühne (Verlauf + Mockup), 300–500 px hoch */ stage?: React.ReactNode; /** weitere Abschnitte (Anwendungsfälle, Ablauf, FAQ) */ children?: React.ReactNode; closeLabel?: string; /** unterhalb: Bottom-Sheet (Standard 960) */ sheetBreakpoint?: number; }
export declare function Modal(props: ModalProps): JSX.Element | null;
