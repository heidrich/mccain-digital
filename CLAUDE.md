# mccain-digital (Firmenseite)

Globale Regeln aus ~/.claude/CLAUDE.md gelten; diese Datei ergänzt.

- Statische HTML-Seite (pixel-engine), Vercel. Stand und Befehle: `HANDOFF.md`. Quelle sind die Artboards in `mccain-design-system/`; Baukette in `tools/`.
- Bauen: `node tools/prerender.mjs`, dann `node tools/v5build.mjs` (einzelne Seite: `--route /x/`).
- Prüfen: `node tools/verify_site.mjs` ist Pflicht vor jedem Push.
- Platzhalter-Content ist Absicht: Layout/Tech melden, Content-Lücken nicht.
- Vor dem Deploy PageSpeed mobil >= 95; globaler Skill `html-performance` (keine Projektkopie).
- Das Kit für md-cms/Portal entsteht an dieser Site (`mccain-cms/CLAUDE.md`).
