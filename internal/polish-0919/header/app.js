(function(){
  "use strict";
  var gradSeq = 0;

  function icon(id, size){
    size = size || 16;
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="/brand/mccain-icons.svg#'+id+'"></use></svg>';
  }
  function chevronDown(){ return icon('chevron-down', 13); }
  function personIcon(){
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.4"></circle><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"></path></svg>';
  }
  function recallLogo(size){
    size = size || 32;
    var id = 'rg' + (gradSeq++);
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 32 32" aria-hidden="true">' +
      '<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" style="stop-color:var(--mc-orange)"></stop>' +
      '<stop offset=".5" style="stop-color:var(--mc-pink)"></stop>' +
      '<stop offset="1" style="stop-color:var(--mc-violet)"></stop>' +
      '</linearGradient></defs>' +
      '<rect width="32" height="32" rx="8" fill="var(--mc-navy)"></rect>' +
      '<g transform="translate(4 4)">' +
      '<path d="M6 6 L18 8 M6 6 L7 17 M18 8 L7 17 M18 8 L17 18 M7 17 L17 18" stroke="var(--mc-white)" stroke-opacity=".4" stroke-width="1.4" fill="none"></path>' +
      '<circle cx="6" cy="6" r="2.3" fill="var(--mc-white)"></circle>' +
      '<circle cx="7" cy="17" r="2.3" fill="var(--mc-white)"></circle>' +
      '<circle cx="17" cy="18" r="2.3" fill="var(--mc-white)"></circle>' +
      '<circle cx="18" cy="8" r="4.8" fill="url(#'+id+')" fill-opacity=".3"></circle>' +
      '<circle cx="18" cy="8" r="3" fill="url(#'+id+')"></circle>' +
      '</g></svg>';
  }

  var SERVICES = [
    { id:'ai', title:'KI-Tools', desc:'RAG, Agenten, MCP-Server – auf Ihren Daten', bg:'linear-gradient(135deg,var(--mc-pink),var(--mc-violet))', icon:'sparkles' },
    { id:'apps', title:'Web-Apps', desc:'React, Next.js, TypeScript – vom MVP bis zur Skalierung', bg:'linear-gradient(135deg,var(--mc-sky),var(--mc-action))', icon:'code' },
    { id:'web', title:'Websites', desc:'Handgebaut, Lighthouse 100, lesbar für Mensch und KI', bg:'linear-gradient(135deg,var(--mc-orange),var(--mc-coral))', icon:'globe', current:true },
    { id:'software', title:'Software für Unternehmen', desc:'Dashboards, interne Tools, Integrationen – Cloud oder on-premise', bg:'linear-gradient(135deg,var(--mc-violet),var(--mc-action))', icon:'cpu' }
  ];
  var SOFTWARE_ITEMS = [
    { id:'recall', title:'md-recall', desc:'Projektgedächtnis für KI-Teams', status:'Live', markHtml: recallLogo(36) },
    { id:'cms', title:'md-cms', desc:'CMS für Kundenseiten', status:'Live', icon:'layers' },
    { id:'portal', title:'md-portal', desc:'Projekte, Aufgaben, Freigaben', status:'Live', icon:'check' }
  ];
  var SOFTWARE_360 = { id:'360', title:'360', desc:'360°-Analyse Ihrer Website', status:'Bald', icon:'zap', muted:true };
  var LOGIN_TARGETS = [
    { name:'md-cms', desc:'Inhalte, Seiten, Formulare pflegen', domain:'cms.mccain-digital.com', href:'https://cms.mccain-digital.com', icon:'layers' },
    { name:'md-portal', desc:'Projekte, Aufgaben, Freigaben', domain:'portal.mccain-digital.com', href:'https://portal.mccain-digital.com', icon:'check' }
  ];

  function mmCard(item){
    var iconHtml = item.markHtml || ('<span class="mm-icon" style="background:'+(item.muted ? 'var(--mc-grey-300)' : 'var(--mc-navy)')+'">'+icon(item.icon, 18)+'</span>');
    // md-recall already renders its own 36px tile via markHtml (recallLogo), others use a generic navy tile.
    var tile = item.markHtml ? item.markHtml : iconHtml;
    var badgeClass = item.status === 'Live' ? 'is-live' : 'is-soon';
    var tag = item.muted ? 'div' : 'a';
    var hrefAttr = item.muted ? '' : ' href="#" onclick="return false"';
    return '<'+tag+' class="mm-card'+(item.muted?' is-muted':'')+'"'+hrefAttr+(item.muted?' aria-disabled="true"':'')+'>' +
      tile +
      '<span class="mm-copy"><span class="mm-title">'+item.title+' <span class="mm-badge '+badgeClass+'">'+item.status+'</span></span>' +
      '<span class="mm-desc">'+item.desc+'</span></span>' +
      '</'+tag+'>';
  }

  function servicesPanel(){
    var cards = SERVICES.map(function(s){
      return '<a class="mm-card'+(s.current?' is-current':'')+'" href="#" onclick="return false">' +
        (s.current ? '<span class="here-chip">Sie sind hier</span>' : '') +
        '<span class="mm-icon" style="background:'+s.bg+'">'+icon(s.icon,18)+'</span>' +
        '<span class="mm-copy"><span class="mm-title">'+s.title+'</span><span class="mm-desc">'+s.desc+'</span></span>' +
      '</a>';
    }).join('');
    return '<div class="mega-panel" style="width:560px" data-panel="leistungen">' +
      '<div class="mega-grid">'+cards+'</div>' +
      '<div class="mm-foot"><span>Nicht sicher, was passt?</span><a href="#" onclick="return false">Alles im Überblick ›</a></div>' +
    '</div>';
  }
  function servicesPanelPlain(){
    // Same panel, without the "is-current" marking — used for variants A/B/C to show the contrast honestly.
    var cards = SERVICES.map(function(s){
      return '<a class="mm-card" href="#" onclick="return false">' +
        '<span class="mm-icon" style="background:'+s.bg+'">'+icon(s.icon,18)+'</span>' +
        '<span class="mm-copy"><span class="mm-title">'+s.title+'</span><span class="mm-desc">'+s.desc+'</span></span>' +
      '</a>';
    }).join('');
    return '<div class="mega-panel" style="width:560px" data-panel="leistungen">' +
      '<div class="mega-grid">'+cards+'</div>' +
      '<div class="mm-foot"><span>Nicht sicher, was passt?</span><a href="#" onclick="return false">Alles im Überblick ›</a></div>' +
    '</div>';
  }
  function softwarePanel(with360){
    var items = SOFTWARE_ITEMS.slice();
    if (with360) items.push(SOFTWARE_360);
    var cards = items.map(mmCard).join('');
    var width = with360 ? 560 : 660;
    var gridClass = with360 ? '' : ' cols-3';
    return '<div class="mega-panel" style="width:'+width+'px" data-panel="software">' +
      '<div class="mega-grid'+gridClass+'">'+cards+'</div>' +
      '<div class="mm-foot"><span>Unsere eigenen Werkzeuge</span><a href="#" onclick="return false">Alle Produkte im Überblick ›</a></div>' +
    '</div>';
  }
  function stubPanel(label){
    return '<div class="mega-panel stub"><div class="stub-row">'+label+' · Übersicht</div><div class="stub-row">'+label+' · Details</div></div>';
  }

  function loginPanel(){
    var items = LOGIN_TARGETS.map(function(t){
      return '<a class="login-item" href="'+t.href+'" target="_blank" rel="noopener" onclick="return false">' +
        '<span class="login-icon">'+icon(t.icon,15)+'</span>' +
        '<span><span class="login-name">'+t.name+' '+icon('external-link',12)+'</span>' +
        '<span class="login-desc">'+t.desc+'</span>' +
        '<span class="login-domain">'+t.domain+'</span></span>' +
      '</a>';
    }).join('');
    return '<div class="mega-panel login-panel" style="left:auto; right:0" data-panel="login">'+items+'<div class="login-note">Ein Konto für beides.</div></div>';
  }

  /**
   * Renders one nav-bar mock into `el`.
   * opts:
   *  activeId       – which item is "current" (default 'leistungen')
   *  indicator      – null | 'bar' | 'dots' | 'pill' | 'menu'
   *  includeSoftware – boolean
   *  software360    – boolean (only if includeSoftware)
   *  login          – null | 1 | 2 | 3
   *  tight          – boolean, applies the 1280px space-saving CSS
   */
  function renderNav(el, opts){
    opts = opts || {};
    var activeId = opts.activeId || 'leistungen';
    var items = [
      { id:'leistungen', label:'Leistungen', panel: (opts.indicator === 'menu') ? servicesPanel() : servicesPanelPlain() },
      { id:'arbeiten', label:'Arbeiten', panel: stubPanel('Arbeiten') },
      { id:'studio', label:'Studio', panel: stubPanel('Studio') },
      { id:'ablauf', label:'Ablauf', panel: stubPanel('Ablauf') },
      { id:'ressourcen', label:'Ressourcen', panel: stubPanel('Ressourcen') }
    ];
    if (opts.includeSoftware){
      items.push({ id:'software', label:'Software', panel: softwarePanel(!!opts.software360) });
    }
    items.push({ id:'preise', label:'Preise', panel: stubPanel('Preise') });

    var navHtml = items.map(function(it){
      var active = it.id === activeId;
      var indHtml = '';
      var trailHtml = '';
      if (active && opts.indicator === 'bar') indHtml = '<span class="ind-bar" aria-hidden="true"></span>';
      if (active && opts.indicator === 'dots') indHtml = '<span class="ind-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
      if (active && opts.indicator === 'pill') trailHtml = '<span class="ind-pilldot" aria-hidden="true"></span>';
      return '<div class="nav-item-wrap">' +
        '<button class="nav-item"'+(active?' data-active="true"':'')+' data-id="'+it.id+'">' +
          '<span class="lbl">'+it.label+indHtml+'</span>' + trailHtml + chevronDown() +
        '</button>' +
        it.panel +
      '</div>';
    }).join('');

    var loginHtml = '';
    if (opts.login === 1){
      loginHtml = '<div class="nav-item-wrap"><button class="login-btn-text" aria-haspopup="true">Login'+chevronDown()+'</button>'+loginPanel()+'</div>';
    } else if (opts.login === 2){
      loginHtml = '<div class="nav-item-wrap"><button class="login-btn-icon" aria-haspopup="true" aria-label="Login">'+personIcon()+'</button>'+loginPanel()+'</div>';
    } else if (opts.login === 3){
      loginHtml = '<div class="nav-item-wrap"><button class="login-btn-outline" aria-haspopup="true">'+personIcon()+' Anmelden'+chevronDown()+'</button>'+loginPanel()+'</div>';
    }

    el.innerHTML =
      '<nav class="mock-nav'+(opts.tight?' is-tight':'')+'" data-variant="'+(opts.indicator||'none')+'" style="'+(opts.width?('--nav-w:'+opts.width+'px'):'')+'">' +
        '<a class="brand" href="#" onclick="return false"><img src="/brand/mccain-mark-free-color.svg" alt=""><span>mccain digital</span></a>' +
        '<div class="nav-list">'+navHtml+'</div>' +
        '<div class="util">' +
          '<span class="search-ring"><button class="search-pill" onclick="return false"><span style="display:inline-flex">'+icon('search',16)+'</span><span class="search-label">Suche</span></button></span>' +
          '<div class="lang-switch" role="group" aria-label="Sprache"><button class="is-active">DE</button><button>EN</button></div>' +
          loginHtml +
          '<button class="btn-contact" onclick="return false">Kontakt'+icon('chevron-right',16)+'</button>' +
        '</div>' +
      '</nav>';
  }

  // ---- Section 1: four indicator variants ----
  renderNav(document.querySelector('[data-variant-slot="s1a"]').appendChild(document.createElement('div')), { indicator:'bar' });
  renderNav(document.querySelector('[data-variant-slot="s1b"]').appendChild(document.createElement('div')), { indicator:'dots' });
  renderNav(document.querySelector('[data-variant-slot="s1c"]').appendChild(document.createElement('div')), { indicator:'pill' });
  renderNav(document.querySelector('[data-variant-slot="s1d"]').appendChild(document.createElement('div')), { indicator:'menu' });
  // wrap each rendered nav in a .stage for consistent framing
  document.querySelectorAll('[data-variant-slot] > div').forEach(function(div){
    div.classList.add('stage');
    var bg = document.createElement('div'); bg.className = 'stage-bg'; bg.setAttribute('aria-hidden','true');
    div.insertBefore(bg, div.firstChild);
    var wrap = document.createElement('div'); wrap.className = 'stage-inner';
    while (div.children.length > 1) wrap.appendChild(div.children[1]);
    div.appendChild(wrap);
  });

  // ---- Section 4: software menu, with/without 360 ----
  renderNav(document.querySelector('[data-variant-slot="s4a"]').appendChild(document.createElement('div')), { activeId:'software', indicator:'pill', includeSoftware:true, software360:false });
  renderNav(document.querySelector('[data-variant-slot="s4b"]').appendChild(document.createElement('div')), { activeId:'software', indicator:'pill', includeSoftware:true, software360:true });

  // ---- Section 5: login variants ----
  renderNav(document.querySelector('[data-variant-slot="s5a"]').appendChild(document.createElement('div')), { indicator:'pill', login:1 });
  renderNav(document.querySelector('[data-variant-slot="s5b"]').appendChild(document.createElement('div')), { indicator:'pill', login:2 });
  renderNav(document.querySelector('[data-variant-slot="s5c"]').appendChild(document.createElement('div')), { indicator:'pill', login:3 });

  // re-run the stage-wrapping for the slots added above (s4/s5 use the same [data-variant-slot] selector already handled once — so wrap those newly added too)
  document.querySelectorAll('[data-variant-slot] > div:not(.stage)').forEach(function(div){
    div.classList.add('stage');
    var bg = document.createElement('div'); bg.className = 'stage-bg'; bg.setAttribute('aria-hidden','true');
    div.insertBefore(bg, div.firstChild);
    var wrap = document.createElement('div'); wrap.className = 'stage-inner';
    while (div.children.length > 1) wrap.appendChild(div.children[1]);
    div.appendChild(wrap);
  });

  // ---- Section 6: combo ----
  renderNav(document.getElementById('combo-1440'), { indicator:'pill', includeSoftware:true, software360:true, login:2 });
  var combo1280Host = document.createElement('div');
  document.getElementById('combo-1280-wrap').appendChild(combo1280Host);
  renderNav(combo1280Host, { indicator:'pill', includeSoftware:true, software360:true, login:2, tight:true, width:1280 });

  // Measure whether the 1280 combo nav actually fits in one row without wrap/overlap.
  function checkFit(){
    var nav = combo1280Host.querySelector('.mock-nav');
    if (!nav) return;
    var items = nav.querySelectorAll('.nav-item, .search-pill, .lang-switch, .login-btn-icon, .btn-contact, .brand');
    var maxBottom = 0, minTop = Infinity;
    items.forEach(function(n){ var r = n.getBoundingClientRect(); minTop = Math.min(minTop, r.top); maxBottom = Math.max(maxBottom, r.bottom); });
    var singleRow = (maxBottom - minTop) < 50; // one line of controls, nothing wrapped below
    var navRect = nav.getBoundingClientRect();
    var overflowsRight = items[items.length-1] ? items[items.length-1].getBoundingClientRect().right > navRect.right + 1 : false;
    var note = document.getElementById('fit-note');
    if (singleRow && !overflowsRight){
      note.innerHTML = '<b>passt</b> — alle Elemente in einer Zeile, kein Umbruch, keine Überlappung, bei 1280 px Breite.';
    } else {
      note.innerHTML = '<b style="color:var(--mc-danger)">passt nicht</b> — Umbruch oder Überlappung erkannt, siehe Screenshot.';
    }
  }
  window.addEventListener('load', function(){ setTimeout(checkFit, 50); });

  // ---- Footer (section 3) ----
  var FOOTER_COLS = [
    { title:'Leistungen', links:[ ['Überblick',false], ['KI-Tools',false], ['Web-Apps',false], ['Websites',true], ['Software für Unternehmen',false] ] },
    { title:'Arbeiten', links:[ ['md-recall',false], ['Preise',false], ['mccain-digital.com',false] ] },
    { title:'Studio', links:[ ['Team',false], ['News',false], ['Ablauf',false], ['Zum Konfigurator',false], ['Fragen & Antworten',false], ['Kontakt',false] ] },
    { title:'Ressourcen', links:[ ['Zum Konfigurator',false], ['md-recall',false], ['llms.txt & KI-Lesbarkeit',false], ['Stack & Werkzeuge',false], ['Styleguide',false], ['Marke',false], ['WordPress oder handgeschrieben',false], ['ChatGPT oder eigenes RAG',false], ['Next.js',false], ['MCP-Server',false], ['RAG',false], ['ERP-Integration',false] ] },
    { title:'Rechtliches', links:[ ['Impressum',false], ['Datenschutz',false], ['AGB',false], ['Widerruf',false] ] }
  ];
  function footerCol(col, variantClass, chip){
    var links = col.links.map(function(l){
      var label = l[0], active = l[1];
      var cls = 'footer-link' + (variantClass ? ' '+variantClass : '') + (active ? ' is-active' : '');
      var dot = variantClass === 'fv1' ? '<span class="fdot" aria-hidden="true"></span>' : '';
      var chipHtml = (active && chip) ? '<span class="chip-here">Diese Seite</span>' : '';
      return '<a class="'+cls+'" href="#" onclick="return false">'+dot+label+chipHtml+'</a>';
    }).join('');
    return '<div class="footer-col"><h3>'+col.title+'</h3>'+links+'</div>';
  }
  document.getElementById('footer-full').innerHTML =
    '<div class="footer-grid">' + FOOTER_COLS.map(function(c){ return footerCol(c, 'fv2', false); }).join('') + '</div>';

  var leistCol = FOOTER_COLS[0];
  document.getElementById('footer-variants').innerHTML =
    '<div class="fstrip-card"><div class="fs-label">VARIANTE 1 · repariert</div>' + footerCol(leistCol, 'fv1', false) + '</div>' +
    '<div class="fstrip-card"><div class="fs-label">VARIANTE 2 · Akzentstreifen</div>' + footerCol(leistCol, 'fv2', false) + '</div>' +
    '<div class="fstrip-card"><div class="fs-label">VARIANTE 3 · Chip</div>' + footerCol(leistCol, 'fv3', true) + '</div>';

  // ---- Section 2: scroll demos ----
  var SD_SECTIONS = [
    { label:'Ablauf', text:'Von der Anfrage zum Klick: Vorschlag, Design, Umsetzung, Übergabe – jeder Schritt mit Termin.' },
    { label:'Referenzen', text:'md-recall und mccain-digital.com als eigene Referenzen – beide live, beide vermessen.' },
    { label:'Preise', text:'Kein Preisschild von der Stange: eine Zahl innerhalb von 48 Stunden nach Ihrer Beschreibung.' },
    { label:'Kontakt', text:'Eine Antwort innerhalb von 24 Stunden, von einer der zwei Personen, die es bauen würden.' }
  ];
  function sdHeader(){
    return '<div class="sd-header"><img src="/brand/mccain-mark-free-color.svg" alt="">' +
      '<span class="sd-word">mccain digital</span><span class="sd-fake-nav">Leistungen · Arbeiten · Studio</span></div>';
  }
  function sdHero(){
    return '<div class="sd-hero"><h5>Websites, die niemand zusammenklickt.</h5>' +
      '<p>Eigenes Design statt Vorlage, Ladezeit unter einer Sekunde, Lighthouse 100 – und ein CMS nur dann, wenn Sie es wirklich brauchen.</p></div>';
  }
  function sdSections(){
    return SD_SECTIONS.map(function(s){
      return '<div class="sd-section" data-label="'+s.label+'"><h6>'+s.label+'</h6><p>'+s.text+'</p></div>';
    }).join('');
  }

  var demoA = document.getElementById('sd-a');
  demoA.innerHTML = sdHeader() +
    '<div class="sd-crumb"><span class="sd-crumb-pill"><b>Leistungen</b> › Websites</span></div>' +
    sdHero() + sdSections();

  var demoB = document.getElementById('sd-b');
  demoB.innerHTML = sdHeader() +
    '<div class="sd-crumb"><span class="sd-crumb-pill"><b>Leistungen</b> › Websites <span class="sd-crumb-current"></span></span><div class="sd-progress-track"><div class="sd-progress"></div></div></div>' +
    sdHero() + sdSections();

  var demoC = document.getElementById('sd-c');
  demoC.innerHTML = sdHeader() + sdHero() + sdSections();
  var ringWrap = document.createElement('div');
  ringWrap.className = 'sd-ring-wrap';
  ringWrap.innerHTML =
    '<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">' +
      '<circle cx="17" cy="17" r="14" fill="none" stroke="var(--mc-line)" stroke-width="3"></circle>' +
      '<circle class="sd-ring-fg" cx="17" cy="17" r="14" fill="none" stroke="var(--mc-action)" stroke-width="3" stroke-linecap="round" transform="rotate(-90 17 17)"></circle>' +
    '</svg>' +
    '<span class="sd-ring-copy"><b>Websites</b><span class="sd-ring-current">Anfang</span></span>';
  demoC.appendChild(ringWrap);
  var ringFg = ringWrap.querySelector('.sd-ring-fg');
  var CIRC = 2 * Math.PI * 14;
  ringFg.style.strokeDasharray = CIRC.toFixed(1);

  function wireScrollDemo(demo, variant){
    var hero = demo.querySelector('.sd-hero');
    var crumb = demo.querySelector('.sd-crumb');
    var currentEl = demo.querySelector('.sd-crumb-current');
    var progress = demo.querySelector('.sd-progress');
    var sections = Array.prototype.slice.call(demo.querySelectorAll('.sd-section'));
    var ring = demo.querySelector('.sd-ring-fg');
    var ringLabel = demo.querySelector('.sd-ring-current');
    var ringWrapEl = demo.querySelector('.sd-ring-wrap');

    function onScroll(){
      var top = demo.scrollTop;
      var heroH = hero.offsetHeight;
      var pastHero = top > heroH - 60;
      if (crumb) crumb.classList.toggle('is-visible', pastHero);
      if (ringWrapEl) ringWrapEl.classList.toggle('is-visible', pastHero);
      var max = demo.scrollHeight - demo.clientHeight;
      var pct = max > 0 ? Math.min(1, Math.max(0, top / max)) : 0;
      if (progress) progress.style.width = (pct * 100) + '%';
      if (ring) ring.style.strokeDashoffset = (CIRC * (1 - pct)).toFixed(1);
      var current = null;
      sections.forEach(function(s){ if (s.offsetTop - 90 <= top) current = s; });
      var label = current ? current.getAttribute('data-label') : '';
      if (currentEl) currentEl.textContent = label ? ('› ' + label) : '';
      if (ringLabel) ringLabel.textContent = label || 'Anfang';
    }
    demo.addEventListener('scroll', onScroll, { passive:true });
    onScroll();
  }
  wireScrollDemo(demoA, 'a');
  wireScrollDemo(demoB, 'b');
  wireScrollDemo(demoC, 'c');

  // ---- click-to-toggle for mega panels / login (keyboard + touch, on top of CSS :hover) ----
  document.addEventListener('click', function(e){
    var trigger = e.target.closest('.nav-item, .login-btn-text, .login-btn-icon, .login-btn-outline');
    var openWrap = document.querySelector('.nav-item-wrap > .mega-panel.is-open');
    if (trigger){
      var wrap = trigger.closest('.nav-item-wrap');
      var panel = wrap ? wrap.querySelector('.mega-panel') : null;
      if (panel){
        var wasOpen = panel.classList.contains('is-open');
        document.querySelectorAll('.mega-panel.is-open').forEach(function(p){ p.classList.remove('is-open'); });
        if (!wasOpen) panel.classList.add('is-open');
      }
      return;
    }
    if (openWrap && !e.target.closest('.mega-panel')){
      document.querySelectorAll('.mega-panel.is-open').forEach(function(p){ p.classList.remove('is-open'); });
    }
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape'){
      document.querySelectorAll('.mega-panel.is-open').forEach(function(p){ p.classList.remove('is-open'); });
    }
  });
})();
