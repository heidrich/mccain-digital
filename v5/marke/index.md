# mccain digital brand

> Das Zeichen von McCain Digital: Konstruktion, Fassungen, Farbe, Typografie, Icons und Bewegung – mit jeder Markendatei zum Herunterladen.

Quelle: https://mccain-digital.com/marke/
Sprache: de

01

## Construction

Four numbers, and anyone on the team can reproduce the mark. No letter, no figure — a rule on a grid.

128 px

64 px

40 px

32 px

24 px

16 px

Below 40 px the rule drops the distant dust so the tile stays crisp; below 16 px the plate stands alone. Clear space all around: a quarter of the edge — nothing touches the plate, not even the wordmark. Smallest tile: 16 px on screen, 6 mm in print.

02

## Versions

The default is the free mark without a plate — lighter, and exactly right on the website, in documents and on social. The plate stays where a ground is needed: app icon, favicon, avatar.

Dark

Navy plate, gradient. The primary version.

Light

White plate with a hairline, for dark grounds and paper.

Single colour

White on indigo. One ink, embroidery, stamps.

Inverted

Navy on white when only one dark colour is left.

mccain digital

mccain digital

The lockup in four sizes: tile 24/28/32/46, word 15/17/21/33. The gap between tile and word is always half the tile edge.

### Without a plate

On the website and anywhere the dark plate would sit too heavy, the mark stands free: colour on light, white on dark, single-colour indigo or navy. No frame, no ground — the dust then needs a quiet surface.

![Colour](https://mccain-digital.com/brand/mccain-mark-free-color.svg)

Colour

The default on white and paper — the website, documents.

![White](https://mccain-digital.com/brand/mccain-mark-free-white.svg)

White

On navy and other dark grounds.

![Indigo](https://mccain-digital.com/brand/mccain-mark-free-indigo.svg)

Indigo

Single colour in the accent — buttons, chips, small spots.

![Navy](https://mccain-digital.com/brand/mccain-mark-free-navy.svg)

Navy

Single dark colour — one-ink print, stamps.

mccain digital

mccain digital

mccain digital

mccain digital

Without the plate the mark runs slightly larger than the tile: 34/28/24 instead of 28/24/20 beside the same word — the dust does not count as area. The gap to the word stays half the mark edge.

03

## Wordmark

Instrument Sans 600, −0.03 em, always lowercase — “mccain digital”, never “McCain Digital” in the logo. Two versions: the quiet one as default, the gradient one for places where the brand stands alone.

mccain digital

Default

Navy on light, white on navy. Navigation, footer, documents, signature.

mccain digital

With gradient

“digital” carries the gradient of the mark. Title slides, social, large surfaces — never below 24 px.

mccain digital

On navy

White, same metrics. The gradient version works on navy just as well.

Type and mark stay together. The SVG wordmarks carry live text and need Instrument Sans. For anything that cannot load a font, the browser renders PNGs here with the loaded font — 160 px word size, transparent or on a plate.

Lockup light · PNG

Lockup dark · PNG

Lockup dark, white mark · PNG

Lockup with gradient · PNG

Wordmark light · PNG

Wordmark dark · PNG

Wordmark with gradient · PNG

- Type Instrument Sans 600, tracking −0.03 em, line height 1.
- Casing always lowercase: mccain digital. In body copy McCain Digital stays capitalised.
- Spacing to the tile: half the tile edge. Smallest wordmark 14 px.
- Gradient only on “digital”, only from 24 px up, never in body copy.

04

## Colour

Navy carries, indigo points. The four gradient colours belong to the stream and the mark — they never appear alone as a surface.

- Navy #0A2540 rgb(10, 37, 64) Text, headings
- Plate #0A1F44 rgb(10, 31, 68) Plate, dark surfaces, footer
- Indigo #635BFF rgb(99, 91, 255) Accent: buttons, links, active
- Indigo Text #4D47C7 rgb(77, 71, 199) Indigo as type on light
- Orange #FFB46B rgb(255, 180, 107) Gradient 1
- Pink #FF5A8C rgb(255, 90, 140) Gradient 2
- Violet #C05CFF rgb(192, 92, 255) Gradient 3
- Sky #5FC3FF rgb(95, 195, 255) Gradient 4
- Paper #F6F9FC rgb(246, 249, 252) Surfaces, cards

linear-gradient(90deg, #FFB46B, #FF5A8C 33%, #C05CFF 66%, #5FC3FF)

05

## Typography

Two families, two jobs. Instrument Sans speaks, JetBrains Mono measures.

Aa Gg 0123

Instrument Sans

400 · 500 · 600 · 700 · Google Fonts

Headings 600–700 at −0.03 to −0.04 em, body copy 400 at 1.55 line height. Buttons 600. The wordmark.

0.25 ms · 4×100

JetBrains Mono

400 · 500 · Google Fonts

Eyebrows in caps at .1–.12 em tracking, numbers, labels, code, data nodes. Never for body copy.

Display · 48–72 · 700 · −.04em Data becomes product.

H2 · 30–48 · 700 · −.03em What we build

H3 · 22–27 · 600 · −.025em AI that runs on your data

Lead · 18 · 400 · 1.6 One sentence that carries the page.

Body · 15 · 400 · 1.55 Body copy in slate #425466, never below 13 px.

Button · 15 · 600 Start a project →

06

## Icons

Thin lines, 1.75 stroke on a 24 grid, round caps — Lucide style. Colour comes from the text (currentColor); indigo only in the active state. The one exception is the pixel: an AI state may carry a single gradient pixel, nothing else.

One source. All icons live as a sprite in [mccain-icons.svg](https://mccain-digital.com/brand/mccain-icons.svg), each as <symbol id="…">. The website pulls its icons from here — change an icon once and it changes everywhere. New icons go into the file and into this list, nowhere else.

Usage

<svg width="18" height="18" aria-hidden="true">
 <use href="/brand/mccain-icons.svg#arrow-right"></use>
</svg>

/* Stroke and colour come from the symbol:
 1.75, currentColor, round caps */

zap

shield

sparkles

layout

globe

server

book

file

layers

commit

gauge

See AI tools Download Icons in buttons: 18 px, 1.75 stroke, 10 px gap. The pixel marks the AI state.

07

## Motion

Three states, and the mark gets no more. One curve for everything: cubic-bezier(.2, .8, .2, 1). No spring, no bounce. Anyone with reduced motion enabled sees the finished mark.

Arriving 1.6 s

The plate scales up from 88 %. The block densifies from right to left, the porous edge settles last, the dust flies in from afar and lands softly.

Waiting 3 s · loop

Two lanes of dust drift in, settle, hold, fade — each pixel on its own beat. The edge breathes, the block shimmers. No spinner.

mccain digital

Signing in 1.9 s

The mark assembles, the dust carries on to the right, the word wipes in behind it. The word comes after the mark, never before.

08

## Applications

mccain digital Services Work Studio Enquire

Avatar · round

App-Icon · 1024

mccain digital

Favicon · 16

Start a project Button with mark

09

## Stationery

Business card, letterhead, email signature, presentation. Every template is a file below; the signature comes as HTML to paste in.

![Business card, front](https://mccain-digital.com/brand/mccain-visitenkarte-vorne.svg)![Business card, back](https://mccain-digital.com/brand/mccain-visitenkarte-hinten.svg) Business card · 85 × 55 mm · navy front, white back

![Letterhead A4](https://mccain-digital.com/brand/mccain-briefbogen.svg) Letterhead · A4 · lockup 44 top left, mono footer

|  | First Last Role · mccain digital +49 000 0000000 · vorname@mccain-digital.com mccain-digital.com |
| --- | --- |

Email signature · HTML table, system-font fallback, 48 px image Open presentation template 7 slides: title, agenda, chapter, text + image, quote, numbers, end · 1920 × 1080 →

10

## Social

OG card, story, LinkedIn banner, X header, square post — each in dark and light. The mark sits large, the wordmark with gradient, one line of mono at the foot.

![OG card](https://mccain-digital.com/brand/mccain-og-dark.svg) OG card · 1200 × 630

![LinkedIn banner](https://mccain-digital.com/brand/mccain-linkedin-banner-dark.svg) LinkedIn banner · 1584 × 396

![X header](https://mccain-digital.com/brand/mccain-x-header-light.svg) X header · 1500 × 500

![Post](https://mccain-digital.com/brand/mccain-post-dark.svg) Post · 1080 × 1080

![Story](https://mccain-digital.com/brand/mccain-story-light.svg) Story · 1080 × 1920

11

## In code

The brand as tokens, the lockup as three lines of HTML, the motion as keyframes. To compute the rule yourself: the function lives in Mark, method tile().

Tokens

:root {
 --mc-navy: #0A2540;
 --mc-plate: #0A1F44;
 --mc-indigo: #635BFF;
 --mc-indigo-text: #4D47C7;
 --mc-paper: #F6F9FC;
 --mc-hair: #E3E8EE;
 --mc-gradient: linear-gradient(90deg,
 #FFB46B, #FF5A8C 33%, #C05CFF 66%, #5FC3FF);
 --mc-ease: cubic-bezier(.2, .8, .2, 1);
}

Lockup

<a class="mc-lockup" href="/v5/" aria-label="mccain digital">
 <img src="/brand/mccain-mark-dark.svg"
 width="28" height="28" alt="">
 <span>mccain digital</span>
</a>

.mc-lockup { display:flex; align-items:center;
 gap:14px; /* half the tile edge */
 font: 600 17px/1 "Instrument Sans", sans-serif;
 letter-spacing:-.03em; color:var(--mc-navy); }

Motion

@keyframes tile-in {
 from { opacity:0; transform:scale(.88) }
 to { opacity:1; transform:none } }
@keyframes word-in {
 from { opacity:0; clip-path:inset(-30% 100% -40% -5%) }
 35% { opacity:1 }
 to { opacity:1; clip-path:inset(-30% -5% -40% -5%) } }
 /* negative insets: descenders (g) stay visible */

.mc-lockup img { animation: tile-in .52s var(--mc-ease) both }
.mc-lockup span { animation: word-in .62s var(--mc-ease) .35s both }

@media (prefers-reduced-motion: reduce) {
 .mc-lockup * { animation: none } }

12

## Not like this

- Do not rotate or mirror The data comes from the left, the product stands on the right. Rotated, the mark tells a different story.
- Not without a ground The dust needs a quiet ground. On photos or patterns it disappears.
- No other colours The gradient is orange, pink, violet, sky. No team or campaign colours.
- No shadow, no outline The plate is flat. No drop shadow, no gloss, no frame.
- Do not stretch Always proportional. The plate is square, the wordmark is never letterspaced.
- Do not animate in body copy The three states belong to the lockup — once per page, on load.

13

## Files

All files, every version on its own. SVG for vector, PNG for anything that cannot load a font. The SVGs with a wordmark carry live text — convert them to paths before sending them outside.
