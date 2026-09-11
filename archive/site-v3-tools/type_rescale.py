"""One-shot rescale of the DISPLAY layer in v3.css.

Third owner complaint about the same thing ("mach die h1 mal kleiner",
"auf 1900 monitoren ist das alles sehr gross", now "das sieht alles so
riesig aus"). The first two rounds trimmed the h1 and took 13% off the h2
and left everything between them where it was, which is why the page still
reads as a type specimen: measured at 1440x900, index.html paints one h1 at
96px, eight h2 at 58px and twelve h3 at 43px - twenty headlines, none below
43px, over running copy set at 16.4px. The copy was never the problem.

Every pair below is an exact, counted replacement. A pair that does not
match exactly once aborts the whole run before anything is written - the
habit that has twice stopped a half-rewritten stylesheet on this machine.

NOT touched, on purpose:
  .display--fill  the size is container width / line width at 1em, measured
                  in the browser. Scaling it breaks the fill contract.
  .scard-ghost    a cropped decorative numeral hung off the card edge; its
                  size is part of the crop, not of the reading hierarchy.
  every clamp FLOOR - the phone was measured and is right (h1 41.6, h2 30.4,
                  copy 16); the complaint is about big screens.
"""

import io
import sys

PATH = "v3.css"

# (what it is, old, new, px at 1440 before -> after)
PAIRS = [
    # --- the two hero sizes ---
    ("--t-display (index h1)",
     "--t-display: clamp(2.6rem, min(6.7vw, 13vh), 8rem);",
     "--t-display: clamp(2.6rem, min(5.14vw, 10vh), 5.5rem);"),
    # Both hero rules carry the SAME declaration and neither ends in a
    # semicolon, so the value alone matches twice and with a ";" never. The
    # selector goes into the pattern.
    (".hero--svc .hero-h (service h1)",
     ".hero--svc .hero-h {\n  font-size: clamp(2.4rem, 7vw, 6.2rem)\n}",
     ".hero--svc .hero-h {\n  font-size: clamp(2.4rem, 5.14vw, 4.9rem)\n}"),
    # --- section level ---
    ("--t-h2",
     "--t-h2: clamp(1.9rem, 4.1vw, 3.65rem);",
     "--t-h2: clamp(1.9rem, 3.06vw, 2.9rem);"),
    ("--t-h3",
     "--t-h3: clamp(1.35rem, 2.1vw, 2rem);",
     "--t-h3: clamp(1.35rem, 1.67vw, 1.56rem);"),
    (".case-h",
     "font-size: clamp(1.8rem, 3vw, 3rem);",
     "font-size: clamp(1.8rem, 2.29vw, 2.2rem);"),
    (".intent",
     "font-size: clamp(1.8rem, 4.4vw, 3.4rem);",
     "font-size: clamp(1.8rem, 2.78vw, 2.6rem);"),
    (".ctaband-h",
     ".ctaband-h {\n  font-size: clamp(2.4rem, 7vw, 6.2rem)\n}",
     ".ctaband-h {\n  font-size: clamp(2.4rem, 4.58vw, 4.4rem)\n}"),
    # --- the statements that sit between a heading and the copy ---
    (".st-lead",
     "font-size: clamp(1.5rem, 2.6vw, 2.4rem);",
     "font-size: clamp(1.5rem, 2vw, 1.88rem);"),
    (".foot-say",
     "font-size: clamp(1.5rem, 3vw, 2.4rem);",
     "font-size: clamp(1.5rem, 2.08vw, 2rem);"),
    (".vmq-item",
     "font-size: clamp(1.2rem, 2.8vw, 2.6rem);",
     "font-size: clamp(1.2rem, 2.15vw, 2rem);"),
    (".contact-mail",
     "font-size: clamp(1.3rem, 2.4vw, 2rem);",
     "font-size: clamp(1.3rem, 1.88vw, 1.75rem);"),
    (".step-n",
     "font-size: clamp(1.4rem, 2.6vw, 2rem);",
     "font-size: clamp(1.4rem, 1.94vw, 1.8rem);"),
    (".legal h1",
     "font-size: clamp(2rem, 5vw, 3.6rem);",
     "font-size: clamp(2rem, 2.92vw, 2.75rem);"),
    # --- the running-text default and the lead ---
    # --t-body is body's own font-size, so it is what EVERY element that sets
    # no size of its own paints at. On the marketing pages almost nothing does
    # (they use --t-copy); on the legal pages it is 69% of the text.
    ("--t-body",
     "--t-body: clamp(1rem, .48vw + .88rem, 1.18rem);",
     "--t-body: clamp(1rem, .48vw + .88rem, 1.06rem);"),
    (".lead ceiling",
     "font-size: clamp(1.05rem, 1.1vw, 1.35rem);",
     "font-size: clamp(1.05rem, 1.1vw, 1.2rem);"),
]


def main():
    raw = io.open(PATH, "r", encoding="utf-8", newline="").read()
    nl = "\r\n" if "\r\n" in raw else "\n"
    text = raw.replace("\r\n", "\n")

    problems = []
    for name, old, _new in PAIRS:
        n = text.count(old)
        if n != 1:
            problems.append("  %-28s %d matches (expected 1)" % (name, n))
    if problems:
        sys.stderr.write("ABORT - nothing written:\n" + "\n".join(problems) + "\n")
        return 1

    for name, old, new in PAIRS:
        text = text.replace(old, new, 1)
        print("  ok  " + name)

    io.open(PATH, "w", encoding="utf-8", newline="").write(text.replace("\n", nl))
    print("\n%d rules rescaled in %s (%s line endings)" % (len(PAIRS), PATH, "CRLF" if nl == "\r\n" else "LF"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
