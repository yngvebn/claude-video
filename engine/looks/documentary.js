'use strict';
// Look: documentary case file. After the code-video style guide (references/styles/documentary.md, MIT), adapted to
// narration: sections are chapters, the narration builds up as captions clause by clause, and evidence lands on anchors.
// Block vocabulary and an example: .claude/skills/story-video/references/looks/documentary.md
//
// Near-black ground with pinpoint stars and drifting embers; a slowly turning low-poly network sphere as the chapter
// emblem; ivory serif display, tabular mono figures, tracked sans tags; coral for the current data point, brick red only
// for corrections (strike-through, ink stamp); aged paper evidence cards; minimal bar charts; a backlit witness
// silhouette. Everything settles rather than snaps; chapters cross-dissolve, the outgoing one ghosting under the new.
// Globals owned here: none besides this closure's result (DOCUMENTARY).
const DOCUMENTARY = (() => {
  const F = { serif: 'SERIF', serifI: 'SERIFI', sans: 'SANS', mono: 'MONO', monoB: 'MONOB' };
  let STARS = [], EMBERS = [], SPHERE = null, GRAIN = null;

  // ---------------------------------------------------------------- small helpers
  const col = (C, c, d = 'fg') => C[c || d] || c;
  function tx(s, x, y, o = {}) {   // text with optional tracking (letter-spacing in px)
    ctx.save(); if (o.track) ctx.letterSpacing = `${o.track}px`;
    text(s, x, y, { font: o.font || F.serif, size: o.size || 60, color: o.color, align: o.align || 'center', base: o.base || 'middle', alpha: o.alpha ?? 1, jit: false, maxW: o.maxW || 0 });
    ctx.restore();
  }
  function wrap(words, font, size, maxW) {   // greedy line wrap over words -> [[word indices], ...]
    const lines = [[]]; let w = 0; const sp = measure(' ', font, size);
    words.forEach((wd, i) => {
      const ww = measure(wd, font, size);
      if (lines[lines.length - 1].length && w + sp + ww > maxW) { lines.push([]); w = 0; }
      w += (lines[lines.length - 1].length ? sp : 0) + ww; lines[lines.length - 1].push(i);
    });
    return lines;
  }

  // ---------------------------------------------------------------- world: stars, embers, the network sphere
  function background(C) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    for (const s of STARS) {
      const a = s.a * (.55 + .45 * Math.sin(T * s.f + s.ph));
      ctx.globalAlpha = a; ctx.fillStyle = s.warm ? '#d9b48a' : '#e8e2d6'; ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    for (const e of EMBERS) {   // rise slowly, fade in and out along the way so the wrap never shows
      const k = ((T * e.v + e.o) % 1 + 1) % 1, y = H + 40 - k * (H + 80), x = e.x + Math.sin(T * .4 + e.ph) * 26;
      ctx.globalAlpha = e.a * Math.sin(Math.PI * k); ctx.fillStyle = '#c8804e';
      ctx.beginPath(); ctx.arc(x, y, e.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const v = ctx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, W * .72);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  function sphere(cx, cy, R, alpha, C) {
    if (alpha <= 0) return;
    const ry = T * .16, rx = .38, cr = Math.cos(ry), sr = Math.sin(ry), cx_ = Math.cos(rx), sx_ = Math.sin(rx);
    const P = SPHERE.pts.map(([x, y, z]) => {
      const x1 = x * cr + z * sr, z1 = -x * sr + z * cr, y1 = y * cx_ - z1 * sx_, z2 = y * sx_ + z1 * cx_;
      return [cx + x1 * R, cy + y1 * R, z2];
    });
    ctx.save(); ctx.lineWidth = 1.2;
    for (const [i, j] of SPHERE.edges) {
      const d = (P[i][2] + P[j][2]) / 2;
      ctx.globalAlpha = alpha * (.12 + .38 * (d + 1) / 2); ctx.strokeStyle = C.bronze || '#b08a5a';
      ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.stroke();
    }
    for (const p of P) {
      ctx.globalAlpha = alpha * (.25 + .65 * (p[2] + 1) / 2); ctx.fillStyle = '#e3b98a';
      ctx.beginPath(); ctx.arc(p[0], p[1], 1.6 + 2.2 * (p[2] + 1) / 2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- blocks
  // how visible block b is at t: settles in over `settle` s, leaves at its `out` anchor or when a later clear block lands
  function vis(b, t) {
    if (t < b.t0) return 0;
    let a = E.out(prog(t, b.t0, b.t0 + (b.settle || .8)));
    const out = Math.min(b.tout ?? Infinity, b.tclear ?? Infinity);
    if (out < Infinity) a *= 1 - E.inOut(prog(t, out, out + .5));
    return a;
  }
  function count(b, t) {
    if (b.count == null) return b.txt;
    const v = lerp(b.countFrom || 0, b.count, E.out(prog(t, b.t0, b.t0 + (b.countDur || 1.2))));
    const n = v.toFixed(b.dec || 0);
    return (b.txt || '{n}').replace('{n}', n);
  }

  const KIND = {
    headline(b, t, C, a) {   // a big serif line (or a counted number) that settles in, with a tracked sub-label
      const y = (b.y ?? -40) + 18 * (1 - a), font = b.font === 'mono' ? F.monoB : b.italic ? F.serifI : F.serif;
      tx(count(b, t), b.x || 0, y, { font, size: b.size || 130, color: col(C, b.col), alpha: a, maxW: 1640 });
      if (b.sub) tx(b.sub, b.x || 0, y + (b.size || 130) * .62 + 30, { font: F.sans, size: 26, color: col(C, b.subCol, 'acc'), alpha: a, track: 7 });
    },
    note(b, t, C, a) {
      tx(b.txt, b.x || 0, b.y || 0, { font: b.font === 'serif' ? F.serifI : F.mono, size: b.size || 34, color: col(C, b.col, 'mute'), alpha: a, track: b.track ?? 4 });
    },
    emblem(b, t, C, a) { sphere(b.x || 0, b.y || -40, b.size || 240, a, C); },
    // an aged-paper evidence card: drops in tilted, settles flat; rows can be struck through and replaced on cue
    card(b, t, C, a) {
      const w = b.w || 980, rh = b.rowH || 78, rows = b.rows || [], h = 120 + rows.length * rh + (b.stamp ? 110 : 0);
      const p = E.out(prog(t, b.t0, b.t0 + .75));
      ctx.save(); ctx.globalAlpha = a; ctx.translate(b.x || 0, (b.y || 0) - 46 * (1 - p));
      ctx.rotate((b.tilt ?? -.035) * (1 + 2.2 * (1 - p))); ctx.scale(1, .84 + .16 * p);
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 44; ctx.shadowOffsetY = 26;
      ctx.fillStyle = C.card; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.shadowColor = 'transparent';
      if (GRAIN) { ctx.globalAlpha = a * .5; ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(-w / 2, -h / 2, w, h); ctx.globalAlpha = a; }
      const lamp = ctx.createRadialGradient(-w * .3, -h * .6, 20, -w * .3, -h * .6, w * 1.1);   // the desk lamp
      lamp.addColorStop(0, 'rgba(255,236,200,.22)'); lamp.addColorStop(1, 'rgba(40,25,10,.28)');
      ctx.fillStyle = lamp; ctx.fillRect(-w / 2, -h / 2, w, h);
      const L = -w / 2 + 56, R = w / 2 - 56;
      if (b.title) tx(b.title, L, -h / 2 + 52, { font: F.sans, size: 22, color: C.cardInk, align: 'left', alpha: .75, track: 5 });
      ctx.fillStyle = C.cardInk; ctx.globalAlpha = a * .35; ctx.fillRect(L, -h / 2 + 84, R - L, 1.5); ctx.globalAlpha = a;
      rows.forEach((r, i) => {
        const y = -h / 2 + 130 + i * rh, ra = r.t0 != null ? E.out(prog(t, r.t0, r.t0 + .5)) : 1;
        if (ra <= 0) return;
        tx(r.label, L, y, { font: F.sans, size: 28, color: C.cardInk, align: 'left', alpha: ra * .8 });
        const hasTo = r.to != null, vx = hasTo ? R - Math.max(170, measure(r.to, F.monoB, 34) + 110) : R;
        tx(r.value, vx, y, { font: F.mono, size: 34, color: C.cardInk, align: 'right', alpha: ra });
        if (r.tstrike != null && t > r.tstrike) {   // the correction: a brick-red strike, an arrow, the new value in coral
          const q = E.out(prog(t, r.tstrike, r.tstrike + .35)), vw = measure(r.value, F.mono, 34);
          ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.globalAlpha = a * .9;
          ctx.beginPath(); ctx.moveTo(vx - vw - 10, y + 4); ctx.lineTo(vx - vw - 10 + (vw + 20) * q, y - 5); ctx.stroke(); ctx.restore();
          if (hasTo) {
            const tq = E.out(prog(t, (r.tto ?? r.tstrike + .35), (r.tto ?? r.tstrike + .35) + .45));
            if (tq > 0) {
              ctx.save(); ctx.globalAlpha = a * tq; ctx.strokeStyle = C.red; ctx.lineWidth = 3; const ax = vx + 22, bx = vx + 70;
              ctx.beginPath(); ctx.moveTo(ax, y); ctx.lineTo(bx, y); ctx.moveTo(bx - 12, y - 9); ctx.lineTo(bx, y); ctx.lineTo(bx - 12, y + 9); ctx.stroke(); ctx.restore();
              tx(r.to, R, y, { font: F.monoB, size: 34, color: b.toCol || '#a9492a', align: 'right', alpha: tq });
            }
          }
        }
        if (i < rows.length - 1) { ctx.fillStyle = C.cardInk; ctx.globalAlpha = a * ra * .18; ctx.fillRect(L, y + rh / 2, R - L, 1); ctx.globalAlpha = a; }
      });
      if (b.stamp && b.tstamp != null && t > b.tstamp) stamp(b.stamp, prog(t, b.tstamp, b.tstamp + .4), R - 70, h / 2 - 64, C);   // in its own corner, clear of the rows
      ctx.restore();
    },
    // minimal horizontal bars on the dark canvas: one accent bar, the rest charcoal; length and number count up together
    bars(b, t, C, a) {
      const w = b.w || 1180, rows = b.bars || [], rh = b.rowH || 92, x0 = (b.x || 0) - w / 2, lw = b.labelW || 330;
      const top = (b.y || 0) - (rows.length * rh) / 2, bw = w - lw - 140, max = b.max || Math.max(...rows.map(r => r.value));
      ctx.save(); ctx.globalAlpha = a;
      if (b.title) tx(b.title, x0, top - 50, { font: F.sans, size: 24, color: C.mute, align: 'left', track: 6 });
      for (let g = 0; g <= 4; g++) {   // faint dotted gridlines
        const gx = x0 + lw + bw * g / 4; ctx.fillStyle = C.mute;
        for (let y = top; y < top + rows.length * rh; y += 9) { ctx.globalAlpha = a * .22; ctx.fillRect(gx, y, 1.5, 3); }
      }
      ctx.globalAlpha = a;
      rows.forEach((r, i) => {
        const y = top + i * rh + rh / 2, q = E.inOut(prog(t, b.t0 + .25 + i * .35, b.t0 + 1.45 + i * .35)), v = r.value * q;
        tx(r.label, x0, y, { font: F.sans, size: 30, color: C.fg, align: 'left', alpha: .9 });
        ctx.fillStyle = r.accent ? C.acc : (C.charcoal || '#403d38');
        ctx.fillRect(x0 + lw, y - 20, bw * v / max, 40);
        if (q > 0) tx(`${v.toFixed(b.dec || 0)}${b.unit || ''}`, x0 + lw + bw * v / max + 22, y + 2, { font: F.mono, size: 32, color: r.accent ? C.acc : C.fg, align: 'left' });
      });
      ctx.restore();
    },
    // the testimony: a backlit, explicitly non-photographic silhouette in a light wedge, a lower third, a building quote
    witness(b, t, C, a, sec) {
      const sx = W * .3 - W / 2, top = -H / 2;
      ctx.save(); ctx.globalAlpha = a;
      const wedge = ctx.createLinearGradient(sx + 380, top, sx - 200, H / 2);
      wedge.addColorStop(0, 'rgba(255,226,180,.26)'); wedge.addColorStop(1, 'rgba(255,226,180,0)');
      ctx.fillStyle = wedge; ctx.beginPath(); ctx.moveTo(sx + 160, top); ctx.lineTo(sx + 620, top); ctx.lineTo(sx + 260, H / 2); ctx.lineTo(sx - 420, H / 2); ctx.closePath(); ctx.fill();
      const r = rnd(9);
      for (let k = 0; k < 8; k++) {   // out-of-focus dust in the light
        const bx = sx - 200 + r() * 700 + Math.sin(T * .3 + k) * 20, by = top + 120 + r() * 700, br = 18 + r() * 42;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br); g.addColorStop(0, 'rgba(255,220,170,.16)'); g.addColorStop(1, 'rgba(255,220,170,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
      }
      const hx = sx, hy = 20;   // head and shoulders, rim-lit from the wedge side
      ctx.fillStyle = '#050404'; ctx.beginPath(); ctx.ellipse(hx, hy - 150, 78, 96, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx - 50, hy - 70); ctx.lineTo(hx + 50, hy - 70); ctx.lineTo(hx + 56, hy - 10);
      ctx.bezierCurveTo(hx + 230, hy + 10, hx + 260, hy + 150, hx + 270, H / 2); ctx.lineTo(hx - 270, H / 2);
      ctx.bezierCurveTo(hx - 260, hy + 150, hx - 230, hy + 10, hx - 56, hy - 10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,160,.55)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(hx, hy - 150, 78, 96, 0, -1.3, .1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + 56, hy - 10); ctx.bezierCurveTo(hx + 230, hy + 10, hx + 260, hy + 150, hx + 270, H / 2); ctx.stroke();
      ctx.restore();
      tx('GRAPHIC RECONSTRUCTION — NOT A PHOTOGRAPH', W / 2 - 70, -H / 2 + 72, { font: F.mono, size: 18, color: C.mute, align: 'right', alpha: a * .8, track: 3 });
      const qx = W * .52 - W / 2, qw = 760;   // the quote builds with the narrator's words from quoteAt on
      if (b.quote) {
        const n = b.quote.split(/\s+/).length, from = b.tquote ?? b.t0;
        const said = sec.words.filter(w => w.t0 >= from - .02).slice(0, n), shown = said.filter(w => w.t0 <= t).length;
        const words = ('“' + b.quote + '”').split(/\s+/), lines = wrap(words, F.serifI, 50, qw);
        lines.forEach((ln, li) => ln.forEach((wi) => {
          if (wi >= shown) return;
          const pre = lines[li].filter(k => k < wi).map(k => words[k]).join(' ');
          const x = qx + (pre ? measure(pre + ' ', F.serifI, 50) : 0), wt = said[wi] ? said[wi].t0 : from;
          tx(words[wi], x, -150 + li * 70, { font: F.serifI, size: 50, color: C.fg, align: 'left', alpha: a * E.out(prog(t, wt, wt + .3)) });
        }));
      }
      const lt = E.out(prog(t, b.t0 + .6, b.t0 + 1.3));   // lower third
      ctx.save(); ctx.globalAlpha = a * lt; ctx.fillStyle = C.acc; ctx.fillRect(qx, 150, 4, 96); ctx.restore();
      tx(b.name || '', qx + 26, 178, { font: F.serif, size: 46, color: C.fg, align: 'left', alpha: a * lt });
      tx(b.role || '', qx + 28, 226, { font: F.sans, size: 22, color: C.acc, align: 'left', alpha: a * lt, track: 5 });
    },
  };
  // round double-ring ink stamp, slammed on
  function stamp(s, p, x, y, C) {
    if (p <= 0) return;
    const k = 1.7 - .7 * E.out(clamp(p * 1.3)), r = 84;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.22); ctx.scale(k, k); ctx.globalAlpha *= clamp(p * 2.5) * .85;
    ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r - 12, 0, TAU); ctx.stroke();
    tx(s, 0, 2, { font: F.monoB, size: Math.min(30, 30 * 120 / measure(s, F.monoB, 30)), color: C.red, track: 2 });
    ctx.restore();
  }

  // ---------------------------------------------------------------- captions: the narration, clause by clause
  function captions(sec, t, C, alpha) {
    if (sec.captions === false || alpha <= 0) return;
    if (sec.blocks.some(b => b.kind === 'witness' && vis(b, t) > .5)) return;   // the testimony quote is the narration
    const s = activeSentence(sec, t); if (!s) return;
    const fade = 1 - prog(t, s.t1 + 1.2, s.t1 + 1.6);
    if (fade <= 0) return;
    const ws = sec.words.filter(w => w.si === s.si), size = 38, lines = wrap(ws.map(w => w.w), F.sans, size, 1380);
    const keep = lines.slice(-2), y0 = H - 150 - (keep.length - 1) * 54;
    const band = ctx.createLinearGradient(0, H - 300, 0, H); band.addColorStop(0, 'rgba(0,0,0,0)'); band.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.save(); ctx.globalAlpha = alpha * fade; ctx.fillStyle = band; ctx.fillRect(0, H - 300, W, 300); ctx.restore();
    keep.forEach((ln, li) => {
      const full = ln.map(i => ws[i].w).join(' '), lw = measure(full, F.sans, size); let x = W / 2 - lw / 2;
      ln.forEach(i => {
        const w = ws[i], p = prog(t, w.t0, w.t0 + .18);
        if (p > 0) tx(w.w, x, y0 + li * 54, { font: F.sans, size, color: C.fg, align: 'left', alpha: alpha * fade * p * .94 });
        x += measure(w.w + ' ', F.sans, size);
      });
    });
  }

  // ---------------------------------------------------------------- a chapter: its card, its blocks
  function chapterCard(sec, t, C, alpha) {
    if (!sec.title) return;
    const hold = sec.cardHold ?? 2.8, a = alpha * E.out(prog(t, 0, .8)) * (1 - E.inOut(prog(t, hold, hold + .7)));
    if (a <= 0) return;
    sphere(W / 2, H / 2 - 90, 190, a, C);
    const n = sec.chapter ?? sec.i + 1;
    if (n !== false) tx(`CHAPTER ${n}`, W / 2, H / 2 + 150, { font: F.sans, size: 26, color: C.acc, alpha: a, track: 10 });
    tx(sec.title, W / 2, H / 2 + 225, { font: F.serif, size: 84, color: C.fg, alpha: a });
  }
  function content(sec, t, alpha) {
    const C = sec.C, push = 1 + .025 * clamp(t / Math.max(1, sec.d));   // a slow, measured push-in per chapter
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
    chapterCard(sec, t, C, alpha);
    ctx.translate(W / 2, H / 2);
    for (const b of sec.blocks) {
      const a = vis(b, t) * alpha; if (a <= 0 || !KIND[b.kind]) continue;
      ctx.save(); KIND[b.kind](b, t, C, a, sec); ctx.restore();
    }
    ctx.restore();
  }

  return {
    fallback: () => ({ bg: Object.keys(THEME_STORY.palettes)[0], blocks: [] }),   // captions carry an unauthored chapter
    init(SEC) {
      const r = rnd(2024);
      STARS = Array.from({ length: 230 }, () => ({ x: r() * W, y: r() * H, r: r() < .12 ? 2 : 1.2, a: .25 + r() * .5, f: .3 + r() * .9, ph: r() * 6, warm: r() < .18 }));
      EMBERS = Array.from({ length: 34 }, () => ({ x: r() * W, v: .012 + r() * .02, o: r(), ph: r() * 6, r: 1.2 + r() * 2.2, a: .25 + r() * .45 }));
      const n = 54, pts = [];   // a Fibonacci sphere, each node linked to its 3 nearest neighbours
      for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + .5) / n, rr = Math.sqrt(1 - y * y), th = i * 2.39996; pts.push([Math.cos(th) * rr, y, Math.sin(th) * rr]); }
      const edges = new Set();
      pts.forEach((p, i) => pts.map((q, j) => [j, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2]).filter(([j]) => j !== i)
        .sort((x, y) => x[1] - y[1]).slice(0, 3).forEach(([j]) => edges.add(i < j ? `${i},${j}` : `${j},${i}`)));
      SPHERE = { pts, edges: [...edges].map(e => e.split(',').map(Number)) };
      for (const sec of SEC) {   // a block with clear: true fades out everything before it
        sec.blocks.forEach((b, j) => { if (b.clear) for (let k = 0; k < j; k++) sec.blocks[k].tclear = Math.min(sec.blocks[k].tclear ?? Infinity, b.t0); });
      }
    },
    setup() {   // paper grain for the evidence cards
      GRAIN = document.createElement('canvas'); GRAIN.width = GRAIN.height = 256;
      const g = GRAIN.getContext('2d'), img = g.createImageData(256, 256), r = rnd(77);
      for (let i = 0; i < img.data.length; i += 4) { const v = 120 + r() * 90; img.data[i] = v; img.data[i + 1] = v * .92; img.data[i + 2] = v * .8; img.data[i + 3] = 40 + r() * 50; }
      g.putImageData(img, 0, 0);
    },
    draw(sec, t) {
      const C = sec.C;
      background(C);
      const prev = sec.i > 0 ? SEC[sec.i - 1] : null, q = prev ? E.inOut(prog(t, 0, .7)) : 1;
      if (prev && q < 1) content(prev, prev.d - .01, 1 - q);   // the outgoing chapter ghosts under the new one
      content(sec, t, prev ? E.inOut(prog(t, .1, .8)) : 1);
      captions(sec, t, C, 1);
    },
    hud(sec, t) {   // case-file tab top-left, citation bottom-left
      const C = sec.C, a = prog(t, .4, 1.1), n = sec.chapter ?? sec.i + 1;
      const tag = [n !== false ? `CHAPTER ${n}` : '', sec.title || sec.kicker || ''].filter(Boolean).join(' — ');
      if (tag) tx(tag.toUpperCase(), 72, 70, { font: F.sans, size: 20, color: C.fg, align: 'left', alpha: a * .72, track: 6 });
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.acc; ctx.fillRect(72, 90, 34, 2); ctx.restore();
      const src = sec.source || (window.PROJECT && window.PROJECT.source);
      if (src) tx(`SOURCE · ${src}`, 72, H - 46, { font: F.mono, size: 17, color: C.mute, align: 'left', alpha: .75, track: 2 });
    },
    enter: false,   // the cross-dissolve happens inside draw
  };
})();
runLook(DOCUMENTARY);
