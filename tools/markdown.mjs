/* The markdown twin of the built start page - the same pattern
 * docs.anthropic.com uses (every page also answers as .md): a crawler or an
 * LLM that fetches index.md gets the page's words without downloading
 * ~2,400 DOM nodes of layout markup and re-deriving what's prose.
 *
 * WHY A STRING, NOT A REAL FUNCTION
 * tools/v5build.mjs holds the finished page in a detached <template> holder
 * (holder.content is a DocumentFragment - see its "merge" step) and reads it
 * back with tab.evaluate(fn, arg) inside a real Chromium tab. The converter
 * below has to run there, against that fragment, not in Node - there is no
 * DOM in tools/ (package.json carries only playwright-core and esbuild, no
 * jsdom), so it cannot be unit-tested as an ordinary Node function without
 * adding a dependency for it. Exporting the function's source as a string and
 * shipping it into the page with (${HTML_TO_MARKDOWN})(root, meta) keeps the
 * real target (a live DOM) as the only place it ever runs; a parallel
 * exported function with the same body would be a second copy to keep in
 * sync for a test harness this repo has decided not to carry.
 * tools/markdown-check.mjs is the test: it loads the real built page in
 * Chromium via playwright-core and calls the string there.
 *
 * String.raw, not a plain template literal: the function body below needs
 * its own regex/string escapes (\s, \d, \[, \\, ...) to survive untouched
 * into the code that finally runs in the browser. A plain template literal
 * cooks backslash escapes itself while THIS file is parsed - \d silently
 * becomes a literal "d" (no digit shorthand left), \n becomes a raw newline
 * byte sitting inside a regex literal (a syntax error at the far end) - one
 * pass of unwanted cooking, applied before the string ever reaches a
 * browser. String.raw skips that pass, so every escape below means exactly
 * what it looks like it means, same as in any ordinary .js file.
 *
 * HARD RULE FOR THE STRING BODY: no backtick, anywhere, even inside a
 * comment or a regex. String.raw still uses backtick delimiters, so a
 * literal backtick glyph in the body still ends the string early. Where the
 * OUTPUT needs a real backtick (fenced inline code), it is built at runtime
 * from its character code instead of being typed, so no backtick glyph has
 * to sit in this file.
 *
 * WHAT COUNTS AS "MAIN": v5build's node-by-node merge already collapses the
 * page's four render states (base, consent, consentOpen, mobile) into one
 * document, marking anything that only exists in a state with
 * data-v5-when="<state>". None of those states are on by default, so those
 * nodes are exactly the ones a JS-less reader would not see either - they
 * are skipped below alongside the genuinely inert stuff (nav/header/footer,
 * the closed mega menu, the inert stream-notes layer v5build already wraps
 * in a real <template>, tooltips, decorative SVG). data-v5-unless is
 * deliberately NOT in that list: those nodes are the default, visible,
 * unless-a-state-is-active case.
 */
export const HTML_TO_MARKDOWN = String.raw`(root, meta) => {
  meta = meta || {};
  var BACKTICK = String.fromCharCode(96);
  var BASE_URL = (meta.canonical && String(meta.canonical)) || 'https://mccain-digital.com/';

  var counts = { skippedNav: 0, skippedHidden: 0, links: 0 };
  var consumedAnswers = new Set();

  var SKIP_TAGS = {
    script: 1, style: 1, template: 1, svg: 1, canvas: 1, noscript: 1, iframe: 1,
    video: 1, audio: 1, input: 1, select: 1, textarea: 1, label: 1,
    nav: 1, header: 1, footer: 1
  };
  /* span/strong/em/etc are flattened into the surrounding paragraph rather
   * than flushed as their own block - two of these sitting flush against
   * each other with no text node between (a badge list, an icon-label pair)
   * would otherwise jam into one unspaced word; smartJoin below decides
   * whether that seam needs a space. */
  var INLINE_AT_BLOCK = {
    a: 1, span: 1, strong: 1, b: 1, em: 1, i: 1, small: 1, sup: 1, sub: 1,
    mark: 1, time: 1, abbr: 1, kbd: 1, u: 1, s: 1, del: 1, ins: 1, code: 1,
    q: 1, samp: 1, "var": 1, bdi: 1, bdo: 1, data: 1, img: 1, br: 1
  };

  function isSkippable(el) {
    var tag = el.tagName ? el.tagName.toLowerCase() : '';
    var skip = false;
    if (SKIP_TAGS[tag]) {
      skip = true;
    } else if (el.getAttribute) {
      if (el.getAttribute('aria-hidden') === 'true') {
        skip = true;
      } else if (el.hasAttribute('hidden')) {
        skip = true;
      } else {
        var role = el.getAttribute('role');
        if (role === 'tooltip' || role === 'presentation') skip = true;
        else if (el.hasAttribute('data-pt-layer')) skip = true;
        else if (el.hasAttribute('data-v5-when')) skip = true;
        else if (el.getAttribute('data-lang') === 'en') skip = true; /* bilingual markup: the twin is the German page */
      }
    }
    if (!skip && el.classList && el.classList.contains('sc-placeholder')) skip = true;
    if (skip) {
      if (tag === 'nav' || tag === 'header' || tag === 'footer') counts.skippedNav++;
      else counts.skippedHidden++;
    }
    return skip;
  }

  /* Collapse runs of plain whitespace to one space, but leave real newlines
   * (from <br>) alone - those are the only intentional line breaks. */
  function normalizeInline(s) {
    return s.replace(/[^\S\n]+/g, ' ');
  }

  /* Guard the first token of a paragraph-shaped line against being read as a
   * different block type by a markdown parser. Mid-line '#', '-', '>' are
   * ordinary prose (a price range, a comparison) and are left alone - only
   * the line START is escaped, which is the only place CommonMark cares
   * about. */
  function escapeLeading(text) {
    var m = /^\s*/.exec(text);
    var ws = m ? m[0] : '';
    var rest = text.slice(ws.length);
    if (/^#{1,6}(?: |$)/.test(rest)) return ws + '\\' + rest;
    if (rest.charAt(0) === '-' && rest.charAt(1) === ' ') return ws + '\\' + rest;
    if (rest.charAt(0) === '>' && rest.charAt(1) === ' ') return ws + '\\' + rest;
    var dm = /^(\d+)\.( |$)/.exec(rest);
    if (dm) return ws + dm[1] + '\\.' + rest.slice(dm[1].length + 1);
    return text;
  }

  function escapeBrackets(s) {
    return s.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
  }

  function escapeTableCell(s) {
    return s.replace(/\|/g, '\\|');
  }

  function absUrl(href) {
    try { return new URL(href, BASE_URL).href; } catch (e) { return href; }
  }

  /* Two element-sourced chunks with nothing between them in the DOM (no text
   * node at all) are almost always separate visual items held apart by CSS
   * gap/flex, not one run-on word - the "Open Source" / "Self-hosted" / "Git"
   * badge row is exactly this. A text node between two elements virtually
   * always already carries the needed space or punctuation, so the seam is
   * only ever patched when BOTH neighbours came from elements. */
  function smartJoin(parts) {
    var out = '';
    var prevEndsSpace = true;
    var prevWasEl = false;
    var prevChar = '';
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      var text = part.text;
      if (!text) continue;
      var startsSpace = /^\s/.test(text);
      if (!prevEndsSpace && !startsSpace && prevWasEl && part.isEl) {
        var nextFirst = text.charAt(0);
        var attach = /[.,;:!?)\]}'"»›’”…-]/.test(nextFirst) ||
          /[([{'"«‹„“-]/.test(prevChar);
        if (!attach) out += ' ';
      }
      out += text;
      prevChar = text.charAt(text.length - 1);
      prevEndsSpace = /\s$/.test(text);
      prevWasEl = part.isEl;
    }
    return out;
  }

  function inlineStrongEm(el, marker) {
    var t = normalizeInline(inline(el)).trim();
    return t ? marker + t + marker : '';
  }

  function inlineCode(el) {
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    var fence = BACKTICK;
    while (t.indexOf(fence) !== -1) fence += BACKTICK;
    var pad = fence.length > 1 ? ' ' : '';
    return fence + pad + t + pad + fence;
  }

  function inlineLink(el) {
    var text = escapeBrackets(normalizeInline(inline(el)).trim());
    var href = el.getAttribute('href');
    if (!href) return text;
    href = href.trim();
    if (!href || href.charAt(0) === '#') return text;
    var lower = href.toLowerCase();
    var finalHref = (lower.indexOf('mailto:') === 0 || lower.indexOf('tel:') === 0)
      ? href
      : absUrl(href);
    counts.links++;
    if (!text) return finalHref;
    return '[' + text + '](' + finalHref + ')';
  }

  function inlineImg(el) {
    var alt = (el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
    if (!alt) return '';
    var src = el.getAttribute('src') || '';
    if (!src) return '';
    return '![' + escapeBrackets(alt) + '](' + absUrl(src) + ')';
  }

  /* One conversion rule per node, shared by inline() (deep-flatten mode,
   * used inside <a>/<strong>/... and for a block element's own text) and by
   * walkBlock's top-of-flow dispatch for the same tags. Kept as one function
   * so the two call sites can never disagree on how e.g. <img> becomes
   * text. */
  /* The built page is pretty-printed (real newlines and indentation between
   * tags, not minified), so an inline run assembled by walking childNodes
   * hits plenty of text nodes that are pure formatting whitespace. Passed
   * through untouched those survive normalizeInline (which only collapses
   * *non*-newline runs, on purpose, so a real <br> still breaks a line) and
   * surface as literal blank/whitespace-only lines wherever a bare <a> or
   * <span> flattens a multi-line chunk of markup - a news card's link text
   * is where this first showed up. A whitespace-only text node still marks
   * a real gap between its neighbours, so it becomes one plain space rather
   * than being dropped outright. */
  function textPart(raw) {
    if (!raw) return null;
    if (raw.replace(/\s+/g, '') === '') return { text: ' ', isEl: false };
    return { text: raw, isEl: false };
  }

  function nodeToInlinePart(n) {
    if (n.nodeType === 3) return textPart(n.data);
    if (n.nodeType !== 1) return null;
    if (isSkippable(n)) return null;
    var tag = n.tagName.toLowerCase();
    var s;
    if (tag === 'br') return { text: '  \n', isEl: true };
    if (tag === 'img') { s = inlineImg(n); return s ? { text: s, isEl: true } : null; }
    if (tag === 'a') { s = inlineLink(n); return s ? { text: s, isEl: true } : null; }
    if (tag === 'strong' || tag === 'b') { s = inlineStrongEm(n, '**'); return s ? { text: s, isEl: true } : null; }
    if (tag === 'em' || tag === 'i' || tag === 'cite') { s = inlineStrongEm(n, '*'); return s ? { text: s, isEl: true } : null; }
    if (tag === 'code') { s = inlineCode(n); return s ? { text: s, isEl: true } : null; }
    /* Everything else (span, div, h1-6, p, li, ... reached while already
     * inside an inline context, e.g. a news card's <h3> living inside its
     * wrapping <a>) is flattened: no block semantics survive inside an
     * inline run, only its words do. */
    s = inline(n);
    return s ? { text: s, isEl: true } : null;
  }

  function partKey(p) {
    return (p.isEl ? 'e:' : 't:') + p.text;
  }

  function inline(node) {
    var parts = [];
    var kids = node.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var part = nodeToInlinePart(kids[i]);
      if (part) parts.push(part);
    }
    return smartJoin(collapseRepeats(parts, partKey));
  }

  function renderList(listEl, depth) {
    var isOl = listEl.tagName.toLowerCase() === 'ol';
    var idx = 0;
    var lines = [];
    var li = listEl.firstElementChild;
    while (li) {
      if (li.tagName && li.tagName.toLowerCase() === 'li' && !isSkippable(li)) {
        idx++;
        var subLists = [];
        var parts = [];
        var n = li.firstChild;
        while (n) {
          if (n.nodeType === 1) {
            var lt = n.tagName.toLowerCase();
            if (isSkippable(n)) { n = n.nextSibling; continue; }
            if (lt === 'ul' || lt === 'ol') { subLists.push(n); n = n.nextSibling; continue; }
          }
          var part = nodeToInlinePart(n);
          if (part) parts.push(part);
          n = n.nextSibling;
        }
        var text = escapeLeading(normalizeInline(smartJoin(collapseRepeats(parts, partKey))).trim());
        var marker = isOl ? (idx + '. ') : '- ';
        var indent = '  '.repeat(depth);
        lines.push(indent + marker + text);
        for (var s = 0; s < subLists.length; s++) {
          var sub = renderList(subLists[s], depth + 1);
          if (sub) lines.push(sub);
        }
      }
      li = li.nextElementSibling;
    }
    return lines.join('\n');
  }

  function renderTable(tableEl) {
    var trs = tableEl.querySelectorAll('tr');
    var headerCells = null;
    var bodyRows = [];
    for (var i = 0; i < trs.length; i++) {
      var tr = trs[i];
      if (isSkippable(tr)) continue;
      var cells = [];
      var c = tr.firstElementChild;
      while (c) {
        var ct = c.tagName.toLowerCase();
        if ((ct === 'td' || ct === 'th') && !isSkippable(c)) {
          cells.push(escapeTableCell(normalizeInline(inline(c)).trim()));
        }
        c = c.nextElementSibling;
      }
      if (!cells.length) continue;
      if (headerCells === null) headerCells = cells;
      else bodyRows.push(cells);
    }
    if (!headerCells) return '';
    var lines = [];
    lines.push('| ' + headerCells.join(' | ') + ' |');
    var sep = [];
    for (var h = 0; h < headerCells.length; h++) sep.push('---');
    lines.push('| ' + sep.join(' | ') + ' |');
    for (var r = 0; r < bodyRows.length; r++) lines.push('| ' + bodyRows[r].join(' | ') + ' |');
    return lines.join('\n');
  }

  function renderDl(dlEl) {
    var lines = [];
    var currentTerm = '';
    var child = dlEl.firstElementChild;
    while (child) {
      if (!isSkippable(child)) {
        var t = child.tagName.toLowerCase();
        if (t === 'dt') currentTerm = normalizeInline(inline(child)).trim();
        else if (t === 'dd') {
          var dd = normalizeInline(inline(child)).trim();
          lines.push(currentTerm ? ('**' + currentTerm + '**: ' + dd) : dd);
        }
      }
      child = child.nextElementSibling;
    }
    return lines.join('\n');
  }

  function renderBlockquote(el, out) {
    var directPs = [];
    var c = el.firstElementChild;
    while (c) {
      if (c.tagName.toLowerCase() === 'p' && !isSkippable(c)) directPs.push(c);
      c = c.nextElementSibling;
    }
    var paras = [];
    if (directPs.length) {
      for (var i = 0; i < directPs.length; i++) {
        var t = normalizeInline(inline(directPs[i])).trim();
        if (t) paras.push(t);
      }
    } else {
      var whole = normalizeInline(inline(el)).trim();
      if (whole) paras.push(whole);
    }
    if (!paras.length) return;
    var lines = [];
    for (var j = 0; j < paras.length; j++) {
      if (j > 0) lines.push('>');
      lines.push('> ' + escapeLeading(paras[j]));
    }
    out.push(lines.join('\n'));
  }

  /* Pattern lifted from v5build.mjs's own FAQ-JSON-LD step (#faq
   * [aria-expanded], answer = the nearest p under the button's parent): the
   * accordion's answer paragraph sits a couple of divs below the button,
   * inside the grid-rows collapse wrapper, not as its sibling -
   * querySelector's deep search finds it either way, open or collapsed,
   * since the DOM holds every answer regardless of the accordion's visual
   * state. */
  function handleFaqButton(btn, out) {
    var q = normalizeInline(inline(btn)).trim();
    if (!q) return;
    out.push('**' + q + '**');
    var parent = btn.parentElement;
    var answerP = parent ? parent.querySelector('p') : null;
    if (answerP) {
      var a = normalizeInline(inline(answerP)).trim();
      if (a) {
        out.push(escapeLeading(a));
        consumedAnswers.add(answerP);
      }
    }
  }

  /* A button with no aria-expanded is either a form control (Absenden, mode
   * tabs) or a whole clickable card (the pricing tiles use a real button for
   * this, not an anchor). There is no structural signal that tells those two
   * apart beyond position, so: inside a form, always noise, drop it; outside
   * one, keep its flattened text only if it reads as a sentence (>=3 words) -
   * that is what separates "Website / 3-6 Wochen / ... / Websites ansehen"
   * (a real card) from "Fragen" or "Konsole ausprobieren" (a UI label). */
  function handleGenericButton(btn, out) {
    if (btn.closest('form')) return;
    var t = normalizeInline(inline(btn)).trim();
    if (!t) return;
    var words = t.split(/\s+/).filter(function (w) { return w.length > 0; });
    if (words.length >= 3) out.push(escapeLeading(t));
  }

  function walkBlock(node, out) {
    var buffer = [];
    function flush() {
      if (!buffer.length) return;
      var text = escapeLeading(normalizeInline(smartJoin(collapseRepeats(buffer, partKey))).trim());
      buffer = [];
      if (text) out.push(text);
    }
    var kids = node.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var child = kids[i];
      if (child.nodeType === 3) {
        var textNodePart = textPart(child.data);
        if (textNodePart) buffer.push(textNodePart);
        continue;
      }
      if (child.nodeType !== 1) continue;
      if (isSkippable(child)) continue;
      var tag = child.tagName.toLowerCase();

      if (tag === 'button' && child.hasAttribute('aria-expanded')) {
        flush();
        handleFaqButton(child, out);
        continue;
      }
      if (tag === 'button') {
        flush();
        handleGenericButton(child, out);
        continue;
      }
      if (/^h[1-6]$/.test(tag)) {
        flush();
        if (child === titleH1) continue;
        var lvl = Number(tag.charAt(1));
        var ht = normalizeInline(inline(child)).trim();
        if (ht) out.push('#'.repeat(lvl) + ' ' + ht);
        continue;
      }
      if (tag === 'p') {
        flush();
        if (consumedAnswers.has(child)) continue;
        var pt = escapeLeading(normalizeInline(inline(child)).trim());
        if (pt) out.push(pt);
        continue;
      }
      if (tag === 'ul' || tag === 'ol') {
        flush();
        var listBlock = renderList(child, 0);
        if (listBlock) out.push(listBlock);
        continue;
      }
      if (tag === 'table') {
        flush();
        var tableBlock = renderTable(child);
        if (tableBlock) out.push(tableBlock);
        continue;
      }
      if (tag === 'blockquote') {
        flush();
        renderBlockquote(child, out);
        continue;
      }
      if (tag === 'dl') {
        flush();
        var dlBlock = renderDl(child);
        if (dlBlock) out.push(dlBlock);
        continue;
      }
      if (tag === 'hr') {
        flush();
        out.push('---');
        continue;
      }
      if (tag === 'cite' || tag === 'figcaption') {
        flush();
        var ct = normalizeInline(inline(child)).trim();
        if (ct) out.push('*' + ct + '*');
        continue;
      }
      if (INLINE_AT_BLOCK[tag]) {
        var part = nodeToInlinePart(child);
        if (part) buffer.push(part);
        continue;
      }
      /* Anything else (div, section, article, aside, form, fieldset, figure,
       * address, ...) is a plain layout box: it carries no markdown meaning
       * of its own, so flush what came before it and recurse straight into
       * its children at the same block level. */
      flush();
      walkBlock(child, out);
    }
    flush();
  }

  /* v5build merges 8 widths x 4 states into one document; width differences
   * become media-query classes (invisible to us, fine), but two CSS marquees
   * duplicate their content once in the raw DOM for a seamless scroll loop
   * (no data-v5-when, no aria-hidden - a real, intentional second copy): the
   * "Stimmen" testimonials (six separate blockquote+figcaption blocks, so
   * the duplicate is a repeated run of BLOCKS) and the client-logo strip in
   * the hero (nine bare <span> names with no block boundary between them at
   * all, so the duplicate is a repeated run of PARTS inside what becomes one
   * paragraph). Same bug, two granularities - collapseRepeats runs over
   * whichever array walkBlock/inline hand it, keyed by whatever makes two
   * entries "the same" for that array (plain string equality for blocks,
   * text+kind for inline parts). Largest immediately-repeating run wins so a
   * whole repeated group collapses in one step, not as N separate
   * "duplicate" leftovers. */
  function collapseRepeats(items, keyFn) {
    var out = [];
    var i = 0;
    var n = items.length;
    while (i < n) {
      var matchedK = 0;
      var maxK = Math.floor((n - i) / 2);
      for (var k = maxK; k >= 1; k--) {
        var same = true;
        for (var j = 0; j < k; j++) {
          if (keyFn(items[i + j]) !== keyFn(items[i + k + j])) { same = false; break; }
        }
        if (same) { matchedK = k; break; }
      }
      if (matchedK > 0) {
        for (var c = 0; c < matchedK; c++) out.push(items[i + c]);
        var p = i + matchedK;
        while (p + matchedK <= n) {
          var stillSame = true;
          for (var q = 0; q < matchedK; q++) {
            if (keyFn(items[p + q]) !== keyFn(items[i + q])) { stillSame = false; break; }
          }
          if (!stillSame) break;
          p += matchedK;
        }
        i = p;
      } else {
        out.push(items[i]);
        i++;
      }
    }
    return out;
  }

  function countWords(text) {
    var stripped = text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_|]/g, ' ');
    var m = stripped.match(/\S+/g);
    return m ? m.length : 0;
  }

  /* --------------------------------------------------------------- run it */
  /* var, not const: walkBlock (declared above, called below) closes over
   * this binding and compares against it to skip re-emitting the hero h1 as
   * a body heading once it has already become the document title. */
  var titleH1 = root.querySelector ? root.querySelector('h1') : null;

  var titleText = titleH1 ? normalizeInline(inline(titleH1)).trim() : '';
  if (!titleText) {
    var mt = meta.title ? String(meta.title) : '';
    var sepIdx = mt.indexOf(' · ');
    titleText = (sepIdx > -1 ? mt.slice(0, sepIdx) : mt).trim();
  }

  var contentRoot = (root.querySelector && root.querySelector('main')) || root;
  var contentBlocks = [];
  walkBlock(contentRoot, contentBlocks);
  contentBlocks = collapseRepeats(contentBlocks, function (x) { return x; });

  var headBlocks = [];
  headBlocks.push('# ' + titleText);
  if (meta.description) headBlocks.push('> ' + String(meta.description).trim());
  var srcLines = [];
  if (meta.canonical) srcLines.push('Quelle: ' + meta.canonical);
  if (meta.lang) srcLines.push('Sprache: ' + meta.lang);
  if (srcLines.length) headBlocks.push(srcLines.join('\n'));

  var md = headBlocks.concat(contentBlocks).join('\n\n');
  md = md.replace(/\n{3,}/g, '\n\n').trim() + '\n';

  var headings = (md.match(/^#{1,6} /gm) || []).length;

  return {
    markdown: md,
    words: countWords(md),
    headings: headings,
    links: counts.links,
    skipped: { nav: counts.skippedNav, hidden: counts.skippedHidden }
  };
}`;
