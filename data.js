/* ============================================================
   McCain Digital — shared content, one source for every page.
   index.html and the service pages both read from window.MCD, so
   a price, a promise or a service name is edited in exactly one
   place. Plain script, no modules, no build step.
   ============================================================ */
(() => {
  "use strict";

  /* ---------- services: the whole offer, in order ---------- */
  const SERVICES = [
    {
      n: "01", h: "AI tools", slug: "ai-tools", href: "services/ai-tools.html",
      p: "Production AI on your own data — RAG with citations and an abstain path, agents with guardrails, MCP servers into your CRM or ERP. Model-agnostic.",
      get: ["RAG over your data — pgvector or Qdrant, with citations",
        "Agents & automation — guardrails, logs, human approval",
        "MCP tool-servers — your systems, not a chat toy"],
      k: "ai ki llm rag agent agents mcp automation chatbot assistant vector search machine learning",
      proof: "whatever-recall, our own AI product, is live and self-hosted."
    },
    {
      n: "02", h: "Web apps", slug: "web-apps", href: "services/web-apps.html",
      p: "React, Next.js and TypeScript. Core Web Vitals green from day one, MVP to scale without a rewrite.",
      get: ["Real-time, auth and payments wired in",
        "Green vitals as an acceptance criterion, not a hope",
        "A codebase your next developer can read"],
      k: "app web application react next nextjs typescript spa dashboard saas mvp portal login payments",
      proof: "Green Core Web Vitals are written into the acceptance criteria."
    },
    {
      n: "03", h: "Websites", slug: "websites", href: "services/websites.html",
      p: "Marketing sites with top-tier SEO and a perfect Lighthouse. This page is the sample.",
      get: ["4×100 Lighthouse — the number, not the vibe",
        "Structured data + llms.txt so agents read it too",
        "CMS or pure static — your call"],
      k: "website site marketing seo landing page cms static lighthouse pagespeed performance",
      proof: "This very page scores 100/100/100/100 with a canvas engine running."
    },
    {
      n: "04", h: "Software for companies", slug: "software", href: "services/software.html",
      p: "Dashboards, internal tools and integrations — ERP, CRM, REST/SOAP, legacy included.",
      get: ["Tailor-made, documented, tested",
        "Yours to keep — no lock-in, no seat tax",
        "Self-hosted where your data demands it"],
      k: "software internal tool dashboard erp crm integration api rest soap legacy custom company",
      proof: "You get the repository and the documentation. No lock-in."
    }
  ];

  /* ---------- everything the menu can jump to ----------
     `to` is relative to the site root; menu.js rewrites it per page depth. */
  const NAV = [
    { g: "Pages", t: "Home", to: "index.html", d: "The studio, the work and the AI console.", k: "home start front" },
    { g: "Pages", t: "Selected work", to: "index.html#work", d: "What we shipped, and what it actually did.", k: "work cases portfolio projects references" },
    { g: "Pages", t: "Ask the AI", to: "index.html#ai", d: "Put a question to the site itself, or hand it your project and watch it write the brief.", k: "ai console ask chat brief demo try" },
    { g: "Pages", t: "The studio", to: "index.html#studio", d: "Two founders, twenty years, no hand-offs.", k: "about studio team who founders christian kathi people" },
    { g: "Pages", t: "Proof", to: "index.html#proof", d: "Twenty years of brands, and the client quotes we are still collecting.", k: "proof reviews testimonials clients brands references trust" },
    { g: "Pages", t: "Straight answers", to: "index.html#faq", d: "Cost, timelines, who builds it — and why you might not want us.", k: "faq questions answers cost price timeline" },
    { g: "Pages", t: "Start a project", to: "contact.html", d: "A real reply within 24 hours, a fixed quote within 48.", k: "contact start hire quote email mail reach brief" },

    /* German law requires these four to be reachable from every page. Putting
       them in the menu means they are also one keystroke away, not just a row
       of small type in the footer. */
    { g: "Legal", t: "Imprint", to: "legal/imprint.html", d: "Who runs this site, under section 5 DDG — names, address, tax numbers.", k: "imprint impressum legal owner address vat tax contact" },
    { g: "Legal", t: "Privacy", to: "legal/privacy.html", d: "What data we process, why, and the rights you have over it.", k: "privacy datenschutz gdpr dsgvo data cookies tracking rights" },
    { g: "Legal", t: "Terms", to: "legal/terms.html", d: "The terms our services are provided under.", k: "terms agb conditions contract legal" },
    { g: "Legal", t: "Withdrawal", to: "legal/withdrawal.html", d: "Right of withdrawal and the model withdrawal form.", k: "withdrawal widerruf cancel return consumer refund" }
  ];

  /* ---------- FAQ: question + streamed answer ---------- */
  const FAQ = [
    {
      q: "What does a project cost?",
      a: "There is no price list, and anyone who gives you one hasn't understood your project.\n\nWhat you get instead: a <b>fixed quote within 48 hours</b> of telling us what you need — a real number, not a range that doubles later. A small site starts in the low five figures; an AI tool with your data in it, more. If the honest answer is \"you don't need us for this\", you get that answer too."
    },
    {
      q: "How long does it take?",
      a: "A marketing site: <b>3–6 weeks</b>.\nA web app MVP: <b>6–12 weeks</b>.\nAn AI tool on your data: <b>4–10 weeks</b>, depending on how tidy the data is.\n\nYou see something clickable in the first week — not a status meeting."
    },
    {
      q: "Who actually builds it?",
      a: "<b>The two of us.</b> Christian builds and ships, Kathi does design and brand.\n\nNo juniors learning on your budget, no account manager between you and the work, no agency that subcontracts it to someone you never meet. The company has been going since 2016; between us we have <b>over twenty years</b> in the industry."
    },
    {
      q: "Do you really do AI, or is that a buzzword?",
      a: "We ship our own AI product — <b>whatever-recall</b>, project memory for software teams, live and self-hosted.\n\nThe console on this page is ours too. Ask it something and watch. That's the difference between doing AI and having an AI page."
    },
    {
      q: "What happens after launch?",
      a: "We stay. That's the whole reason the studio is two senior people and not fifteen — <b>we're still the ones who get the call</b> in year three.\n\nMaintenance, changes, new features: same people, no re-onboarding, no \"the developer who built that has left\"."
    },
    {
      q: "Can we host it ourselves?",
      a: "Yes — and for anything touching your data, we'd recommend it.\n\n<b>Self-hosted, your keys, your iron.</b> No lock-in, no per-seat tax, no vendor who owns your content. You get the repository and the documentation."
    }
  ];

  /* ---------- knowledge base: drives the console AND the menu's ask ---------- */
  const KB = [
    {
      k: ["cost", "price", "pricing", "budget", "expensive", "kosten", "preis"],
      a: "No price list — a <b>fixed quote within 48 hours</b> once you tell us what you need.\n\nA marketing site starts in the low five figures. An AI tool on your own data costs more, because the work is in your data, not in the model. If we think you don't need us, we say so."
    },
    {
      k: ["time", "long", "timeline", "deadline", "fast", "dauer", "wie lange"],
      a: "Site: <b>3–6 weeks</b>. Web app MVP: <b>6–12 weeks</b>. AI tool: <b>4–10 weeks</b>.\n\nYou get something clickable in week one."
    },
    {
      k: ["who", "team", "people", "founder", "wer", "christian", "kathi"],
      a: "Two people: <b>Christian</b> (builds &amp; ships) and <b>Kathi</b> (design &amp; brand), both co-founders.\n\nThe company was founded in <b>2016</b>. Between us: <b>20+ years</b> in the industry — Deutsches Museum, Blizzard, Microsoft, Apple, Travian, Ravensburger."
    },
    {
      k: ["ai", "ki", "llm", "rag", "agent", "mcp", "model"],
      a: "Production AI, not demos: <b>RAG</b> over your own data (pgvector/Qdrant, citations, an abstain path so it says \"I don't know\"), <b>agents</b> with guardrails and human approval, and <b>MCP</b> servers that plug into your CRM/ERP.\n\nModel-agnostic — Claude, GPT, Llama, Mistral, Qwen. Proof: our own product, whatever-recall."
    },
    {
      k: ["recall", "product", "own", "whatever"],
      a: "<b>whatever-recall</b> — AI-native project memory for software teams.\n\nKnowledge is stamped onto the git commit at write-time, while the AI still knows why. Reading it back takes microseconds and <b>zero tokens</b>. Self-hosted, no telemetry, no upload."
    },
    {
      k: ["speed", "performance", "lighthouse", "seo", "score", "pagespeed"],
      a: "This page: <b>100/100/100/100</b> on Lighthouse, <b>CLS 0</b>, <b>TBT 0 ms</b> — while running a custom canvas pixel-physics engine.\n\nPlus <b>Agentic browsing 3/3</b>: real DOM text, JSON-LD, llms.txt. Machines read it as clearly as you do."
    },
    {
      k: ["skeptic", "why", "bad", "wrong", "not right", "downside", "risk"],
      a: "Fair. Where we're <b>not</b> the right call:\n\n· You need twenty people on it by Monday — we're two.\n· You want the cheapest possible bid — we won't be it.\n· You need someone on-site every day — we're in Bavaria and we work remote.\n\nWhat you get instead: the people who quote are the people who build, and we're still here in year three."
    },
    {
      k: ["contact", "start", "hire", "reach", "kontakt", "email", "mail"],
      a: "<b>info@mccain-digital.com</b> — a real reply within 24 hours, a fixed quote within 48.\n\nNo sales call, no discovery workshop invoice. Just tell us what you have in mind."
    },
    {
      k: ["host", "self-host", "data", "gdpr", "dsgvo", "privacy", "keys"],
      a: "<b>Self-hosted, your keys, your iron</b> — for anything touching your data we recommend it.\n\nNo lock-in, no per-seat tax. You get the repository and the documentation. We're in Germany, so GDPR isn't an afterthought."
    },
    {
      k: ["stack", "tech", "framework", "react", "next", "typescript"],
      a: "TypeScript everywhere. <b>React / Next.js</b> for apps, Postgres + pgvector for data and retrieval, MCP for tool servers.\n\nThis very page is hand-written vanilla HTML/CSS/JS — no framework, no build step. Sometimes that's the right answer too."
    }
  ];

  const FALLBACK =
    "I don't have a canned answer for that one — this prototype answers from a local knowledge base.\n\n" +
    "Once the serverless endpoint is live, this same box talks to a real model with our site as context. " +
    "In the meantime: <b>info@mccain-digital.com</b> reaches a human within 24 hours.";

  /* ---------- chip explanations ---------- */
  const TIPS = {
    performance: ["Performance 100",
      "Google scores loading speed from 0 to 100; most sites land around 50–70. This page: a perfect 100 — on mobile and on desktop, while running a canvas particle engine."],
    accessibility: ["Accessibility 100",
      "Usable for everyone — keyboard, screen readers, colour contrast. 100 means the audit found zero barriers, not that we tried."],
    practices: ["Best practices 100",
      "Modern, secure engineering: HTTPS throughout, no console errors, no deprecated APIs, correct image sizing. Full marks."],
    seo: ["SEO 100",
      "Everything a search engine needs — structure, metadata, crawlability. Very few pages ever hit all four hundreds at once."],
    agentic: ["Agentic browsing 3/3",
      "Lighthouse's newest audit: is this site readable by AI agents? All three checks pass — a valid llms.txt, machine-readable structure and a clean crawl path."],
    claude: ["Claude — Anthropic",
      "The frontier model we reason and build with day to day. Products get designed with Claude in the loop, not bolted on afterwards."],
    gpt: ["GPT — OpenAI",
      "The GPT stack, used where it fits. We are model-agnostic: we pick whatever gives your product the best answer, not whatever is trending."],
    mcp: ["MCP — Model Context Protocol",
      "The open standard for giving a model real tools. It is how an assistant reaches into your CRM or ERP instead of guessing at it."],
    n8n: ["n8n",
      "Self-hostable automation. Your data stays on your own machine while the boring steps between your tools run themselves."],
    pgvector: ["pgvector",
      "The Postgres extension that lets your own documents be searched by meaning. It is what makes an AI answer from YOUR data instead of the internet's."]
  };

  /* ---------- streaming typewriter ----------
     One engine, three consumers: the AI console, the FAQ panel and the menu's
     answer pane. Returns a cancel function — an answer that is still typing
     must stop the moment the next one starts. */
  /* Read when it is needed, not when this file loads.

     Two reasons. A visitor who flips the setting mid-session is respected
     without a reload — the old module-level constant froze the answer at load
     time. And the file stays loadable outside a browser: api/ask.js requires
     this very file to get the knowledge base, and a matchMedia call at import
     time made that impossible. */
  function prefersReducedMotion() {
    return typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function stream(el, html, done) {
    el.classList.add("caret");
    if (prefersReducedMotion()) {
      el.innerHTML = html;
      el.classList.remove("caret");
      if (done) done();
      return () => { };
    }
    let i = 0, timer = null, killed = false;
    el.innerHTML = "";
    const tick = () => {
      if (killed) return;
      // walk past whole tags in one step so markup never renders half-open.
      // an unclosed "<" would give indexOf === -1 and loop forever — clamp it.
      if (html[i] === "<") {
        const close = html.indexOf(">", i);
        i = close === -1 ? html.length : close + 1;
      } else {
        i += 1 + Math.floor(Math.random() * 2);
      }
      el.innerHTML = html.slice(0, i);
      if (i < html.length) {
        timer = setTimeout(tick, html[i - 1] === "\n" ? 90 : 9);
      } else {
        el.innerHTML = html;
        el.classList.remove("caret");
        if (done) done();
      }
    };
    tick();
    return () => { killed = true; clearTimeout(timer); };
  }

  /* the single lookup both the console and the menu use */
  function lookup(q) {
    const s = String(q).toLowerCase();
    let best = null, bestHits = 0;
    KB.forEach((e) => {
      const hits = e.k.reduce((n, key) => (s.includes(key) ? n + 1 : n), 0);
      if (hits > bestHits) { bestHits = hits; best = e; }
    });
    return best ? best.a : FALLBACK;
  }

  window.MCD = { SERVICES, NAV, FAQ, KB, FALLBACK, TIPS, lookup, stream };
})();
