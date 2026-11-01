'use strict';
// Look: cinematic film essay (story-video original; guide: references/styles/cinematic.md). A narrated film, not a trailer:
// 2.39:1 letterbox, slow dolly moves through 2.5D parallax scenery, shallow depth of field with rack focus on anchors,
// film grain, halation, an anamorphic flare, volumetric light and floating dust, chapter slates between sections, cinema
// subtitles carrying the narration, fades through black. Block vocabulary: references/looks/cinematic.md
// Performance: each scenery layer is painted once per section in a sharp and a blurred version (lazily, two sections
// cached); parallax moves those images and a focus pull crossfades them, so no full-screen blur runs per frame.
// Trailer mode (per section and per block): `fade: [in, out]` (0 = a hard cut), `exposure` keyframes, a shared
// `scape.id` so cuts stay in one landscape and one camera move, and `cut` / `type` / `flash` blocks.
// Globals owned here: none besides this closure's result (CINEMATIC).
const CINEMATIC = (() => {
  const F = { serif: 'CINE', serifL: 'CINEL', serifI: 'CINEI', sans: 'SANS' };
  const BAR = Math.round((H - W / 2.39) / 2), FH = H - 2 * BAR, CX = W / 2, CY = BAR + FH / 2, HORIZON = BAR + FH * .63;
  const LW = Math.round(W * 1.18);   // layers are wider than the frame so parallax never shows an edge
  const DEPTHS = [.12, .32, .58, 1];  // far haze, far ridge, subject plane, foreground
  const SKY = {
    dusk: ['#0b1620', '#26455a', '#d98a4e', '#f2c58f'], night: ['#04060b', '#0c1828', '#1b2d42', '#3a5068'],
    dawn: ['#141d2e', '#5d6684', '#e3ad86', '#f6dcb8'], day: ['#5f88a6', '#9dbccb', '#e6dcc6', '#f4ecdc'],
  };
  const CACHE = new Map();   // section index -> { sky, layers: [{ sharp, soft, depth }], sun }
  let GRAIN = [];
  const SPAN = {};   // scape.id -> [first a, last b]: sections sharing a landscape share one camera move

  const tx = (s, x, y, o = {}) => {
    ctx.save(); if (o.track) ctx.letterSpacing = `${o.track}px`; if (o.blur > .4) ctx.filter = `blur(${o.blur.toFixed(1)}px)`;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 28; }
    text(s, x, y, { font: o.font || F.serif, size: o.size || 80, color: o.color || '#efe6d8', align: o.align || 'center', alpha: o.alpha ?? 1, jit: false, maxW: o.maxW || 1500 });
    ctx.restore();
  };

  // ---------------------------------------------------------------- scenery: painted once per section, per layer
  function scapeOf(sec) {
    const sc = { preset: 'mountains', time: 'dusk', seed: 7, pan: 140, dolly: .07, ...(sec.scape || {}) };
    return sc;
  }
  function ridge(g, r, base, amp, rough, color) {   // a silhouette skyline from summed sines
    const a = [r() * 6, r() * 6, r() * 6], f = [.0023 + r() * .001, .0061 + r() * .002, .017 + r() * .006];
    g.fillStyle = color; g.beginPath(); g.moveTo(0, FH);
    for (let x = 0; x <= LW; x += 6) g.lineTo(x, base - amp * (.55 * Math.sin(x * f[0] + a[0]) + .3 * Math.sin(x * f[1] + a[1]) + rough * Math.sin(x * f[2] + a[2])));
    g.lineTo(LW, FH); g.closePath(); g.fill();
  }
  function skyline(g, r, base, hMax, color, windows) {
    let x = -20;
    while (x < LW) {
      const w = 40 + r() * 110, h = hMax * (.25 + r() * .75);
      g.fillStyle = color; g.fillRect(x, base - h, w, h + FH);
      if (windows) for (let wy = base - h + 14; wy < base - 8; wy += 16) for (let wx = x + 8; wx < x + w - 8; wx += 14)
        if (r() < .09) { g.fillStyle = `rgba(255,${190 + r() * 40 | 0},120,${.35 + r() * .45})`; g.fillRect(wx, wy, 5, 7); g.fillStyle = color; }
      x += w + r() * 18;
    }
  }
  function paint(sec) {
    const sc = scapeOf(sec), key = sc.id ?? sec.i;   // sections with the same scape.id share one painted landscape
    if (CACHE.has(key)) return CACHE.get(key);
    for (const k of [...CACHE.keys()]) if (k !== key) CACHE.delete(k);   // ~60 MB per landscape: keep only the current one
    if (sc.preset === 'orbit' || sc.preset === 'reentry') { const o = paintOrbit(sc); CACHE.set(key, o); return o; }
    const sky = SKY[sc.time] || SKY.dusk, r = rnd(sc.seed * 97 + (sc.id != null ? 0 : sec.i)), hz = HORIZON - BAR;
    const mk = () => { const c = document.createElement('canvas'); c.width = LW; c.height = FH; return c; };
    const haze = (d) => mixHex(sky[2], '#0a0c10', .25 + d * .7);   // atmospheric perspective: far is light, near is dark
    const layers = DEPTHS.map((depth, li) => {
      const c = mk(), g = c.getContext('2d');
      if (sc.preset === 'city') {
        if (li === 0) ridge(g, r, hz - 20, 50, .2, haze(.05));
        else if (li === 1) skyline(g, r, hz + 10, 170, haze(.35), true);
        else if (li === 2) skyline(g, r, hz + 70, 260, haze(.7), true);
        else { g.fillStyle = '#07080a'; g.fillRect(0, FH - 70, LW, 70); ridge(g, r, FH - 60, 26, .5, '#07080a'); }
      } else if (sc.preset === 'sea') {
        if (li === 0) ridge(g, r, hz - 4, 26, .3, haze(.1));
        else if (li === 1) {
          const wg = g.createLinearGradient(0, hz, 0, FH); wg.addColorStop(0, mixHex(sky[2], '#0c1a24', .35)); wg.addColorStop(1, '#081018');
          g.fillStyle = wg; g.fillRect(0, hz, LW, FH - hz);
          for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,220,170,${r() * .22})`; g.fillRect(r() * LW, hz + 4 + r() ** 2 * (FH - hz), 8 + r() * 30, 2); }
        } else if (li === 2) { /* open water: the subject plane stays clear */ }
        else ridge(g, r, FH - 30, 40, .9, '#05070a');
      } else if (sc.preset === 'plain') {
        if (li === 0) ridge(g, r, hz - 6, 40, .2, haze(.1));
        else if (li === 1) ridge(g, r, hz + 26, 34, .25, haze(.4));
        else if (li === 2) {
          ridge(g, r, hz + 110, 26, .2, haze(.75));
          for (let k = 0; k < 3; k++) { const x = 160 + r() * (LW - 320), y = hz + 96; g.fillStyle = haze(.8); g.fillRect(x - 3, y - 70, 6, 70); g.beginPath(); g.ellipse(x, y - 92, 38, 44, 0, 0, TAU); g.fill(); }
        } else { ridge(g, r, FH - 40, 30, 1, '#06080a'); for (let i = 0; i < 220; i++) { const x = r() * LW; g.fillStyle = '#06080a'; g.fillRect(x, FH - 60 - r() * 40, 2, 60); } }
      } else {   // mountains
        if (li === 0) ridge(g, r, hz - 40, 150, .35, haze(.05));
        else if (li === 1) ridge(g, r, hz + 10, 120, .45, haze(.3));
        else if (li === 2) ridge(g, r, hz + 120, 70, .5, haze(.72));
        else ridge(g, r, FH - 20, 80, 1.1, '#050608');
      }
      const soft = mk(), sg = soft.getContext('2d'); sg.filter = 'blur(11px)'; sg.drawImage(c, 0, 0);
      return { sharp: c, soft, depth };
    });
    const rx = r(), ry = r();   // scape.sunX / sunY pin the light (px from the centre / above the horizon), e.g. clear of titles
    const sun = { x: CX + (sc.sunX ?? (rx - .5) * 700), y: HORIZON - (sc.sunY ?? 40 + ry * 60) };
    const out = { sky, sc, layers, sun };
    CACHE.set(key, out);
    return out;
  }

  // ---------------------------------------------------------------- the frame
  function focusAt(sec, t) {   // focus depth over time: the scene's default, rack pulls from `focus` blocks
    let f = sec.focus ?? DEPTHS[2];
    for (const b of sec.blocks) if (b.kind === 'focus' && t >= b.t0) f = lerp(f, b.depth, E.inOut(prog(t, b.t0, b.t0 + (b.dur || 1.4))));
    return f;
  }
  function scene(sec, t, alpha) {   // alpha: the fade from/to black; everything multiplies it
    const P = paint(sec), sc = P.sc, sp = sc.id != null && SPAN[sc.id];
    if (sc.preset === 'orbit') return orbit(sec, t, alpha, P);
    if (sc.preset === 'reentry') return reentry(sec, t, alpha, P);
    const u = sp ? clamp((sec.a + t - sp[0]) / (sp[1] - sp[0])) : clamp(t / Math.max(1, sec.d)), camX = sc.pan * (u - .5) * 2, focus = focusAt(sec, t);
    const g = ctx.createLinearGradient(0, BAR, 0, HORIZON + 40);
    g.addColorStop(0, P.sky[0]); g.addColorStop(.55, P.sky[1]); g.addColorStop(1, P.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, BAR, W, FH);
    // the sun (or moon) low on the horizon, its glow and a horizontal anamorphic streak
    const sx = P.sun.x - camX * .05, sy = P.sun.y + (sc.sunRise || 0) * (1 - E.out(u));   // sunRise: px it climbs over the span
    const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 520); glow.addColorStop(0, P.sky[3] + 'cc'); glow.addColorStop(.12, P.sky[3] + '55'); glow.addColorStop(1, P.sky[3] + '00');
    ctx.fillStyle = glow; ctx.fillRect(0, BAR, W, FH);
    ctx.fillStyle = P.sky[3]; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, TAU); ctx.fill();
    for (const [h, a] of [[2, .32], [14, .07]]) {
      const fl = ctx.createLinearGradient(0, 0, W, 0); fl.addColorStop(0, 'rgba(110,160,255,0)'); fl.addColorStop(sx / W, `rgba(150,190,255,${a})`); fl.addColorStop(1, 'rgba(110,160,255,0)');
      ctx.fillStyle = fl; ctx.fillRect(0, sy - h / 2, W, h);
    }
    // volumetric rays from the light, slowly turning
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let k = 0; k < 5; k++) {   // few, wide and faint: light in the air, not a sunburst
      const a = -Math.PI / 2 + (k - 2) * .42 + Math.sin(T * .06 + k * 1.7) * .06, w = .09 + .05 * Math.sin(k * 2.3);
      const ray = ctx.createRadialGradient(sx, sy, 0, sx, sy, 1000);
      ray.addColorStop(0, 'rgba(255,220,170,.055)'); ray.addColorStop(.6, 'rgba(255,220,170,.02)'); ray.addColorStop(1, 'rgba(255,220,170,0)');
      ctx.fillStyle = ray; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, 1000, a - w, a + w); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    P.layers.forEach((L, li) => {   // parallax + dolly-in, the blurred copy crossfaded in by distance from the focus plane
      const k = clamp(Math.abs(L.depth - focus) / .35), z = 1 + sc.dolly * u * L.depth;
      ctx.save(); ctx.translate(CX, CY); ctx.scale(z, z); ctx.translate(-CX, -CY);
      const x = CX - LW / 2 - camX * L.depth;
      if (k < 1) { ctx.globalAlpha = alpha * (1 - k); ctx.drawImage(L.sharp, x, BAR); }
      if (k > 0) { ctx.globalAlpha = alpha * k; ctx.drawImage(L.soft, x, BAR); }
      ctx.restore();
      if (li === 1) {   // a band of haze on the horizon between the far and near layers
        const hz = ctx.createLinearGradient(0, HORIZON - 90, 0, HORIZON + 60); hz.addColorStop(0, 'rgba(255,230,200,0)'); hz.addColorStop(.6, `${P.sky[2]}44`); hz.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hz; ctx.fillRect(0, HORIZON - 90, W, 150);
      }
      if (li === 2) blocksAt(sec, t, focus, 'subject', camX);
    });
    const r = rnd(5);   // dust floating in the light
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 70; i++) {
      const bx = (r() * W * 1.2 - camX * .8 + T * (4 + r() * 6)) % (W * 1.2) - W * .1, by = BAR + 60 + r() * (FH - 120) + Math.sin(T * .5 + i) * 12;
      ctx.globalAlpha = alpha * (.15 + .35 * r()) * (.6 + .4 * Math.sin(T * 1.3 + i)); ctx.fillStyle = '#ffe9c8';
      ctx.beginPath(); ctx.arc(bx, by, .8 + r() * 1.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
    return focus;
  }

  // ---------------------------------------------------------------- orbit: a planet's night side, its rim, a sunrise
  // scape: { preset: 'orbit', seed, planet: { r, x, top } (radius, centre offset from the middle, limb top in px),
  //   sunAt: px along the limb from the planet's centre, light: [[video seconds, 0..1], ...] (0 night, 1 full sunrise),
  //   dolly: push-in over the span }. City lights are clustered and linked like a network graph, with pulses on the links.
  const limbY = (O, x) => O.cy - Math.sqrt(Math.max(0, O.R * O.R - (x - O.cx) ** 2));
  const gauss = r => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(TAU * r());
  let RIM = null;   // offscreen canvas for the sun-side rim, reused every frame
  let CITY3D = null;   // engine/city3d.js, loaded in setup when a section uses the reentry preset
  function paintOrbit(sc) {
    const r = rnd(sc.seed * 131 + 7), pl = { r: 3400, x: 200, top: 760, ...(sc.planet || {}) };
    const O = { R: pl.r, cx: CX + pl.x, cy: pl.top + pl.r }, bottom = H - BAR;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const stars = mk(W + 60, H), sg = stars.getContext('2d');
    for (let i = 0; i < 1100; i++) {
      const m = r() ** 3, s = m > .85 ? 2 : 1;
      sg.fillStyle = `rgba(${215 + r() * 40 | 0},${222 + r() * 33 | 0},255,${(.12 + m * .8).toFixed(3)})`; sg.fillRect(r() * (W + 60), BAR + r() * FH, s, s);
    }
    const lights = mk(W + 120, H), lg = lights.getContext('2d'), cities = [];
    for (let k = 0; k < 90; k++) {
      const x = r() * (W + 120) - 60, ly = limbY(O, x);
      if (ly > bottom - 12) continue;
      const y = ly + 10 + r() ** 1.5 * (bottom - ly - 10), fs = clamp((y - ly) / 170, .1, 1), s = 8 + r() * 36, n = 25 + r() * 150 | 0;
      const city = { x, y, fs, s, pts: [] }; cities.push(city);
      for (let i = 0; i < n; i++) {
        const gx = x + gauss(r) * s, gy = y + gauss(r) * s * fs, gl = limbY(O, gx);
        if (gy < gl + 4 || gy > bottom) continue;
        const f2 = clamp((gy - gl) / 170, .1, 1), a = (.25 + .65 * r()) * clamp((gy - gl) / 50);
        const col = `255,${185 + r() * 45 | 0},${105 + r() * 55 | 0}`, pw = 1 + r() * 1.4, ph = (1 + r() * 1.2) * f2;
        lg.fillStyle = `rgba(${col},${a.toFixed(3)})`; lg.fillRect(gx + 60, gy, pw, ph);
        city.pts.push([gx, gy, pw, ph, col, a]);
      }
    }
    const glow = mk(W + 120, H), gg = glow.getContext('2d'); gg.filter = 'blur(5px)'; gg.drawImage(lights, 0, 0);   // bloom, once
    const seen = new Set(), links = [];
    cities.forEach((c, i) => cities.map((d, j) => [j, Math.hypot(d.x - c.x, (d.y - c.y) / Math.min(c.fs, d.fs))]).filter(([j]) => j !== i)
      .sort((a, b) => a[1] - b[1]).slice(0, 2).forEach(([j, dd]) => {
        const id = Math.min(i, j) + '-' + Math.max(i, j);
        if (dd < 560 && !seen.has(id)) { seen.add(id); links.push([c, cities[j], r()]); }
      }));
    return { sc, O, stars, lights, glow, links, cities };
  }
  // scape.wake: lights in the void before the planet is seen, drawn over the darkness (exposure) mask.
  //   accents: [s] each wakes one city (a bloom that settles to a glow, later ones brighter);
  //   pulses: [s] each brightens a city linked to the newest one a little (no travelling dot: the lights carry it);
  //   breaths: [s] the stars brighten almost imperceptibly; until: [s0, s1] the layer hands over to the planet.
  //   All times are video seconds (measured from the music), so the result is a pure function of t.
  function wakePlan(P) {
    if (P.wake) return P.wake;
    const w = P.sc.wake, O = P.O, bottom = H - BAR;
    const vis = P.cities.map((c, i) => ({ c, i })).filter(({ c }) => c.x > 200 && c.x < W - 200 && c.y < bottom - 14 && c.fs > .4 && c.pts.length > 40)
      .sort((a, b) => a.c.x - b.c.x);
    const order = [.5, .22, .8, .36, .64, .1, .9, .45].map(f => vis[Math.min(vis.length - 1, Math.floor(f * vis.length))].i);
    const ev = P.cities.map(() => []);
    (w.accents || []).forEach((t, k) => ev[order[k % order.length]].push({ t, amp: .55 + .09 * k, rest: .16 + .05 * k }));
    const near = i => P.links.filter(([a, b]) => a === P.cities[i] || b === P.cities[i]).map(([a, b]) => P.cities.indexOf(a === P.cities[i] ? b : a));
    (w.pulses || []).forEach((t, k) => {
      const woke = (w.accents || []).filter(a => a <= t).length; if (!woke) return;
      const from = order[(woke - 1) % order.length], nb = near(from), to = nb.length ? nb[k % nb.length] : order[woke % order.length];
      ev[to].push({ t, amp: .3, rest: .07 });
    });
    return (P.wake = { ev, breaths: [...(w.breaths || []), ...(w.pulses || []), ...(w.accents || [])].sort((a, b) => a - b), until: w.until || [50, 58] });
  }
  function orbitWake(sec, t, alpha, P) {
    const W8 = wakePlan(P), abs = sec.a + t, fade = 1 - E.inOut(prog(abs, W8.until[0], W8.until[1]));
    if (fade <= 0) return;
    const sp = SPAN[P.sc.id], u = sp ? clamp((abs - sp[0]) / (sp[1] - sp[0])) : 0, O = P.O;
    const sx = O.cx + (P.sc.sunAt ?? 90), ly = limbY(O, sx), z = 1 + (P.sc.dolly ?? .06) * E.inOut(u), drift = -60 - u * 50;
    const level = evs => { let v = 0; for (const e of evs) if (abs >= e.t) { const d = abs - e.t; v += (e.rest + (e.amp - e.rest) * Math.exp(-d / 1.2)) * Math.min(1, d / .22); } return Math.min(1, v); };
    ctx.save(); ctx.translate(sx, ly); ctx.scale(z, z); ctx.translate(-sx, -ly); ctx.globalCompositeOperation = 'lighter';
    // the stars, breathing on the pulses; their base rises over the minute
    let br = 0; for (const b of W8.breaths) if (abs >= b) br += Math.exp(-(abs - b) / .7) * Math.min(1, (abs - b) / .15);
    ctx.globalAlpha = alpha * fade * clamp(.015 + .05 * clamp(abs / 50) + .07 * Math.min(1, br)); ctx.drawImage(P.stars, -30 - u * 40, 0);
    // cities waking in the void
    P.cities.forEach((c, i) => {
      const lv = level(W8.ev[i]); if (lv < .003) return;
      ctx.globalAlpha = alpha * fade;   // just the city's own lights, no halo
      for (const [x, y, pw, ph, col, a] of c.pts) { ctx.fillStyle = `rgba(${col},${Math.min(1, a * lv * 1.9).toFixed(3)})`; ctx.fillRect(x + 60 + drift, y, pw, Math.max(1.3, ph)); }
    });
    ctx.restore();
  }
  function lightAt(sc, abs) {   // keyframes in video seconds; two keys close together make a jump (the hit)
    const k = sc.light; if (!k || !k.length) return 1;
    if (abs <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) if (abs <= k[i][0]) return lerp(k[i - 1][1], k[i][1], E.inOut(prog(abs, k[i - 1][0], k[i][0])));
    return k[k.length - 1][1];
  }
  function orbit(sec, t, alpha, P, zx = 1) {
    const sc = P.sc, O = P.O, abs = sec.a + t, L = lightAt(sc, abs), sp = sc.id != null && SPAN[sc.id];
    const u = sp ? clamp((abs - sp[0]) / (sp[1] - sp[0])) : clamp(t / Math.max(1, sec.d));
    const sx = O.cx + (sc.sunAt ?? 90), ly = limbY(O, sx), sy = ly + 30 * (1 - clamp(L * 1.3)), z = (1 + (sc.dolly ?? .06) * E.inOut(u)) * zx;
    if (!RIM) { RIM = document.createElement('canvas'); RIM.width = W; RIM.height = H; }
    ctx.save(); ctx.translate(sx, ly); ctx.scale(z, z); ctx.translate(-sx, -ly);   // a slow push in on the sunrise
    const bg = ctx.createLinearGradient(0, BAR, 0, ly); bg.addColorStop(0, '#010205'); bg.addColorStop(1, '#06101e');
    ctx.globalAlpha = alpha; ctx.fillStyle = bg; ctx.fillRect(-W, -H, 3 * W, 3 * H);
    ctx.globalAlpha = alpha * (1 - .6 * L) * (.85 + .15 * Math.sin(T * .7)); ctx.drawImage(P.stars, -30 - u * 40, 0);
    // the sun itself, behind the planet until it crests
    const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, 40 + 220 * L);
    core.addColorStop(0, 'rgba(255,250,240,1)'); core.addColorStop(.3, 'rgba(255,226,170,.6)'); core.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.globalAlpha = alpha * clamp(L * 1.5); ctx.fillStyle = core; ctx.fillRect(sx - 300, sy - 300, 600, 600);
    // the planet: night side, a faint lit edge toward the sun
    const pg = ctx.createRadialGradient(sx, ly, 0, sx, ly, 1500); pg.addColorStop(0, '#0d1a2c'); pg.addColorStop(.35, '#050a14'); pg.addColorStop(1, '#020307');
    ctx.globalAlpha = alpha; ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(O.cx, O.cy, O.R, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(O.cx, O.cy, O.R, 0, TAU); ctx.clip();   // lights, links and pulses live on the surface
    const drift = -60 - u * 50;   // the planet turns, very slowly
    ctx.globalAlpha = alpha * .95; ctx.drawImage(P.lights, drift, 0);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * .55; ctx.drawImage(P.glow, drift, 0);
    ctx.lineWidth = 1;
    P.links.forEach(([a, b, ph], k) => {
      const ax = a.x + drift + 60, bx = b.x + drift + 60;
      ctx.globalAlpha = alpha * .16; ctx.strokeStyle = '#ffcf8a'; ctx.beginPath(); ctx.moveTo(ax, a.y); ctx.lineTo(bx, b.y); ctx.stroke();
      const q = (T * (.18 + ph * .2) + ph) % 1, px = lerp(ax, bx, q), py = lerp(a.y, b.y, q);   // a data pulse along the link
      ctx.globalAlpha = alpha * .9 * Math.sin(q * Math.PI); ctx.fillStyle = '#fff1d6'; ctx.fillRect(px - 1.5, py - 1, 3, 2);
    });
    ctx.restore();
    // atmosphere: a thin blue rim all along the limb, gold near the sun as it rises
    const ring = (rgb, k) => {
      const g = ctx.createRadialGradient(O.cx, O.cy, O.R - 4, O.cx, O.cy, O.R + 80);
      g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(.05, `rgba(${rgb},${(.75 * k).toFixed(3)})`); g.addColorStop(.22, `rgba(${rgb},${(.22 * k).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
      return g;
    };
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha;
    ctx.fillStyle = ring('80,150,255', .35 + .45 * L); ctx.fillRect(-W, BAR - 200, 3 * W, FH + 400);
    const rg = RIM.getContext('2d'); rg.setTransform(1, 0, 0, 1, 0, 0); rg.globalCompositeOperation = 'source-over'; rg.clearRect(0, 0, W, H);
    rg.fillStyle = ring('255,196,110', clamp(L * 1.2)); rg.fillRect(0, 0, W, H);
    const mask = rg.createRadialGradient(sx, ly, 0, sx, ly, 300 + 900 * L); mask.addColorStop(0, 'rgba(0,0,0,1)'); mask.addColorStop(1, 'rgba(0,0,0,0)');
    rg.globalCompositeOperation = 'destination-in'; rg.fillStyle = mask; rg.fillRect(0, 0, W, H);
    ctx.drawImage(RIM, 0, 0);
    // the sunburst over the limb, an anamorphic streak and a few rays
    if (L > .01) {
      const bu = ctx.createRadialGradient(sx, ly - 4, 0, sx, ly - 4, 90 + 1150 * L);
      bu.addColorStop(0, `rgba(255,255,248,${L.toFixed(3)})`); bu.addColorStop(.04, `rgba(255,238,205,${(.85 * L).toFixed(3)})`);
      bu.addColorStop(.18, `rgba(255,198,120,${(.3 * L).toFixed(3)})`); bu.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.fillStyle = bu; ctx.fillRect(-W, -H, 3 * W, 3 * H);
      for (const [h, a] of [[3, .55], [22, .1]]) {
        const fl = ctx.createLinearGradient(0, 0, W, 0); fl.addColorStop(0, 'rgba(120,170,255,0)'); fl.addColorStop(clamp(sx / W), `rgba(200,225,255,${(a * L).toFixed(3)})`); fl.addColorStop(1, 'rgba(120,170,255,0)');
        ctx.fillStyle = fl; ctx.fillRect(-W, ly - 4 - h / 2, 3 * W, h);
      }
      for (let k = 0; k < 9; k++) {
        const ang = -Math.PI / 2 + (k - 4) * .3 + Math.sin(T * .05 + k) * .04, w = .012 + .01 * Math.sin(k * 1.9);
        const ray = ctx.createRadialGradient(sx, ly, 0, sx, ly, 1300); ray.addColorStop(0, `rgba(255,225,170,${(.07 * L).toFixed(3)})`); ray.addColorStop(1, 'rgba(255,225,170,0)');
        ctx.fillStyle = ray; ctx.beginPath(); ctx.moveTo(sx, ly); ctx.arc(sx, ly, 1300, ang - w, ang + w); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
    return DEPTHS[2];
  }

  // ---------------------------------------------------------------- reentry: orbit, a plunge, a night-city flyover
  // scape: { preset: 'reentry', ...the orbit's fields, drop, dive, climb (video seconds), beat: { t0, period }, push,
  //   city3d: { speed, altitude, seed, block, road, turn } } — orbit with a slow push until `drop`; then for `dive`
  //   seconds the camera plunges through the atmosphere (a hard zoom on the limb, plasma, clouds; 2D, here) into the
  //   3D night city of engine/city3d.js (three.js), which flies its own camera and pulses on the beat.
  const fract = v => v - Math.floor(v);
  const h2 = (a, b) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);   // stable per block, so the city holds still
  function reentry(sec, t, alpha, P) {
    const sc = P.sc, abs = sec.a + t, drop = sc.drop ?? 0, dive = sc.dive ?? 1.7, p = clamp((abs - drop) / dive);
    if (abs < drop + dive * .7) {   // orbit, pushing in slowly, then the plunge into the limb
      const push = 1 + (sc.push ?? .22) * E.in(clamp(abs / drop)), plunge = 1 + 3.2 * E.in(p);
      orbit(sec, t, alpha * (1 - E.inOut(prog(p, .35, .7))), P, push * plunge);
    }
    if (abs >= drop && CITY3D) {   // the 3D city (engine/city3d.js) owns its camera: the dive, the flight, the climb
      const cv = CITY3D.render(abs);
      ctx.save(); ctx.globalAlpha *= alpha * E.inOut(prog(p, .35, .75)); ctx.drawImage(cv, 0, BAR, W, FH); ctx.restore();
      if (p < 1) {   // the plasma of the entry and the clouds ripping past
        const r = rnd(Math.floor(abs * 30) * 13 + 5), heat = Math.sin(clamp(p / .75) * Math.PI);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 26; k++) {
          const ang = r() * TAU, rad = W * (.55 + r() * .3), len = (180 + r() * 420) * heat;
          const x0 = CX + Math.cos(ang) * rad, y0 = CY + Math.sin(ang) * rad * .6, x1 = CX + Math.cos(ang) * (rad - len), y1 = CY + Math.sin(ang) * (rad - len) * .6;
          const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, `rgba(255,150,60,${(.55 * heat * alpha).toFixed(3)})`); g.addColorStop(1, 'rgba(255,240,210,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 2 + r() * 6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
        const glow = ctx.createRadialGradient(CX, CY, FH * .2, CX, CY, W * .75);
        glow.addColorStop(0, 'rgba(255,120,40,0)'); glow.addColorStop(1, `rgba(255,120,40,${(.45 * heat * alpha).toFixed(3)})`);
        ctx.fillStyle = glow; ctx.fillRect(0, BAR, W, FH);
        ctx.globalCompositeOperation = 'source-over';
        const cw = clamp((p - .25) / .55);   // cloud layers, scaling past the camera
        for (let k = 0; k < 7; k++) {
          const s = fract(p * 2.2 + k / 7), ang = h2(k, 3) * TAU, R = 120 + 2200 * s * s, d = 900 * s * s;
          const x = CX + Math.cos(ang) * d, y = CY + Math.sin(ang) * d * .5, A = (1 - s) * .4 * Math.sin(cw * Math.PI) * alpha;
          if (A <= .003) continue;
          const cg = ctx.createRadialGradient(x, y, 0, x, y, R); cg.addColorStop(0, `rgba(215,225,240,${A.toFixed(3)})`); cg.addColorStop(1, 'rgba(215,225,240,0)');
          ctx.fillStyle = cg; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
        }
        ctx.restore();
      }
    }
    return DEPTHS[2];
  }

  // steel trailer type: a brushed-metal gradient, a dark drop shadow, a thin warm rim catching the sunrise
  function steel(s, x, y, o) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    ctx.font = `${o.size}px ${o.family}`; ctx.letterSpacing = `${o.track || 0}px`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const k = Math.min(1, (o.maxW || 1700) / ctx.measureText(s).width);
    ctx.translate(x, y); ctx.scale(k, k);
    const h = o.size * .42, g = ctx.createLinearGradient(0, -h, 0, h);
    g.addColorStop(0, '#fdfdfe'); g.addColorStop(.4, '#d3d9e0'); g.addColorStop(.5, '#7b8592'); g.addColorStop(.56, '#e6eaef'); g.addColorStop(1, '#8c96a2');
    ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 8; ctx.fillStyle = g; ctx.fillText(s, 0, 0);
    ctx.shadowColor = 'transparent'; ctx.lineWidth = Math.max(1, o.size / 120); ctx.strokeStyle = o.rim || 'rgba(255,210,140,.6)';
    ctx.globalAlpha *= .85; ctx.strokeText(s, 0, 0);
    ctx.restore();
  }

  // ---------------------------------------------------------------- blocks
  function vis(b, t) {
    if (t < b.t0) return 0;
    if (HARD.has(b.kind)) return t < Math.min(b.tout ?? Infinity, b.tclear ?? Infinity) ? 1 : 0;   // trailer cuts: on, then off
    let a = E.inOut(prog(t, b.t0, b.t0 + (b.settle || 1.1)));
    const out = Math.min(b.tout ?? Infinity, b.tclear ?? Infinity);
    if (out < Infinity) a *= 1 - E.inOut(prog(t, out, out + .8));
    return a;
  }
  const blurFor = (depth, focus) => clamp(Math.abs(depth - focus) / .35) * 9;
  function silhouette(shape, x, base, s, a, rim) {
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = '#060607'; ctx.strokeStyle = rim; ctx.lineWidth = 2;
    const P = new Path2D();
    if (shape === 'figure') {
      P.ellipse(x, base - 168 * s, 16 * s, 19 * s, 0, 0, TAU);
      P.moveTo(x - 30 * s, base - 140 * s); P.lineTo(x + 30 * s, base - 140 * s); P.lineTo(x + 24 * s, base - 70 * s); P.lineTo(x + 16 * s, base);
      P.lineTo(x + 4 * s, base); P.lineTo(x, base - 64 * s); P.lineTo(x - 4 * s, base); P.lineTo(x - 16 * s, base); P.lineTo(x - 24 * s, base - 70 * s); P.closePath();
    } else if (shape === 'bottle') {
      P.moveTo(x - 8 * s, base - 150 * s); P.lineTo(x + 8 * s, base - 150 * s); P.lineTo(x + 9 * s, base - 110 * s);
      P.bezierCurveTo(x + 30 * s, base - 90 * s, x + 30 * s, base - 80 * s, x + 30 * s, base - 64 * s); P.lineTo(x + 30 * s, base);
      P.lineTo(x - 30 * s, base); P.lineTo(x - 30 * s, base - 64 * s); P.bezierCurveTo(x - 30 * s, base - 80 * s, x - 30 * s, base - 90 * s, x - 9 * s, base - 110 * s); P.closePath();
    } else if (shape === 'lamp') {
      P.rect(x - 4 * s, base - 300 * s, 8 * s, 300 * s); P.rect(x - 4 * s, base - 300 * s, 60 * s, 7 * s); P.rect(x + 44 * s, base - 300 * s, 24 * s, 16 * s);
    } else if (shape === 'monolith') {
      P.rect(x - 40 * s, base - 260 * s, 80 * s, 260 * s);
    } else {   // tree
      P.rect(x - 5 * s, base - 110 * s, 10 * s, 110 * s); P.ellipse(x, base - 150 * s, 60 * s, 70 * s, 0, 0, TAU);
    }
    ctx.fill(P); ctx.globalAlpha *= .55; ctx.stroke(P);
    if (shape === 'lamp') {   // its cone of light
      ctx.globalAlpha /= .55; const cone = ctx.createLinearGradient(0, base - 290 * s, 0, base); cone.addColorStop(0, 'rgba(255,214,150,.38)'); cone.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(x + 50 * s, base - 286 * s); ctx.lineTo(x + 62 * s, base - 286 * s); ctx.lineTo(x + 160 * s, base); ctx.lineTo(x - 50 * s, base); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  const KIND = {
    // a title set in depth: letter-spacing closes and it racks into focus as it fades up
    title(b, t, a, focus) {
      const p = E.out(prog(t, b.t0, b.t0 + 1.6)), depth = b.depth ?? DEPTHS[2], blur = blurFor(depth, focus) + (1 - p) * 8;
      tx(b.txt, CX + (b.x || 0), CY + (b.y ?? -40), { font: b.italic ? F.serifI : b.weight === 'medium' ? F.serif : F.serifL, size: b.size || 128,
        alpha: a, blur, track: (b.track ?? 2) + (1 - p) * 14, glow: 'rgba(255,200,140,.45)', glowR: 34, color: b.color || '#efe6d8' });
    },
    line(b, t, a, focus) {
      tx(b.txt, CX + (b.x || 0), CY + (b.y ?? 70), { font: F.sans, size: b.size || 24, alpha: a * .85, track: b.track ?? 9, blur: blurFor(b.depth ?? DEPTHS[2], focus), color: b.color || '#e8dccb' });
    },
    number(b, t, a, focus) {
      const v = lerp(b.countFrom || 0, b.count, E.out(prog(t, b.t0, b.t0 + (b.countDur || 1.8))));
      tx((b.txt || '{n}').replace('{n}', v.toFixed(b.dec || 0)), CX + (b.x || 0), CY + (b.y ?? -40), { font: F.serifL, size: b.size || 220, alpha: a, blur: blurFor(b.depth ?? DEPTHS[2], focus), glow: 'rgba(255,200,140,.4)', glowR: 40 });
    },
    // silhouettes standing on the subject plane; figures: a row of n, `gone` of them fade out at goneAt
    object(b, t, a, focus, camX) {
      const depth = b.depth ?? DEPTHS[2], base = HORIZON + (b.ground ?? 150), s = b.scale || 1, x0 = CX + (b.x || 0) - camX * depth;
      const blur = blurFor(depth, focus); if (blur > .4) { ctx.save(); ctx.filter = `blur(${blur.toFixed(1)}px)`; }
      const n = b.n || 1, gap = (b.gap || 80) * s;
      for (let i = 0; i < n; i++) {
        const gone = b.gone && i >= n - b.gone && b.tgone != null ? 1 - E.inOut(prog(t, b.tgone + (i - (n - b.gone)) * .15, b.tgone + .9 + (i - (n - b.gone)) * .15)) : 1;
        const vary = n > 1 ? .9 + .2 * rnd(i + 3)() : 1;
        silhouette(b.shape || 'figure', x0 + (i - (n - 1) / 2) * gap, base, s * vary, a * gone, 'rgba(255,196,140,.8)');
      }
      if (blur > .4) ctx.restore();
    },
    focus() {},   // handled by focusAt
    // a trailer title card: slams in on its word (a small punch-in and a flash), cuts off hard at the next cut.
    // black: true puts it on black instead of over the scene; sub: a small tracked credit line under it
    cut(b, t, a) {
      const p = E.out(prog(t, b.t0, b.t0 + .32)), s = 1 + (b.punch ?? .07) * (1 - p), y = CY + (b.y ?? -10);
      if (b.black) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = '#000'; ctx.fillRect(0, BAR, W, FH); ctx.restore(); }
      ctx.save(); ctx.translate(CX, y); ctx.scale(s, s); ctx.translate(-CX, -y);
      // font: 'steel' (theme font STEEL, brushed metal), 'sans', 'light', or the serif; subFont: 'mono' (theme font MONO)
      if (b.txt && b.font === 'steel') steel(b.txt, CX + (b.x || 0), y, { family: 'STEEL', size: b.size || 150, track: b.track ?? 10, alpha: a, maxW: 1700 });
      else if (b.txt) tx(b.txt, CX + (b.x || 0), y, { font: b.font === 'sans' ? F.sans : b.font === 'light' ? F.serifL : F.serif, size: b.size || 150,
        alpha: a, track: b.track ?? 16, glow: 'rgba(255,200,140,.5)', glowR: 40, color: b.color || '#f3ead9', maxW: 1700 });
      if (b.sub) tx(b.sub, CX + (b.x || 0), y + (b.subY ?? (b.size || 150) * .62 + 30), { font: b.subFont === 'mono' ? 'MONO' : F.sans, size: b.subSize || 30, alpha: a,
        track: b.subFont === 'mono' ? 8 : 12, color: b.subColor || '#f2e4c8', glow: 'rgba(0,0,0,.8)', glowR: 16 });
      ctx.restore();
      const fl = (b.flash ?? .35) * (1 - E.out(prog(t, b.t0, b.t0 + .28)));
      if (fl > 0) { ctx.save(); ctx.globalAlpha *= fl; ctx.fillStyle = '#fff6ea'; ctx.fillRect(0, BAR, W, FH); ctx.restore(); }
    },
    // typed text after a blinking cursor: the cursor shows from `at`, typing starts at `typeAt`, `cps` characters a second
    type(b, t, a) {
      const fam = THEME_STORY.fonts.MONO ? 'MONO' : F.sans, size = b.size || 64, t1 = b.ttype ?? b.t0;
      const n = Math.max(0, Math.min(b.txt.length, Math.floor((t - t1) * (b.cps || 9))));
      ctx.save(); ctx.globalAlpha *= a; ctx.font = `${size}px ${fam}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const x0 = CX - ctx.measureText(b.txt + '_').width / 2, y = CY + (b.y || 0), shown = b.txt.slice(0, n);
      ctx.fillStyle = b.color || '#ece3d3'; ctx.fillText(shown, x0, y);
      const typing = n > 0 && n < b.txt.length, blink = Math.floor((t - b.t0) * 1.9) % 2 === 0;
      if (typing || blink) ctx.fillText('_', x0 + ctx.measureText(shown).width, y);
      ctx.restore();
    },
    // a floating screen: an image (theme `images` key: img) or footage (theme `clips` id: clip, from its first frame) in
    // a glowing glass panel. x, y: centre offset; w: width (height from the source's aspect, or h); crop: [x, y, w, h]
    // as fractions of the source (keep private rows out of frame); tilt: a slight shear for depth; push: zoom gained
    // while it's up; full: true fills the whole image area with no panel (a frame from another film).
    screen(b, t, a) {
      const src = b.img ? IMG[b.img] : null;
      if (b.img && !src) throw new Error(`screen: no image "${b.img}" in theme.js images`);
      const [cx0, cy0, cw, ch] = b.crop || [0, 0, 1, 1];
      if (b.full) {   // fadeIn: seconds to rise from black; zoom: starting scale; push: zoom gained over pushDur s (all opt-in)
        ctx.save(); ctx.globalAlpha *= a * (b.fadeIn ? E.inOut(prog(t, b.t0, b.t0 + b.fadeIn)) : 1);
        if (b.push || b.zoom) { const z = (b.zoom || 1) + (b.push || 0) * clamp((t - b.t0) / (b.pushDur || 20)); ctx.translate(CX, CY); ctx.scale(z, z); ctx.translate(-CX, -CY); }
        if (src) ctx.drawImage(src, cx0 * src.naturalWidth, (BAR / H) * src.naturalHeight, cw * src.naturalWidth, (FH / H) * src.naturalHeight, 0, BAR, W, FH);
        else clip(b.clip, t - b.t0, 0, BAR, W, FH);
        ctx.restore(); return;
      }
      const asp = src ? (cw * src.naturalWidth) / (ch * src.naturalHeight) : 16 / 9, w = b.w || 1000, h = b.h || w / asp;
      const end = Math.min(b.tout ?? Infinity, b.tclear ?? Infinity), life = end < Infinity ? end - b.t0 : 4;
      const u = clamp((t - b.t0) / life), inP = E.out(prog(t, b.t0, b.t0 + .28));
      ctx.save(); ctx.globalAlpha *= a * (.25 + .75 * inP);
      ctx.translate(CX + (b.x || 0), CY + (b.y || 0)); const s = (.95 + .05 * inP) * (1 + (b.push ?? .05) * u); ctx.scale(s, s);
      ctx.transform(1, b.tilt || 0, 0, 1, 0, 0);
      ctx.shadowColor = b.glow || 'rgba(110,160,255,.45)'; ctx.shadowBlur = 70; ctx.fillStyle = '#05070c'; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.shadowColor = 'transparent';
      if (src) ctx.drawImage(src, cx0 * src.naturalWidth, cy0 * src.naturalHeight, cw * src.naturalWidth, ch * src.naturalHeight, -w / 2, -h / 2, w, h);
      else clip(b.clip, t - b.t0 + (b.from || 0), -w / 2, -h / 2, w, h);   // from: start that far into the clip
      const sheen = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);   // glass: a faint diagonal sheen and a thin edge
      sheen.addColorStop(0, 'rgba(255,255,255,.09)'); sheen.addColorStop(.35, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(255,255,255,.03)');
      ctx.fillStyle = sheen; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = 'rgba(200,220,255,.28)'; ctx.lineWidth = 1.5; ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    },
    // a rubber stamp that slams on (CLASSIFIED): txt, color, rot (degrees), size, x, y
    stamp(b, t, a) {
      const p = E.out(prog(t, b.t0, b.t0 + .18)), s = 1.6 - .6 * p, size = b.size || 64, col = b.color || '#d8362f';
      ctx.save(); ctx.globalAlpha *= a * p; ctx.translate(CX + (b.x || 0), CY + (b.y || 0)); ctx.rotate((b.rot ?? -8) * Math.PI / 180); ctx.scale(s, s);
      ctx.font = `${size}px ${THEME_STORY.fonts.STEEL ? 'STEEL' : F.sans}`; ctx.letterSpacing = `${size * .12}px`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(b.txt).width + size * .9, h = size * 1.35;
      ctx.strokeStyle = col; ctx.lineWidth = size * .09; ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = col; ctx.fillText(b.txt, size * .06, size * .04);
      ctx.restore();
    },
    // a digital glitch over the whole frame for `dur` seconds: displaced horizontal slices, re-rolled every frame
    glitch(b, t, a) {
      if (t > b.t0 + (b.dur || .35)) return;
      const r = rnd(Math.floor(t * 30) * 7 + 3);
      ctx.save(); ctx.globalAlpha *= a; ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let k = 0; k < (b.slices || 9); k++) {
        const y = BAR + r() * FH, h = 6 + r() * 60, dx = (r() - .5) * (b.amp || 90);
        ctx.drawImage(ctx.canvas, 0, y, W, h, dx, y, W, h);
        const tint = b.tints || ['rgba(0,240,255,.12)', 'rgba(255,40,180,.12)'];   // tints: the two slice colours
        if (r() < .4) { ctx.fillStyle = r() < .5 ? tint[0] : tint[1]; ctx.fillRect(0, y, W, h); }
      }
      ctx.restore();
    },
    // a white flash over the frame (the hit), decaying over `dur`
    flash(b, t, a) {
      const fl = (b.peak ?? .85) * (1 - E.out(prog(t, b.t0, b.t0 + (b.dur || .5))));
      if (fl > 0) { ctx.save(); ctx.globalAlpha *= a * fl; ctx.fillStyle = b.color || '#fff6ea'; ctx.fillRect(0, BAR, W, FH); ctx.restore(); }
    },
  };
  const HARD = new Set(['cut', 'type', 'flash', 'screen', 'stamp', 'glitch']);   // no fades; these time themselves
  const SUBJECT = new Set(['object']);   // drawn inside the scene, between the subject and foreground layers
  const passOf = k => SUBJECT.has(k) ? 'subject' : k === 'flash' || k === 'glitch' ? 'flash' : 'type';   // over everything
  function blocksAt(sec, t, focus, pass, camX = 0) {
    for (const b of sec.blocks) {
      if (passOf(b.kind) !== pass) continue;
      const a = vis(b, t); if (a > 0 && KIND[b.kind]) KIND[b.kind](b, t, a, focus, camX);
    }
  }

  // exposure keyframes [[t, v], ...] (seconds into the section, 0 black .. 1 full), eased between keys: a slow fade up
  function exposureAt(sec, t) {
    const k = sec.exposure; if (!k || !k.length) return 1;
    if (t <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return lerp(k[i - 1][1], k[i][1], E.inOut(prog(t, k[i - 1][0], k[i][0])));
    return k[k.length - 1][1];
  }

  // ---------------------------------------------------------------- slate, subtitles, finish
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  function slate(sec, t) {   // the chapter slate on black, before the scene fades up
    if (!sec.title) return 0;
    const hold = sec.slateHold ?? 2.2, a = E.inOut(prog(t, .1, .9)) * (1 - E.inOut(prog(t, hold, hold + .8)));
    const n = sec.chapter ?? sec.i + 1;
    if (a > 0) {
      if (n !== false) tx(ROMAN[n - 1] || String(n), CX, CY - 60, { font: F.serifL, size: 70, alpha: a, track: 6, color: '#c9b79c' });
      tx(sec.title, CX, CY + 40, { font: F.serifI, size: 76, alpha: a, track: 3 });
    }
    return hold;
  }
  function subtitles(sec, t) {   // cinema subtitles: the current phrase, whole, low in the frame
    if (sec.subtitles === false) return;
    let cur = null;
    for (const s of sec.sentences) for (const p of s.phrases) if (t >= p.t0 - .05 && t <= p.t1 + .6) cur = p;
    if (!cur) return;
    const a = prog(t, cur.t0 - .05, cur.t0 + .12) * (1 - prog(t, cur.t1 + .45, cur.t1 + .6));
    tx(cur.text, CX, H - BAR - 58, { font: F.sans, size: 36, alpha: a * .95, color: '#f4efe6', glow: 'rgba(0,0,0,.9)', glowR: 10, maxW: 1500 });
  }
  function finish(t) {   // grade: vignette, grain, the letterbox
    const v = ctx.createRadialGradient(CX, CY, FH * .35, CX, CY, W * .62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = v; ctx.fillRect(0, BAR, W, FH);
    if (GRAIN.length) {
      ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .5;
      ctx.fillStyle = ctx.createPattern(GRAIN[Math.floor(T * 24) % GRAIN.length], 'repeat'); ctx.fillRect(0, BAR, W, FH); ctx.restore();
    }
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, BAR); ctx.fillRect(0, H - BAR, W, BAR);
  }

  return {
    fallback: () => ({ bg: Object.keys(THEME_STORY.palettes)[0], blocks: [] }),   // scenery + subtitles carry it
    init(SEC) {
      for (const sec of SEC) sec.blocks.forEach((b, j) => { if (b.clear) for (let k = 0; k < j; k++) sec.blocks[k].tclear = Math.min(sec.blocks[k].tclear ?? Infinity, b.t0); });
      for (const sec of SEC) {   // a cut lasts until the next cut in its section (or its own `out`)
        for (const kind of ['cut', 'screen']) {   // a cut lasts until the next cut, a screen until the next screen
          const seq = sec.blocks.filter(b => b.kind === kind);
          seq.forEach((b, j) => { if (seq[j + 1] && !b.keep) b.tclear = Math.min(b.tclear ?? Infinity, seq[j + 1].t0); });
        }
        const id = sec.scape?.id; if (id != null) SPAN[id] = [Math.min(SPAN[id]?.[0] ?? Infinity, sec.a), Math.max(SPAN[id]?.[1] ?? -Infinity, sec.b)];
        for (const b of sec.blocks) if (!KIND[b.kind]) throw new Error(`section ${sec.key}: unknown block kind "${b.kind}"`);
      }
    },
    async setup() {   // film grain: six tiles, cycled at 24 per second; the 3D city if a section flies over it
      const r = rnd(1895);
      GRAIN = Array.from({ length: 6 }, () => {
        const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), img = g.createImageData(256, 256);
        for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - .5) * 90; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 60; }
        g.putImageData(img, 0, 0); return c;
      });
      const re = SEC.map(s => s.scape).find(sc => sc && sc.preset === 'reentry');
      if (re) {
        const { createCity } = await import('/engine/city3d.js');
        CITY3D = createCity({ width: W, height: FH, drop: re.drop, dive: re.dive ?? 1.7, climb: re.climb, beat: re.beat, ...(re.city3d || {}) });
      }
    },
    draw(sec, t) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const [fi, fo] = sec.fade || [.9, .75];   // fade: [in, out] seconds; 0 is a hard cut (trailers)
      const hold = sec.title ? (sec.slateHold ?? 2.2) : 0, up = sec.title ? E.inOut(prog(t, hold + .2, hold + 1.3)) : fi ? E.inOut(prog(t, 0, fi)) : 1;
      const down = fo ? 1 - E.inOut(prog(t, sec.d - fo, sec.d)) : 1;   // by default every section ends by fading to black
      const a = up * down;
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a;
        const focus = scene(sec, t, a), ex = exposureAt(sec, t);
        if (ex < 1) { ctx.fillStyle = `rgba(0,0,0,${(1 - ex).toFixed(4)})`; ctx.fillRect(0, BAR, W, FH); }
        const pre = scapeOf(sec).preset, Po = (pre === 'orbit' || pre === 'reentry') && paint(sec);
        if (Po && Po.sc.wake) orbitWake(sec, t, a, Po);   // lights in the void
        blocksAt(sec, t, focus, 'type');
        blocksAt(sec, t, focus, 'flash');
        ctx.restore();
      }
      if (sec.title && t < hold + 1.3) slate(sec, t);
      subtitles(sec, t);
      finish(t);
    },
    hud: false, enter: false,
  };
})();
runLook(CINEMATIC);
