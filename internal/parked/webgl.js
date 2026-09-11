/* ============================================================
   McCain Digital — v3 WebGL layer.
   Three opt-in effects, all raw WebGL2 (no three.js — that would
   be 150KB+ for what fits in a few hundred lines here):

     A  hero wordmark as a GPU particle field  (~50k points)
     B  shader dissolve between ink and paper bands
     C  per-pixel displacement on the case covers

   Every effect is additive: if WebGL is missing, the context is
   lost, or the visitor asked for reduced motion, nothing runs and
   the existing 2D pixel engine stays exactly as it is.
   Toggle them live with the panel bottom-left (state in
   localStorage) so all three can be compared on the real page.
   ============================================================ */
(() => {
  "use strict";

  const d = document;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(devicePixelRatio || 1, 2);

  const KEY = "mcd-v3-fx";
  // All three are OFF by default — owner call 2026-08-02: the GPU wordmark
  // lost the character of the 2D engine, the dissolve didn't fit the section
  // rhythm, and the image displacement read badly. The page runs on the
  // proven 2D engine; the layer stays here, switchable, for another look.
  const DEFAULTS = { a: false, b: false, c: false };

  function readFx() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch { /* private mode */ }
    return { ...DEFAULTS };
  }
  const FX = readFx();

  function glOk() {
    try {
      const c = d.createElement("canvas");
      return !!c.getContext("webgl2");
    } catch { return false; }
  }

  /* ---------- tiny GL helpers ---------- */
  function program(gl, vs, fs) {
    const mk = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
    return p;
  }

  function buffer(gl, data, loc, size) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return b;
  }

  // read a CSS custom property as [r,g,b] 0..1
  function cssRGB(el, prop, fallback) {
    const v = getComputedStyle(el).getPropertyValue(prop).trim() || fallback;
    const probe = d.createElement("span");
    probe.style.color = v;
    d.body.appendChild(probe);
    const m = getComputedStyle(probe).color.match(/[\d.]+/g);
    probe.remove();
    return m ? [m[0] / 255, m[1] / 255, m[2] / 255] : [0, 0, 0];
  }

  /* ============================================================
     A — HERO WORDMARK AS A GPU PARTICLE FIELD
     The 2D engine samples ~3k particles on the CPU. Here the same
     rasterized text becomes ~50k points pushed around in the
     vertex shader, so the field can be an order of magnitude finer
     and still hold 60fps.
     ============================================================ */
  const VS_A = `#version 300 es
  in vec2 aHome; in vec3 aCol; in vec2 aSeed;
  uniform vec2 uRes; uniform vec2 uPtr; uniform float uR, uForce, uProg, uTime, uSize;
  out vec3 vCol; out float vFade;
  void main() {
    vec2 p = aHome;

    // assemble: points fly in from a scattered ring on first paint
    vec2 scatter = aHome + vec2(cos(aSeed.x * 6.283), sin(aSeed.y * 6.283)) * (140.0 + aSeed.x * 260.0);
    float prog = clamp((uProg - aSeed.x * 0.35) / 0.65, 0.0, 1.0);
    prog = 1.0 - pow(1.0 - prog, 3.0);            // easeOutCubic
    p = mix(scatter, p, prog);

    // the pointer is a black hole: push out with a smooth falloff,
    // plus a per-particle swirl so the crater edge churns
    vec2 dv = p - uPtr;
    float dist = length(dv);
    if (dist < uR && uR > 0.0) {
      float f = pow(1.0 - dist / uR, 2.0) * uForce;
      vec2 n = dist > 0.001 ? dv / dist : vec2(0.0, 1.0);
      vec2 tang = vec2(-n.y, n.x);
      p += n * f * uR * 0.55 + tang * sin(uTime * 2.0 + aSeed.y * 6.283) * f * 9.0;
    }

    vCol = aCol;
    vFade = prog;
    vec2 clip = (p / uRes) * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    gl_PointSize = uSize;
  }`;

  const FS_A = `#version 300 es
  precision mediump float;
  in vec3 vCol; in float vFade; out vec4 o;
  void main() { o = vec4(vCol, vFade); }`;

  function heroField(h1) {
    const hosts = [...h1.querySelectorAll(".ph")];
    if (!hosts.length || !window.PixelFX || !PixelFX.rasterize) return null;

    const cv = d.createElement("canvas");
    cv.className = "gl-hero";
    cv.setAttribute("aria-hidden", "true");
    // position it BEFORE it enters the document: an unstyled canvas defaults
    // to 300x150 in the flow and would inflate the h1 we are about to measure
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2";
    h1.appendChild(cv);
    const gl = cv.getContext("webgl2", { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) { cv.remove(); return null; }

    let prog, vao, count = 0, raf = null, t0 = 0;
    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, r: 0, tr: 0 };
    // finer than the 2D engine (2.4/1.7) but still an open grid — at 1.4 the
    // field packs so tight it reads as solid type and loses our pixel texture
    const GAP = 2.0, SIZE = 1.9;

    try { prog = program(gl, VS_A, FS_A); }
    catch { cv.remove(); return null; }

    function layout() {
      const hb = h1.getBoundingClientRect();
      cv.width = Math.ceil(hb.width * DPR);
      cv.height = Math.ceil(hb.height * DPR);
      gl.viewport(0, 0, cv.width, cv.height);
      return hb;
    }

    // the 2D engine sets display:block INLINE on its canvases, so a CSS class
    // can't switch them off — toggle the inline value directly
    function twoD(show) {
      hosts.forEach((h) => {
        const c = h.querySelector("canvas");
        if (c) c.style.display = show ? "block" : "none";
      });
    }

    function collect(done) {
      const hb = layout();
      const homes = [], cols = [], seeds = [];
      let pending = hosts.length;

      hosts.forEach((host) => {
        const txt = host.querySelector(".ph-txt") || host;
        const r = txt.getBoundingClientRect();
        const w = Math.ceil(r.width), h = Math.ceil(r.height);
        const ox = r.left - hb.left, oy = r.top - hb.top;
        if (w < 2 || h < 2) { if (!--pending) done(homes, cols, seeds); return; }

        PixelFX.rasterize(txt, w, h, (img, imgW) => {
          if (img) {
            const data = img.data;
            for (let y = 0; y < h; y += GAP) {
              for (let x = 0; x < w; x += GAP) {
                // the ImageData is DPR-scaled — sample on its own grid
                const sx = Math.floor(x * DPR), sy = Math.floor(y * DPR);
                const i = (sy * imgW + sx) * 4;
                if (data[i + 3] < 120) continue;
                homes.push((ox + x) * DPR, (oy + y) * DPR);
                cols.push(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
                seeds.push(Math.random(), Math.random());
              }
            }
          }
          if (!--pending) done(homes, cols, seeds);
        });
      });
    }

    function build() {
      collect((homes, cols, seeds) => {
        count = homes.length / 2;
        if (!count) return;
        gl.useProgram(prog);
        vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        buffer(gl, new Float32Array(homes), gl.getAttribLocation(prog, "aHome"), 2);
        buffer(gl, new Float32Array(cols), gl.getAttribLocation(prog, "aCol"), 3);
        buffer(gl, new Float32Array(seeds), gl.getAttribLocation(prog, "aSeed"), 2);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // the DOM text and the 2D canvases hand over to the GPU field
        h1.classList.add("gl-on");
        twoD(false);
        t0 = performance.now();
        if (!raf) raf = requestAnimationFrame(tick);
      });
    }

    const U = {};
    function uni(n) { return U[n] !== undefined ? U[n] : (U[n] = gl.getUniformLocation(prog, n)); }

    function tick(now) {
      raf = requestAnimationFrame(tick);
      // ease the crater so it trails the cursor instead of snapping
      ptr.x += (ptr.tx - ptr.x) * 0.22;
      ptr.y += (ptr.ty - ptr.y) * 0.22;
      ptr.r += (ptr.tr - ptr.r) * 0.10;

      const el = (now - t0) / 1000;
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.uniform2f(uni("uRes"), cv.width, cv.height);
      gl.uniform2f(uni("uPtr"), ptr.x, ptr.y);
      gl.uniform1f(uni("uR"), ptr.r);
      gl.uniform1f(uni("uForce"), 1.0);
      gl.uniform1f(uni("uProg"), Math.min(1, el / 1.5));
      gl.uniform1f(uni("uTime"), el);
      gl.uniform1f(uni("uSize"), SIZE * DPR);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, count);
    }

    h1.addEventListener("pointermove", (e) => {
      const b = cv.getBoundingClientRect();
      ptr.tx = (e.clientX - b.left) * DPR;
      ptr.ty = (e.clientY - b.top) * DPR;
      if (ptr.x < -9000) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
      ptr.tr = 120 * DPR;
    });
    h1.addEventListener("pointerleave", () => { ptr.tr = 0; });

    let rt = null;
    addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => { h1.classList.remove("gl-on"); build(); }, 200);
    });

    cv.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      cancelAnimationFrame(raf); raf = null;
      h1.classList.remove("gl-on");   // fall back to the 2D engine
      twoD(true);
    });

    build();
    return { canvas: cv };
  }

  /* ============================================================
     B — SHADER DISSOLVE BETWEEN INK AND PAPER
     The seam between a dark band and a light one stops being a
     hard edge: the ink breaks into blocks that shrink away and
     become paper, driven by how far the seam has scrolled.
     ============================================================ */
  const VS_B = `#version 300 es
  in vec2 aPos; out vec2 vUv;
  void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FS_B = `#version 300 es
  precision mediump float;
  in vec2 vUv; out vec4 o;
  uniform vec3 uInk, uPaper, uAcc;
  uniform float uProg, uGrid, uAspect;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    vec2 cell = floor(vec2(uv.x * uGrid * uAspect, uv.y * uGrid));
    float n = hash(cell);
    // Mostly y-driven so the band ALWAYS reads ink at its top edge and paper
    // at its bottom one — only the position of the dissolve front travels
    // with scroll. (A front that runs past the edges repainted the section
    // above in paper and left a hard seam floating in the dark band.)
    float th = n * 0.35 + uv.y * 0.65;
    float front = mix(0.55, 0.05, uProg);
    float t = smoothstep(front, front + 0.30, th);
    t = max(t, smoothstep(0.80, 1.0, uv.y));   // bottom edge is always paper
    vec3 col = mix(uInk, uPaper, t);
    // a thin band of logo-yellow rides the dissolve front
    float edge = 1.0 - smoothstep(0.0, 0.14, abs(t - 0.5));
    col = mix(col, uAcc, edge * 0.85);
    o = vec4(col, 1.0);
  }`;

  function bandDissolve(section) {
    const prev = section.previousElementSibling;
    if (!prev) return null;

    const wrapEl = d.createElement("div");
    wrapEl.className = "gl-seam";
    wrapEl.setAttribute("aria-hidden", "true");
    const cv = d.createElement("canvas");
    wrapEl.appendChild(cv);
    section.appendChild(wrapEl);

    const gl = cv.getContext("webgl2", { antialias: false });
    if (!gl) { wrapEl.remove(); return null; }

    let prog;
    try { prog = program(gl, VS_B, FS_B); }
    catch { wrapEl.remove(); return null; }

    gl.useProgram(prog);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    buffer(gl, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.getAttribLocation(prog, "aPos"), 2);

    const uProg = gl.getUniformLocation(prog, "uProg");
    const uGrid = gl.getUniformLocation(prog, "uGrid");
    const uAsp = gl.getUniformLocation(prog, "uAspect");

    function colors() {
      gl.uniform3fv(gl.getUniformLocation(prog, "uInk"), cssRGB(prev, "--bg", "#0d0c0a"));
      gl.uniform3fv(gl.getUniformLocation(prog, "uPaper"), cssRGB(section, "--bg", "#f6f4ef"));
      gl.uniform3fv(gl.getUniformLocation(prog, "uAcc"), cssRGB(d.documentElement, "--acc", "#f5c518"));
    }

    function size() {
      const r = wrapEl.getBoundingClientRect();
      cv.width = Math.max(2, Math.ceil(r.width * DPR));
      cv.height = Math.max(2, Math.ceil(r.height * DPR));
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform1f(uAsp, r.width / Math.max(1, r.height));
    }

    let raf = null;
    function draw() {
      raf = null;
      const r = wrapEl.getBoundingClientRect();
      // 0 while the seam is still below the fold, 1 once it has travelled up
      // past the middle of the viewport — the dissolve completes on screen
      const p = 1 - (r.top + r.height * 0.5) / (innerHeight * 0.85);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.uniform1f(uProg, Math.max(0, Math.min(1, p)));
      gl.uniform1f(uGrid, 34);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };

    size(); colors(); draw();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", () => { size(); colors(); schedule(); }, { passive: true });
    // theme switch repaints with the new band colours
    new MutationObserver(() => setTimeout(() => { colors(); schedule(); }, 620))
      .observe(d.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    section.classList.add("has-seam");
    return { canvas: cv };
  }

  /* ============================================================
     C — PER-PIXEL DISPLACEMENT ON THE CASE COVERS
     The 2D wormhole is CPU-bound (hence its 4px sample stride).
     On the GPU the whole image displaces at full resolution, with
     chromatic split at the crater rim.
     ============================================================ */
  const FS_C = `#version 300 es
  precision mediump float;
  in vec2 vUv; out vec4 o;
  uniform sampler2D uTex;
  uniform vec2 uPtr, uRes;
  uniform float uR, uAmt;
  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    vec2 px = uv * uRes;
    vec2 dv = px - uPtr;
    float dist = length(dv);
    float f = uR > 0.0 ? pow(max(0.0, 1.0 - dist / uR), 2.2) : 0.0;
    vec2 n = dist > 0.001 ? dv / dist : vec2(0.0);
    vec2 off = n * f * uAmt / uRes;
    // chromatic split grows with the push, so the rim fringes
    float ca = f * 0.006;
    o = vec4(
      texture(uTex, uv + off + vec2(ca, 0.0)).r,
      texture(uTex, uv + off).g,
      texture(uTex, uv + off - vec2(ca, 0.0)).b,
      1.0);
  }`;

  function imageDisplace(box) {
    const img = box.querySelector("img");
    if (!img) return null;

    const cv = d.createElement("canvas");
    cv.className = "gl-img";
    cv.setAttribute("aria-hidden", "true");
    box.appendChild(cv);

    const gl = cv.getContext("webgl2", { antialias: false });
    if (!gl) { cv.remove(); return null; }

    let prog;
    try { prog = program(gl, VS_B, FS_C); }
    catch { cv.remove(); return null; }

    gl.useProgram(prog);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    buffer(gl, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.getAttribLocation(prog, "aPos"), 2);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    let ready = false;
    function upload() {
      if (!img.complete || !img.naturalWidth) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); }
      catch { return; }          // tainted canvas — silently stay 2D
      ready = true;
      size(); draw();
      // only NOW may the real <img> be hidden — doing it earlier would blank
      // the cover for every lazy-loaded image until its texture arrived
      box.classList.add("gl-on");
      // and the 2D wormhole steps aside; two craters on one cover fight
      const two = box.querySelector(".px-canvas");
      if (two) two.style.display = "none";
    }
    img.complete ? upload() : img.addEventListener("load", upload, { once: true });

    function size() {
      const r = box.getBoundingClientRect();
      cv.width = Math.max(2, Math.ceil(r.width * DPR));
      cv.height = Math.max(2, Math.ceil(r.height * DPR));
      gl.viewport(0, 0, cv.width, cv.height);
    }

    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, r: 0, tr: 0 };
    let raf = null;

    function draw() {
      if (!ready) return;
      ptr.x += (ptr.tx - ptr.x) * 0.2;
      ptr.y += (ptr.ty - ptr.y) * 0.2;
      ptr.r += (ptr.tr - ptr.r) * 0.12;
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform2f(gl.getUniformLocation(prog, "uRes"), cv.width, cv.height);
      gl.uniform2f(gl.getUniformLocation(prog, "uPtr"), ptr.x, ptr.y);
      gl.uniform1f(gl.getUniformLocation(prog, "uR"), ptr.r);
      gl.uniform1f(gl.getUniformLocation(prog, "uAmt"), 90 * DPR);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // keep animating while the crater is still easing open or shut
      if (Math.abs(ptr.r - ptr.tr) > 0.5 || ptr.tr > 0) raf = requestAnimationFrame(draw);
      else raf = null;
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(draw); };

    const host = box.closest(".case") || box;
    host.addEventListener("pointermove", (e) => {
      const b = cv.getBoundingClientRect();
      ptr.tx = (e.clientX - b.left) * DPR;
      ptr.ty = (e.clientY - b.top) * DPR;
      if (ptr.x < -9000) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
      ptr.tr = 150 * DPR;
      wake();
    });
    host.addEventListener("pointerleave", () => { ptr.tr = 0; wake(); });
    addEventListener("resize", () => { size(); wake(); }, { passive: true });

    cv.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      ready = false;
      box.classList.remove("gl-on");   // the real <img> comes back
    });

    return { canvas: cv };
  }

  /* ============================================================
     TOGGLE PANEL — so all three can be judged on the real page
     ============================================================ */
  function panel(supported) {
    const box = d.createElement("div");
    box.className = "fxpanel";
    box.innerHTML =
      '<b>WebGL</b>' +
      ["a", "b", "c"].map((k) =>
        `<label><input type="checkbox" data-fx="${k}"${FX[k] ? " checked" : ""}>${k.toUpperCase()}</label>`
      ).join("") +
      `<span class="fxnote">${supported ? "reload on change" : "no WebGL here"}</span>`;
    d.body.appendChild(box);

    box.addEventListener("change", (e) => {
      const k = e.target.dataset.fx;
      if (!k) return;
      FX[k] = e.target.checked;
      try { localStorage.setItem(KEY, JSON.stringify(FX)); } catch { /* ignore */ }
      location.reload();
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    const supported = glOk() && !reduced;
    panel(supported);
    if (!supported) return;

    if (FX.a) {
      const h1 = d.querySelector(".hero-h");
      if (h1) heroField(h1);
    }
    if (FX.b) {
      // every paper band that follows an ink one gets the dissolve seam
      d.querySelectorAll(".band--paper").forEach((s) => {
        if (s.previousElementSibling) bandDissolve(s);
      });
    }
    if (FX.c) {
      d.querySelectorAll(".case-img").forEach(imageDisplace);
    }
  }

  // after the 2D engine has laid out its fields, and after fonts —
  // the rasterizer needs the real face to sample the right shapes
  if (d.readyState === "complete") setTimeout(boot, 400);
  else addEventListener("load", () => setTimeout(boot, 400));
})();
