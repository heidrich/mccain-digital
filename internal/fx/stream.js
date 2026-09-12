/*!
 * stream.js — the McCain Digital "gradient stream".
 *
 * The pixelated colour ribbon from the start page, lifted out of the Claude
 * Design export (mccain-design-system/reference/McCain Digital v2.dc.html,
 * class Component -> startGradient(canvas)) into a framework-free module.
 *
 * FORMAT: classic script (no modules, no build step). Load with
 *     <script src="/stream.js" defer></script>
 * and it publishes window.McDStream. It also assigns module.exports when a
 * CommonJS loader is present, purely so verify_shader.js can require it.
 *
 * The vertex + fragment shader below are byte-identical to the export.
 * Everything else is a faithful re-implementation of the wiring around it,
 * with the React/DCLogic dependencies (this.mouse, this.accent(),
 * Component.GRAD, this.reduced(), this.rootEl) replaced by local state.
 *
 * API
 *   McDStream.startStream(canvas, opts) -> instance | null
 *     instance = { ok, mode, gl, canvas, destroy(), setColors(), setAccent(),
 *                  setConfig(), setScrollOffset(), draw(), colors() }
 *   McDStream.GRAD / .FLOW / .PRESETS / .DEFAULTS
 *   McDStream.autoInit(root)      // scans for canvas[data-stream]
 *
 * Deviations from the export are all marked "DEVIATION:" in comments.
 */
(function (global) {
  'use strict';

  /* ==================================================================== *
   * 1. SHADER SOURCE — verbatim from the export.                          *
   *    dc file lines 1412..1431. Do not reformat: verify_shader.js       *
   *    compares these two strings against the ones in the .dc.html.      *
   * ==================================================================== */

  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

  var FS = 'precision mediump float;uniform float u_time;uniform float u_px;uniform float u_w;uniform float u_mode;uniform float u_scroll;uniform float u_vh;uniform vec2 u_mouse;uniform float u_hole;uniform vec4 u_cfg;uniform vec2 u_res;uniform vec3 u_c0,u_c1,u_c2,u_c3,u_c4,u_c5;' +
    'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}' +
    'float snoise(vec2 v){const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.0*dot(m,g);}' +
    'float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}' +
    'vec3 across(float k){vec3 c=mix(u_c4,u_c0,smoothstep(0.0,0.3,k));c=mix(c,u_c1,smoothstep(0.3,0.56,k));c=mix(c,u_c2,smoothstep(0.56,0.8,k));c=mix(c,u_c3,smoothstep(0.8,1.0,k));return c;}' +
    'void main(){vec2 fc=gl_FragCoord.xy;vec2 dv=fc-u_mouse;float dist=length(dv);float hole=smoothstep(u_hole+1.0,0.0,dist);fc+=normalize(dv+vec2(0.001,0.0))*u_hole*0.85*hole*hole;vec2 cell=floor(fc/u_px);vec2 cc=(cell+0.5)*u_px;vec2 uv=cc/u_res;float asp=u_res.x/u_res.y;vec2 p=vec2(uv.x*asp,uv.y);float t=u_time*0.10;float yy=1.0-uv.y;' +
    'float cx=asp*(u_cfg.x+u_cfg.y*yy*yy+u_cfg.z*sin(yy*3.14159))+0.04*asp*sin(t*0.6+yy*2.0)+0.05*asp*snoise(vec2(yy*1.4+t*0.25,3.1));cx=mix(cx,asp-cx,u_cfg.w);' +
    'float yDoc=u_scroll+(1.0-uv.y)*u_vh;float th=yDoc/2400.0*6.2832+0.18;float cxg=asp*(0.5+0.56*sin(th))+0.04*asp*sin(t*0.6+yDoc/500.0);float hwg=asp*(0.12+0.03*sin(th*2.0));' +
    'cx=mix(cx,cxg,u_mode);float hw=mix(asp*(0.075+0.17*yy)*u_w,hwg,u_mode);float yA=mix(yy,yDoc/max(u_vh,1.0),u_mode);float dim=mix(1.0,mix(1.0,0.6,smoothstep(700.0,1100.0,yDoc)),u_mode);float d=(p.x-cx)/hw;float ad=abs(d);' +
    'float nl=44.0;float lane=floor((d*0.5+0.5)*nl);float lh=hash(vec2(lane,7.0));float laneOn=step(0.16,lh);' +
    'float along=yA*2.6-u_time*(0.05+0.10*lh);' +
    'float v=snoise(vec2(lane*0.9,along*4.6+lh*20.0));float stream=smoothstep(0.12,0.78,v);' +
    'float spark=step(0.80,snoise(vec2(lane*1.7+3.0,along*6.0-u_time*0.7)));' +
    'float edge=1.0-smoothstep(0.45,1.02,ad);float dith=step(hash(cell+floor(u_time*0.5)*0.0),edge*edge*1.15+0.02);' +
    'float fine=step(0.3,hash(cell*0.37+vec2(floor(along*40.0),lane)));float lit=max(stream*edge*fine,spark*edge)*dith*laneOn;' +
    'float k=clamp(d*0.5+0.5+0.15*sin(along*1.2),0.0,1.0);vec3 col=across(k);col=mix(col,vec3(1.0),spark*0.5);' +
    'vec2 f=fract(fc/u_px);float sq=step(0.22,f.x)*step(0.22,f.y);' +
    'float a=lit*sq*(0.5+0.5*stream);float base=(1.0-smoothstep(0.55,1.04,ad))*0.07*laneOn;' +
    'float rim=exp(-pow((dist-u_hole*0.62)/(u_hole*0.13+0.001),2.0))*step(1.0,u_hole);col=mix(col,vec3(1.0),0.55*rim);float alpha=min(1.0,max(a,base)*dim*(1.0-hole*hole*0.92)*(1.0+0.9*rim));gl_FragColor=vec4(col*alpha,alpha);}';

  /* ==================================================================== *
   * 2. PALETTES                                                           *
   * ==================================================================== */

  /* Component.GRAD, dc line 802. */
  var GRAD = ['#FFB46B', '#FF5A8C', '#C05CFF', '#5FC3FF', '#FF8FB8'];

  /* Component.accent() default, dc line 987. */
  var ACCENT = '#635BFF';

  /* Component.FLOW, dc line 803 — the per-service palettes the start page
     already uses for the service-tile blooms (flow(), dc line 988). */
  var FLOW = {
    ai:       ['#FF5A8C', '#FFB46B', '#C05CFF'],
    apps:     ['#6E7BFF', '#5FC3FF', '#C05CFF'],
    web:      ['#FFB46B', '#FF5A8C', '#FF8A5B'],
    software: ['#C05CFF', '#6E7BFF', '#FF5A8C'],
    recall:   ['#6E7BFF', '#C05CFF', '#5FC3FF'],
    site:     ['#5FC3FF', '#FFB46B', '#FF5A8C']
  };

  /* across(k) lands each uniform exactly at these k values, so resampling an
     arbitrary stop list at them reproduces the ramp's shape with new hues.
     k = 0 -> u_c4, 0.30 -> u_c0, 0.56 -> u_c1, 0.80 -> u_c2, 1.00 -> u_c3.
     u_c5 is declared in the shader and NEVER READ — see stream.md. */
  var RAMP_K = [0, 0.30, 0.56, 0.80, 1.00];
  var RAMP_SLOT = [4, 0, 1, 2, 3];

  /* What the start page uploads: [G0,G1,G2,accent,G3,G4]  (dc line 1438). */
  function homeColors(accent) {
    return [GRAD[0], GRAD[1], GRAD[2], accent || ACCENT, GRAD[3], GRAD[4]];
  }

  var PRESETS = {
    home: null, /* null => homeColors() */
    ai: FLOW.ai, apps: FLOW.apps, web: FLOW.web, software: FLOW.software,
    recall: FLOW.recall, site: FLOW.site
  };

  var DEFAULTS = {
    mode: null,          /* null => read data-global; else 0 (panel) | 1 (global) */
    cfg: [0.57, 0.45, 0, 0],   /* u_cfg, dc line 1440 default '0.57,0.45,0,0' */
    w: 1,                /* u_w */
    px: 3,               /* u_px — cell size in BACKING pixels */
    scale: 3 / 3.5,      /* backing store / CSS px — dc: const k = 3 / 3.5 */
    t0: 40,              /* u_time seed in seconds; dc: (now-start)/1000 + 40 */
    accent: ACCENT,
    colors: null,        /* six hexes, c0..c5 — bypasses ramp/preset entirely */
    ramp: null,          /* hex stops; 5 = verbatim, otherwise resampled */
    rampSpace: 'oklab',  /* 'oklab' | 'srgb' — resampling space only */
    preset: null,        /* key of PRESETS */
    pointer: null,       /* null => true in global mode, false in panel mode */
    holeRadius: 130,     /* CSS px */
    holePulse: 240,      /* CSS px, for 380 ms after a pointerdown */
    scrollOffset: 0,     /* added to window.scrollY before u_scroll */
    scroll: null,        /* () => number, overrides window.scrollY entirely */
    motion: null,        /* null => prefers-reduced-motion; false => one frame */
    reducedScroll: false,
    pauseWhenHidden: true,
    measureEveryFrame: false,
    fallback: 'paint',   /* 'paint' | 'none' | function(canvas, opts) */
    points: null,        /* element | selector of a [data-pt] layer */
    avoidSelector: '[data-avoid], [data-hero-copy], h1, h2, h3, h4, p, li, button, a, img, svg, form, footer',
    avoidSkip: 'header, [data-pt-layer], [role="dialog"]',
    avoidRoot: null,     /* element | selector; defaults to document.body */
    avoidEvery: 2        /* seconds between avoid-rect rebuilds (dc: > 2) */
  };

  /* ==================================================================== *
   * 3. small helpers                                                      *
   * ==================================================================== */

  function hexRgb(h) { /* dc line 1009 */
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function rgbHex(c) {
    return '#' + c.map(function (v) {
      return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    }).join('').toUpperCase();
  }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smoothstep(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1); return t * t * (3 - 2 * t); }
  function mix3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  /* --- OKLab, for resampling short brand palettes ---------------------- *
   * across() mixes the six uniforms in stored sRGB. That is fine between
   * neighbouring stops, but resampling a 3-stop palette like FLOW.site
   * (#5FC3FF -> #FFB46B -> #FF5A8C) in sRGB puts a literal grey (#BFBAA6)
   * at k=0.30, because cyan->amber crosses the grey axis. Resampling in
   * OKLab keeps the five stops on a perceptually even path, so the sRGB
   * segments the shader interpolates between them stay short and clean. */
  function sLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function lSrgb(c) { var v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055; return clamp(v, 0, 1) * 255; }
  function toOklab(rgb) {
    var r = sLin(rgb[0]), g = sLin(rgb[1]), b = sLin(rgb[2]);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }
  function fromOklab(L) {
    var a = L[0] + 0.3963377774 * L[1] + 0.2158037573 * L[2];
    var b = L[0] - 0.1055613458 * L[1] - 0.0638541728 * L[2];
    var c = L[0] - 0.0894841775 * L[1] - 1.2914855480 * L[2];
    a = a * a * a; b = b * b * b; c = c * c * c;
    return [lSrgb(4.0767416621 * a - 3.3077115913 * b + 0.2309699292 * c),
            lSrgb(-1.2684380046 * a + 2.6097574011 * b - 0.3413193965 * c),
            lSrgb(-0.0041960863 * a - 0.7034186147 * b + 1.7076147010 * c)];
  }

  /* Piecewise-linear sample of a hex stop list, in 'oklab' (default) or
     'srgb' (exact GLSL mix() behaviour, if you want to match a hand-tuned
     five-stop ramp). */
  function sampleStops(stops, t, space) {
    if (stops.length === 1) return hexRgb(stops[0]);
    var x = clamp(t, 0, 1) * (stops.length - 1);
    var i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
    var a = hexRgb(stops[i]), b = hexRgb(stops[i + 1]);
    if (space === 'srgb') return mix3(a, b, f);
    return fromOklab(mix3(toOklab(a), toOklab(b), f));
  }

  function resolveColors(o) {
    if (o.colors && o.colors.length >= 6) return o.colors.slice(0, 6);
    var stops = o.ramp || (o.preset ? PRESETS[o.preset] : null);
    if (!stops || !stops.length) return homeColors(o.accent);
    var out = new Array(6);
    if (stops.length === 5) {
      /* exactly five stops -> used verbatim, no resampling */
      for (var j = 0; j < 5; j++) out[RAMP_SLOT[j]] = stops[j];
    } else {
      for (var i = 0; i < RAMP_K.length; i++) {
        out[RAMP_SLOT[i]] = rgbHex(sampleStops(stops, RAMP_K[i], o.rampSpace));
      }
    }
    out[5] = out[1]; /* unread by the shader; filled so nothing is undefined */
    return out;
  }

  function prefersReduced() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ==================================================================== *
   * 4. POINTER — one set of window listeners for all instances.           *
   *    Port of dc onPointer / onPointerDown (lines 1181-1182).            *
   * ==================================================================== */

  var Pointer = {
    refs: 0,
    m: { x: -9999, y: -9999, t: 0 },
    pulseT: 0,
    onMove: function (e) {
      if (e.pointerType === 'touch') return;
      Pointer.m = { x: e.clientX, y: e.clientY, t: performance.now() };
    },
    onDown: function (e) {
      if (e.pointerType === 'touch') return;
      Pointer.m = { x: e.clientX, y: e.clientY, t: performance.now() };
      Pointer.pulseT = performance.now();
    },
    retain: function () {
      if (this.refs++ === 0) {
        addEventListener('pointermove', this.onMove, { passive: true });
        addEventListener('pointerdown', this.onDown, { passive: true });
      }
    },
    release: function () {
      if (--this.refs <= 0) {
        this.refs = 0;
        removeEventListener('pointermove', this.onMove);
        removeEventListener('pointerdown', this.onDown);
      }
    }
  };

  /* ==================================================================== *
   * 5. startStream                                                        *
   * ==================================================================== */

  function startStream(canvas, opts) {
    if (!canvas || !canvas.getContext) return null;
    var o = readOptions(canvas, opts || {});

    var gl = null;
    try {
      /* dc line 1410 — exactly these context attributes. */
      gl = canvas.getContext('webgl', {
        antialias: false, alpha: true, premultipliedAlpha: true,
        depth: false, powerPreference: 'low-power'
      });
    } catch (e) { /* ignore */ }
    if (!gl) return degrade(canvas, o);

    var colors = resolveColors(o);
    var prog = null, U = {}, buf = null;
    var raf = 0, visible = true, alive = true, lost = false;
    var tStart = performance.now();
    var reduced = (o.motion === false) || (o.motion == null && prefersReduced());
    var wantPointer = o.pointer == null ? (o.mode === 1) : !!o.pointer;
    var smx = -9999, smy = -9999, holeR = 0;
    var W = 0, H = 0, cssW = 0, cssH = 0;
    var pts = o.points ? makePointLayer(o) : null;

    if (wantPointer) Pointer.retain();

    /* ---- program ---------------------------------------------------- */
    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        if (global.console) console.warn('[stream] ' + gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    }
    function build() {
      var v = compile(gl.VERTEX_SHADER, VS), f = compile(gl.FRAGMENT_SHADER, FS);
      if (!v || !f) return false;
      prog = gl.createProgram();
      gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);

      /* One full-viewport triangle. No gl.clear and no gl.enable(BLEND):
         the shader writes PREMULTIPLIED rgba and the canvas element itself is
         composited over the page. Enabling BLEND here would double-blend. */
      buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      ['u_time', 'u_res', 'u_px', 'u_w', 'u_mode', 'u_scroll', 'u_vh', 'u_mouse', 'u_hole', 'u_cfg',
       'u_c0', 'u_c1', 'u_c2', 'u_c3', 'u_c4', 'u_c5'].forEach(function (n) {
        U[n] = gl.getUniformLocation(prog, n);   /* null for u_c5 is fine: */
      });                                        /* uniform3f(null,..) no-ops */

      uploadColors();
      uploadConfig();
      gl.uniform1f(U.u_px, o.px);
      W = H = 0;                                 /* force a viewport re-set */
      return true;
    }

    function uploadColors() {
      if (!prog) return;
      gl.useProgram(prog);
      for (var i = 0; i < 6; i++) {
        var c = hexRgb(colors[i]);
        gl.uniform3f(U['u_c' + i], c[0] / 255, c[1] / 255, c[2] / 255);
      }
    }
    function uploadConfig() {
      if (!prog) return;
      gl.useProgram(prog);
      gl.uniform4f(U.u_cfg, o.cfg[0], o.cfg[1], o.cfg[2], o.cfg[3]);
      gl.uniform1f(U.u_w, o.w);
      gl.uniform1f(U.u_mode, o.mode);
    }

    /* ---- sizing ------------------------------------------------------ *
     * dc resize():  k = 3/3.5;  W = round(rect.width * k)  (>= 2)
     * DEVIATION: the export calls getBoundingClientRect() inside every
     * draw(). That is a forced layout per frame. We measure on start, on
     * ResizeObserver, on window resize, and only per frame when
     * opts.measureEveryFrame is true. Same numbers, one layout instead of
     * 60 per second.                                                      */
    function measure() {
      var r = canvas.getBoundingClientRect();
      var w = Math.max(2, Math.round(r.width * o.scale));
      var h = Math.max(2, Math.round(r.height * o.scale));
      cssW = canvas.clientWidth || r.width || 1;
      cssH = canvas.clientHeight || r.height || 1;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
        if (prog) { gl.useProgram(prog); gl.uniform1f(U.u_px, o.px); }
      }
      W = w; H = h;
    }

    function scrollY() {
      var s = o.scroll ? o.scroll() : (global.scrollY || global.pageYOffset || 0);
      return s + o.scrollOffset;
    }

    /* ---- frame ------------------------------------------------------- */
    function draw() {
      if (!prog || lost) return;
      if (o.measureEveryFrame || !W) measure();
      gl.useProgram(prog);

      var tm = (performance.now() - tStart) / 1000 + o.t0;
      gl.uniform1f(U.u_scroll, scrollY());
      gl.uniform1f(U.u_vh, cssH || 1);

      if (wantPointer) {
        var m = Pointer.m, now = performance.now();
        var kk = canvas.width / Math.max(1, cssW);
        if (smx < -5000) { smx = m.x; smy = m.y; }
        smx += (m.x - smx) * 0.22;
        smy += (m.y - smy) * 0.22;
        var target = (m.x > -1000 && now - m.t < 1600)
          ? (now - Pointer.pulseT < 380 ? o.holePulse : o.holeRadius) : 0;
        holeR += (target - holeR) * 0.12;
        gl.uniform2f(U.u_mouse, smx * kk, (cssH - smy) * kk);
        gl.uniform1f(U.u_hole, holeR * kk);
      } else {
        gl.uniform2f(U.u_mouse, -9999, -9999);
        gl.uniform1f(U.u_hole, 0);
      }

      if (pts) pts.layout(tm, o.mode === 1 ? null : canvas);

      gl.uniform1f(U.u_time, tm);
      gl.uniform2f(U.u_res, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /* dc loop(): self-destructs when the canvas leaves the document,
       returns without rescheduling while off-screen, and — this is the whole
       reduced-motion path — schedules no rAF at all when `reduced`. */
    function loop() {
      raf = 0;
      if (!alive) return;
      if (!canvas.isConnected) { destroy(); return; }
      if (!visible) return;
      draw();
      if (!reduced) raf = requestAnimationFrame(loop);
    }
    function kick() { if (alive && !raf && visible) { if (reduced) { draw(); } else { raf = requestAnimationFrame(loop); } } }

    if (!build()) { if (wantPointer) Pointer.release(); return degrade(canvas, o); }

    /* ---- observers --------------------------------------------------- *
     * Wired BEFORE the first loop() so that a canvas that is already
     * detached (loop -> destroy) tears down a complete set of listeners.  */
    var ro = null, io = null;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(function () { measure(); draw(); });
      ro.observe(canvas);
    }
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) kick();
        else if (raf) { cancelAnimationFrame(raf); raf = 0; }
      });
      io.observe(canvas);
    }

    function onWinResize() { measure(); if (reduced) draw(); }
    addEventListener('resize', onWinResize, { passive: true });

    function onVis() {
      if (!o.pauseWhenHidden) return;
      if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
      else kick();
    }
    document.addEventListener('visibilitychange', onVis);

    /* Reduced motion freezes u_scroll at whatever it was on the last draw.
       Opt in to a scroll-only repaint (one frame per scroll tick, no rAF loop). */
    var onScroll = null;
    if (reduced && o.reducedScroll && o.mode === 1) {
      var pending = false;
      onScroll = function () {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () { pending = false; if (alive) draw(); });
      };
      addEventListener('scroll', onScroll, { passive: true });
    }

    /* DEVIATION (robustness): the export does not handle context loss. A tab
       left open for hours, or a GPU reset, kills the canvas silently. */
    function onLost(e) { e.preventDefault(); lost = true; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    function onRestored() { lost = false; prog = null; U = {}; if (build()) { measure(); kick(); } }
    canvas.addEventListener('webglcontextlost', onLost, false);
    canvas.addEventListener('webglcontextrestored', onRestored, false);

    measure();
    loop();

    function destroy() {
      if (!alive) return;
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      removeEventListener('resize', onWinResize);
      document.removeEventListener('visibilitychange', onVis);
      if (onScroll) removeEventListener('scroll', onScroll);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (pts) pts.reset();
      if (wantPointer) Pointer.release();
      try { var ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) { /* ignore */ }
    }

    return {
      ok: true,
      mode: o.mode,
      gl: gl,
      canvas: canvas,
      options: o,
      colors: function () { return colors.slice(); },
      /* dc applyAccent() calls i.setColors() on every live stream. */
      setColors: function (next) {
        if (Array.isArray(next)) colors = next.slice(0, 6);
        else if (next && typeof next === 'object') colors = resolveColors(Object.assign({}, o, next));
        uploadColors(); if (reduced) draw();
      },
      setAccent: function (hex) { colors[3] = hex; uploadColors(); if (reduced) draw(); },
      setConfig: function (cfg, w, mode) {
        if (cfg) o.cfg = cfg;
        if (w != null) o.w = w;
        if (mode != null) o.mode = mode;
        uploadConfig(); if (reduced) draw();
      },
      setScrollOffset: function (n) { o.scrollOffset = +n || 0; if (reduced) draw(); },
      draw: draw,
      destroy: destroy
    };
  }

  /* ==================================================================== *
   * 6. OPTIONS — object first, then data-* attributes, then defaults.     *
   * ==================================================================== */

  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }

  function readOptions(canvas, given) {
    var o = {};
    Object.keys(DEFAULTS).forEach(function (k) { o[k] = DEFAULTS[k]; });
    Object.keys(given).forEach(function (k) { if (given[k] !== undefined) o[k] = given[k]; });
    var A = function (n) { return canvas.getAttribute(n); };

    if (given.mode == null) o.mode = canvas.hasAttribute('data-global') ? 1 : 0;
    else o.mode = +o.mode ? 1 : 0;

    /* dc line 1440: (canvas.getAttribute('data-cfg') || '0.57,0.45,0,0') */
    if (given.cfg == null && A('data-cfg')) o.cfg = A('data-cfg').split(',').map(Number);
    if (given.w == null && A('data-w')) o.w = num(A('data-w'), 1);
    if (given.px == null && A('data-px')) o.px = num(A('data-px'), 3);
    if (given.scale == null && A('data-scale')) o.scale = num(A('data-scale'), 3 / 3.5);
    if (given.accent == null && A('data-accent')) o.accent = A('data-accent');
    if (given.ramp == null && A('data-ramp')) o.ramp = A('data-ramp').split(',').map(function (s) { return s.trim(); });
    if (given.preset == null) {
      var p = A('data-stream') || A('data-preset');
      if (p && PRESETS[p] !== undefined) o.preset = p;
    }
    if (given.scrollOffset == null && A('data-scroll-offset')) o.scrollOffset = num(A('data-scroll-offset'), 0);
    if (given.points == null && A('data-points')) o.points = A('data-points');
    if (given.pointer == null && canvas.hasAttribute('data-no-pointer')) o.pointer = false;
    if (given.holeRadius == null && A('data-hole')) o.holeRadius = num(A('data-hole'), 130);

    if (!o.cfg || o.cfg.length < 4 || o.cfg.some(function (n) { return !isFinite(n); })) o.cfg = DEFAULTS.cfg.slice();
    o.scale = clamp(o.scale, 0.1, 2);
    o.px = clamp(o.px, 1, 24);
    return o;
  }

  /* ==================================================================== *
   * 7. DEGRADE — no WebGL.                                                *
   *    'none'  -> leave the canvas empty (it is aria-hidden anyway).      *
   *    'paint' -> one 2D pass with the same geometry, lane grid and       *
   *               colour ramp, with the two snoise() terms replaced by    *
   *               the shader's own hash(). It is the same picture minus   *
   *               the noise character, and it costs one paint, no loop.   *
   * ==================================================================== */

  function degrade(canvas, o) {
    if (typeof o.fallback === 'function') { try { o.fallback(canvas, o); } catch (e) { /* ignore */ } }
    else if (o.fallback === 'paint') { try { paintStatic(canvas, o); } catch (e) { /* ignore */ } }
    return { ok: false, mode: o.mode, gl: null, canvas: canvas, options: o,
      colors: function () { return resolveColors(o); },
      setColors: function () {}, setAccent: function () {}, setConfig: function () {},
      setScrollOffset: function () {}, draw: function () {}, destroy: function () {} };
  }

  function jsHash(x, y) {
    var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function acrossJS(rgb, k) {
    var c = mix3(rgb[4], rgb[0], smoothstep(0.0, 0.3, k));
    c = mix3(c, rgb[1], smoothstep(0.3, 0.56, k));
    c = mix3(c, rgb[2], smoothstep(0.56, 0.8, k));
    c = mix3(c, rgb[3], smoothstep(0.8, 1.0, k));
    return c;
  }

  function paintStatic(canvas, o) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var r = canvas.getBoundingClientRect();
    var w = Math.max(2, Math.round((r.width || 1) * o.scale));
    var h = Math.max(2, Math.round((r.height || 1) * o.scale));
    var px = o.px;
    while ((w / px) * (h / px) > 400000) px += 1;    /* cheap guard */
    canvas.width = w; canvas.height = h;

    var cols = resolveColors(o).map(hexRgb);
    var img = ctx.createImageData(w, h), D = img.data;
    var asp = w / h, vh = canvas.clientHeight || r.height || h;
    var scroll = (o.scroll ? o.scroll() : 0) + o.scrollOffset;
    var mirror = o.cfg[3] > 0.5;

    for (var cy = 0; cy * px < h; cy++) {
      for (var cx0 = 0; cx0 * px < w; cx0++) {
        var ccx = (cx0 + 0.5) * px, ccy = (cy + 0.5) * px;
        var uvx = ccx / w, uvy = ccy / h;
        var yy = 1 - uvy, pxv = uvx * asp, cxv, hw, yA, dim = 1;

        if (o.mode === 1) {
          var yDoc = scroll + (1 - uvy) * vh;
          var th = yDoc / 2400 * 6.2832 + 0.18;
          cxv = asp * (0.5 + 0.56 * Math.sin(th));
          hw = asp * (0.12 + 0.03 * Math.sin(th * 2));
          yA = yDoc / Math.max(vh, 1);
          dim = 1 + (0.6 - 1) * smoothstep(700, 1100, yDoc);
        } else {
          cxv = asp * (o.cfg[0] + o.cfg[1] * yy * yy + o.cfg[2] * Math.sin(yy * 3.14159));
          if (mirror) cxv = asp - cxv;
          hw = asp * (0.075 + 0.17 * yy) * o.w;
          yA = yy;
        }

        var d = (pxv - cxv) / hw, ad = Math.abs(d);
        if (ad > 1.2) continue;
        var lane = Math.floor((d * 0.5 + 0.5) * 44);
        var lh = jsHash(lane, 7);
        if (lh < 0.16) continue;                       /* laneOn */
        var along = yA * 2.6;
        var v = jsHash(lane * 0.9, along * 4.6 + lh * 20) * 2 - 1;
        var stream = smoothstep(0.12, 0.78, v);
        var edge = 1 - smoothstep(0.45, 1.02, ad);
        /* dith: the shader's floor(u_time*0.5)*0.0 is always 0, so this
           stipple is static — reproduce it exactly. step(a,b) = b>=a. */
        var dith = (edge * edge * 1.15 + 0.02) >= jsHash(cx0, cy) ? 1 : 0;
        var fine = jsHash(cx0 * 0.37 + Math.floor(along * 40), cy * 0.37 + lane) >= 0.3 ? 1 : 0;
        var lit = stream * edge * fine * dith;
        var a = lit * (0.5 + 0.5 * stream);
        var base = (1 - smoothstep(0.55, 1.04, ad)) * 0.07;
        var alpha = Math.min(1, Math.max(a, base) * dim);
        if (alpha < 0.004) continue;
        var col = acrossJS(cols, clamp(d * 0.5 + 0.5 + 0.15 * Math.sin(along * 1.2), 0, 1));

        /* the shader's sq gutter: step(0.22, fract(fc/px)) on both axes */
        for (var sy = 0; sy < px; sy++) {
          if (sy / px < 0.22) continue;
          var py = cy * px + sy; if (py >= h) break;
          for (var sx = 0; sx < px; sx++) {
            if (sx / px < 0.22) continue;
            var pxx = cx0 * px + sx; if (pxx >= w) break;
            var i = (py * w + pxx) * 4;
            D[i] = col[0]; D[i + 1] = col[1]; D[i + 2] = col[2]; D[i + 3] = alpha * 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  /* ==================================================================== *
   * 8. POINT LAYER (optional) — the floating monospace spec chips.        *
   *    Port of movePointsGlobal (dc 1358) and movePoints (dc 1391), the   *
   *    JS mirrors of the shader's cxg/hwg (global) and cfg curve (panel). *
   *    The hover/modal coupling (setHover, ptHot, openModal) is NOT       *
   *    ported — that was React state. Layout and fading only.            *
   * ==================================================================== */

  /* dc line 1371 / 1389 — the per-chip lateral offsets, in half-widths. */
  var D_OFF = [-0.62, 0.5, -0.3, 0.68, 0.05, -0.7, 0.32, -0.45, 0.6, -0.15, 0.2, -0.55, 0.42, -0.05];

  function makePointLayer(o) {
    var layer = typeof o.points === 'string' ? document.querySelector(o.points) : o.points;
    if (!layer) return null;
    var pool = null, ptT = -1e9, avoid = [], span = 0;

    function rebuild(tm) {
      var sy0 = global.scrollY || 0;
      avoid = [];
      var root = (typeof o.avoidRoot === 'string' ? document.querySelector(o.avoidRoot) : o.avoidRoot) || document.body;
      root.querySelectorAll(o.avoidSelector).forEach(function (a) {
        if (o.avoidSkip && a.closest(o.avoidSkip)) return;
        var c = a.getBoundingClientRect();
        if (c.width < 24 || c.height < 10) return;
        avoid.push({ left: c.left - 12, right: c.right + 12, top: c.top + sy0 - 22, bottom: c.bottom + sy0 + 10 });
      });
      var prev = pool || [];
      pool = Array.prototype.slice.call(layer.querySelectorAll('[data-pt]')).map(function (el, i) {
        var p = prev[i] && prev[i].el === el ? prev[i] : { off: 0, on: false, x: 0, y: 0 };
        return { el: el, i: i, off: p.off, on: p.on, x: p.x, y: p.y,
                 w: el.offsetWidth || 120, h: el.offsetHeight || 26 };
      });
      span = Math.max(global.innerHeight * 2, document.documentElement.scrollHeight) + 240;
      ptT = tm;
    }

    function layoutGlobal(tm) {
      if (!pool || (tm - ptT) > o.avoidEvery) rebuild(tm);
      var N = pool.length; if (!N) return;
      var W = global.innerWidth, VH = global.innerHeight;
      var sy = (o.scroll ? o.scroll() : (global.scrollY || 0)) + o.scrollOffset;
      var t = tm * 0.10;
      for (var i = 0; i < N; i++) {
        var n = pool[i], el = n.el;
        var speed = 34 + 30 * (((i * 7) % 6) / 5);
        var yDoc = ((i / N) * span + (tm - n.off) * speed) % span - 120;
        var yV = yDoc - sy;
        if (yV < -60 || yV > VH + 20) {
          if (n.on) { n.on = false; el.style.opacity = '0'; el.style.visibility = 'hidden'; }
          continue;
        }
        var th = yDoc / 2400 * 6.2832 + 0.18;
        var cx = W * (0.5 + 0.56 * Math.sin(th)) + 0.04 * W * Math.sin(t * 0.6 + yDoc / 500);
        var hw = W * (0.12 + 0.03 * Math.sin(th * 2.0));
        var x = cx + D_OFF[i % D_OFF.length] * hw, cw = n.w;
        var fade = Math.min(1, (W - 12 - x - cw) / 60, (x - 10) / 60);
        for (var k = 0; k < avoid.length; k++) {
          var a = avoid[k];
          if (yDoc > a.top && yDoc < a.bottom && x + cw > a.left && x < a.right) { fade = 0; break; }
        }
        if (!n.on) { n.on = true; el.style.visibility = 'visible'; }
        n.x = x; n.y = yV;
        el.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(yV) + 'px,0)';
        el.style.opacity = Math.max(0, fade).toFixed(2);
      }
    }

    function layoutPanel(tm, canvas) {
      if (!pool || (tm - ptT) > o.avoidEvery) {
        pool = Array.prototype.slice.call(layer.querySelectorAll('[data-pt]'))
          .map(function (el, i) { return { el: el, i: i, w: el.offsetWidth || 120 }; });
        var rr = canvas.getBoundingClientRect();
        avoid = Array.prototype.slice.call(layer.parentNode.querySelectorAll('[data-hero-copy], [data-avoid]'))
          .map(function (a) {
            var c = a.getBoundingClientRect();
            return { left: c.left - rr.left - 12, right: c.right - rr.left + 12,
                     top: c.top - rr.top - 24, bottom: c.bottom - rr.top + 8 };
          });
        ptT = tm;
      }
      var N = pool.length; if (!N) return;
      var r = canvas.getBoundingClientRect(), W = r.width, H = r.height;
      if (W < 10 || H < 10) return;
      var asp = W / H, t = tm * 0.10, mirror = o.cfg[3] > 0.5;
      for (var i = 0; i < N; i++) {
        var sp = 0.036 + 0.024 * ((i * 7) % 5) / 4, ph = ((i / N) + tm * sp) % 1, yy = ph;
        var cx = asp * (o.cfg[0] + o.cfg[1] * yy * yy + o.cfg[2] * Math.sin(yy * Math.PI)) + 0.04 * asp * Math.sin(t * 0.6 + yy * 2.0);
        if (mirror) cx = asp - cx;
        var hw = asp * (0.075 + 0.17 * yy) * o.w;
        var x = ((cx + D_OFF[i % D_OFF.length] * hw) / asp) * W, y = yy * H;
        var fade = Math.min(1, ph / 0.08, (1 - ph) / 0.08, (W - 150 - x) / 90, (x - 10) / 60);
        var cw = pool[i].w;
        for (var k = 0; k < avoid.length; k++) {
          var a = avoid[k];
          if (y > a.top && y < a.bottom && x + cw > a.left && x < a.right) { fade = 0; break; }
        }
        var el = pool[i].el;
        el.style.visibility = 'visible';
        el.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)';
        el.style.opacity = Math.max(0, fade).toFixed(2);
      }
    }

    return {
      layout: function (tm, canvas) { if (canvas) layoutPanel(tm, canvas); else layoutGlobal(tm); },
      reset: function () {
        if (!pool) return;
        pool.forEach(function (n) { n.el.style.opacity = '0'; n.el.style.visibility = 'hidden'; });
        pool = null;
      }
    };
  }

  /* ==================================================================== *
   * 9. AUTO-INIT                                                          *
   *    <canvas data-stream="ai" data-global ...></canvas>                *
   *    Skip with data-stream-manual.                                      *
   * ==================================================================== */

  var live = new (global.Map || Object)();

  function autoInit(root) {
    var scope = root || document;
    var out = [];
    scope.querySelectorAll('canvas[data-stream]').forEach(function (cv) {
      if (cv.hasAttribute('data-stream-manual')) return;
      if (live.has && live.has(cv)) return;
      var inst = startStream(cv, {});
      if (inst && live.set) live.set(cv, inst);
      if (inst) out.push(inst);
    });
    return out;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { autoInit(); });
    else autoInit();
  }

  var API = {
    startStream: startStream,
    autoInit: autoInit,
    paintStatic: paintStatic,
    resolveColors: resolveColors,
    GRAD: GRAD, FLOW: FLOW, PRESETS: PRESETS, ACCENT: ACCENT,
    DEFAULTS: DEFAULTS, RAMP_K: RAMP_K, RAMP_SLOT: RAMP_SLOT,
    VS: VS, FS: FS
  };

  global.McDStream = API;
  if (typeof module === 'object' && module.exports) module.exports = API;

})(typeof window !== 'undefined' ? window : this);
