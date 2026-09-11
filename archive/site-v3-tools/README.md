# The v3 measuring tools

These measured the site that now lives in `archive/site-v3/`. They still run,
and that is exactly the problem: they measure classes and tokens that no longer
exist, so they report a clean bill of health for a site nobody is looking at.

They were moved out of `tools/` on 11 September 2026, next to the site they
belong to, rather than deleted — the methods in them were worth working out and
some of them will be worth adapting.

| tool | what it measured | superseded by |
| --- | --- | --- |
| `sweep.mjs` · `sweep.sh` | console errors and an overflow summary over every page | `tools/verify_site.mjs` (console + page errors) and `tools/responsive_audit.mjs` (overflow at four widths, and which element causes it) |
| `accent_audit.mjs` · `.sh` · `_probe.js` | accent-coloured text against the background actually behind it | `tools/lighthouse_audit.py`. Its premise is v3-specific: the accent was the **logo yellow**, 1.48:1 on paper and 11.99:1 on ink, which is why the tool had to exist. The 2026 accent is `#635BFF` and does not have that split. |
| `type_scale.mjs` · `_probe.js` | the type scale as painted, per viewport | `tools/extract_design.mjs`, which reads the same values off the rendered start page and writes them where the page generators can use them |
| `type_rescale.py` | a one-shot rescale of the display layer in `v3.css` | nothing — `v3.css` is gone |
| `pixel_scale.sh` · `pixel_scale_probe.js` | that every pixel mosaic sat on its photo at scale 1 | nothing — the mosaics were a v3 treatment |
| `stage_probe.js` | the header's own contrast, read from the painted pixels | `tools/lighthouse_audit.py` |
| `probe.js` | the shared DOM probe the four above injected | — |
| `add_meta.py` | injected the social / canonical / icon block into every page head | `tools/prerender.mjs` and `tools/pagekit.py`, which write the head rather than patching it afterwards |
| `build_jsonld.py` | built the home page's JSON-LD out of `data.js` | `tools/prerender.mjs`, which takes the structured data **out of the rendered page** so it cannot disagree with the visible copy |

If one of these is ever brought back, the thing to change first is its page list:
every one of them still names `work.html`, `about.html` or `services/` paths from
the v3 information architecture.
