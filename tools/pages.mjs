/* The route table of the site: which artboard of the export becomes which
 * page, at which URL. One file, read by tools/prerender.mjs (React build, the
 * sitemap, llms.txt) and tools/v5build.mjs (the v5 build of every page), so the
 * two builds can never disagree about what exists.
 */
export const ORIGIN = "https://mccain-digital.com";

/* ------------------------------------------------------------- route table */
/* src    the artboard in the export
 * out    where the built file goes, relative to the repository root
 * route  the URL it answers on - canonical, og:url and the sitemap come from it
 * h1     pinned ONLY where the headline rotates. The start page cycles through
 *        heroWords.de, so whichever variant is on screen at snapshot time
 *        becomes the indexed h1 - a different promise on every build. Pinning
 *        it makes the build fail rather than quietly index something else:
 *        which sentence Google shows is a decision, not a race. Measured
 *        12.9.2026: the start page is the only artboard that rotates.
 * prio/freq  sitemap hints, kept next to the route they describe.
 */
export const PAGES = [
  {
    src: "McCain Digital v2.dc.html",
    out: "index.html",
    route: "/",
    h1: "KI-Tools, die auf Ihren Daten laufen.",
    prio: "1.0",
    freq: "weekly",
  },
  { src: "McCain Digital Uebersicht.dc.html", out: "leistungen/index.html", route: "/leistungen/", prio: "0.9", freq: "monthly" },
  { src: "McCain Digital KI.dc.html", out: "leistungen/ki-automatisierung/index.html", route: "/leistungen/ki-automatisierung/", prio: "0.9", freq: "monthly" },
  { src: "McCain Digital Web-Apps.dc.html", out: "leistungen/web-apps/index.html", route: "/leistungen/web-apps/", prio: "0.9", freq: "monthly" },
  { src: "McCain Digital Websites.dc.html", out: "leistungen/websites/index.html", route: "/leistungen/websites/", prio: "0.9", freq: "monthly" },
  { src: "McCain Digital Software.dc.html", out: "leistungen/individualsoftware/index.html", route: "/leistungen/individualsoftware/", prio: "0.9", freq: "monthly" },
  { src: "McCain Digital Tech Next.dc.html", out: "leistungen/nextjs-entwicklung/index.html", route: "/leistungen/nextjs-entwicklung/", prio: "0.8", freq: "monthly" },
  { src: "McCain Digital Tech MCP.dc.html", out: "leistungen/mcp-server-entwickeln/index.html", route: "/leistungen/mcp-server-entwickeln/", prio: "0.8", freq: "monthly" },
  { src: "McCain Digital Tech RAG.dc.html", out: "leistungen/rag-beratung/index.html", route: "/leistungen/rag-beratung/", prio: "0.8", freq: "monthly" },
  { src: "McCain Digital Tech ERP.dc.html", out: "leistungen/erp-integration/index.html", route: "/leistungen/erp-integration/", prio: "0.8", freq: "monthly" },
  { src: "McCain Digital Vergleich WordPress.dc.html", out: "vergleich/wordpress-oder-handgeschrieben/index.html", route: "/vergleich/wordpress-oder-handgeschrieben/", prio: "0.7", freq: "monthly" },
  { src: "McCain Digital Vergleich RAG.dc.html", out: "vergleich/chatgpt-oder-eigenes-rag/index.html", route: "/vergleich/chatgpt-oder-eigenes-rag/", prio: "0.7", freq: "monthly" },
  { src: "McCain Digital md-recall.dc.html", out: "md-recall/index.html", route: "/md-recall/", prio: "0.8", freq: "monthly" },
  { src: "McCain Digital Preise.dc.html", out: "preise/index.html", route: "/preise/", prio: "0.6", freq: "monthly" },
  { src: "McCain Digital Studio.dc.html", out: "studio/index.html", route: "/studio/", prio: "0.6", freq: "monthly" },
  { src: "McCain Digital Kontakt.dc.html", out: "kontakt/index.html", route: "/kontakt/", prio: "0.6", freq: "monthly" },
  { src: "McCain Digital Recht.dc.html", out: "rechtliches/index.html", route: "/rechtliches/", prio: "0.6", freq: "monthly" },
  { src: "McCain Digital Styleguide.dc.html", out: "styleguide/index.html", route: "/styleguide/", prio: "0.5", freq: "monthly" },

  /* THESE THREE SHIP THE LEGAL PAGE'S <helmet>, VERBATIM.
   *
   * They are not in the export's own sitemap.xml, and their head was copied
   * from McCain Digital Recht and never edited: the same canonical
   * (/rechtliches/), the same description ("Rechtliche Angaben von McCain
   * Digital: Impressum, Datenschutzerklaerung, ..."), the same og:image, and in
   * the brand page's case the same <title> as well. Shipped as they are, that
   * tells Google three different pages are the legal page.
   *
   * The route decides the canonical (see headOf). `meta` below overrides the
   * rest - the wording is taken from each page's own hero copy, not invented,
   * so it says what the page actually says. It is still copy on a marketing
   * site: worth a look in the text pass that is already planned.
   *
   * The routes are read off the design rather than chosen: the brand page's own
   * og:image is brand/mccain-og-marke.png, so /marke/ is what it was drawn for,
   * and the article's headline is "recall heisst jetzt md-recall". */
  {
    src: "McCain Digital News.dc.html",
    out: "news/index.html",
    route: "/news/",
    prio: "0.6",
    freq: "weekly",
    meta: {
      desc:
        "Produkt-Updates zu md-recall, Notizen aus der Technik und Nachrichten " +
        "aus dem Studio. Kurz gehalten, ohne Ankündigungs-Prosa.",
      ogImage: `${ORIGIN}/og-image.png`,
    },
  },
  {
    src: "McCain Digital News md-recall.dc.html",
    out: "news/md-recall/index.html",
    route: "/news/md-recall/",
    date: "2026-09-11", /* published; feeds the Atom feed (tools/v5build.mjs) */
    prio: "0.5",
    freq: "monthly",
    meta: {
      desc:
        "Der Name ist kürzer, die Lizenz einfacher: md-recall läuft ab sofort " +
        "ohne Seat-Grenze und ist direkt von mccain-digital.com aus erreichbar.",
      ogImage: `${ORIGIN}/brand/mccain-og-md-recall.png`,
    },
  },
  {
    src: "McCain Digital Brand Guide v2.dc.html",
    out: "marke/index.html",
    route: "/marke/",
    prio: "0.5",
    freq: "monthly",
    meta: {
      title: "Marke & Downloads · McCain Digital",
      desc:
        "Das Zeichen von McCain Digital: Konstruktion, Fassungen, Farbe, " +
        "Typografie, Icons und Bewegung – mit jeder Markendatei zum Herunterladen.",
      ogImage: `${ORIGIN}/brand/mccain-og-marke.png`,
    },
  },
];

/* Artboards in the export that are NOT pages of this site: design studies and
 * the old start page. They are listed so a link to one fails the build loudly
 * instead of shipping a 404 - except the two the brand guide links by name,
 * which keep their words and lose the link (see unwrapDeadLinks). */
export const NOT_PUBLISHED = [
  "McCain Digital.dc.html",
  "McCain Digital Logo.dc.html",
  "McCain Digital Marke.dc.html",
  "McCain Digital Deck.dc.html",
  "McCain Digital Styleguide copy.dc.html",
  "Bento Varianten.dc.html",
];
