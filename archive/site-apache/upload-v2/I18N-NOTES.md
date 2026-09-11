# i18n — English first, German to follow

This homepage refresh is **English-first**. German gets pulled in as a second
step. The groundwork is already in place so that step is a translation job, not
a rebuild.

## What's prepared

Every new copy block added in this refresh carries a `data-i18n` hook:

| Attribute | Where |
|-----------|-------|
| `data-i18n="status.place"` / `status.open` | Nav + footer availability badge |
| `data-i18n="ai.ask.*"` | Ask-an-AI block (eyebrow, title, sub, fine print) |
| `data-i18n-block="ai.ask"` | Ask-an-AI wrapper |
| `data-i18n="footer.*"` | Footer headings + brand blurb |

The hero cycling line, career ticker, services and process copy are the *live*
site's existing English — untouched here — and will get the same `data-i18n`
treatment when German is wired.

## How German should be added (when we get there)

1. Add `data-i18n` hooks to the remaining live-copy blocks (hero sub, services,
   process, contact) — same key scheme (`section.field`).
2. Add `lang` switch: a small `i18n.js` that reads `?lang=de` / `localStorage` /
   `navigator.language`, then swaps text nodes by their `data-i18n` key from a
   `de` dictionary. Keep it dependency-free (no library — house rule).
3. German dictionary lives in one file (`i18n.de.json` or inline in `i18n.js`).
4. `<html lang>` must update with the active language (a11y + SEO).
5. Legal pages (`/legal/*`) and `contact.html` need their own DE variants or
   the same swap mechanism.

Keep the availability badge honest in both languages
(`available for new projects` → `frei für neue Projekte`, **no** slot count).
