'use strict';
// Look: kinetic typography. Words slam, pop and type in on the narrator's words; the camera flies between tilted frames;
// pixel props and stamps carry the argument. Runs on engine/runtime.js (runLook); scene schema: references/scenes.md.
// Set pieces here are generic; a project adds its own props and set pieces in theme.js (props, fx).
// Globals owned here: FONT, PROPS, drawProp, FX, colorOf, textLine, drawWords, stampBox, drawBlock, drawSection.
const FONT = { D: 'DISP', M: 'MONO', MB: 'MONOB' };

// ---------------------------------------------------------------- sprites: generic props, project props merge in
// rows: one string per pixel row ('.' = empty); pal: C => { char: colour }, C = the section's palette
const PROPS = {
  person: { rows: ['..PPP..', '..PPP..', '..PPP..', '...P...', '.PPPPP.', 'P.PPP.P', 'P.PPP.P', '..PPP..', '..P.P..', '..P.P..', '.PP.PP.'], pal: C => ({ P: C.fg }) },
  check: { rows: ['.......GG', '......GG.', '.....GG..', 'GG..GG...', '.GGGG....', '..GG.....'], pal: C => ({ G: C.green }) },
  cross: { rows: ['RR....RR', '.RR..RR.', '..RRRR..', '...RR...', '..RRRR..', '.RR..RR.', 'RR....RR'], pal: C => ({ R: C.red }) },
  flag: { rows: ['PRRRRR', 'PRRRRR', 'PRRRR.', 'PRRRRR', 'P.....', 'P.....', 'P.....'], pal: C => ({ P: C.fg, R: C.red }) },
  cart: { rows: ['KK...........', '.K...........', '.KAAAAAAAAAK.', '.KAAAAAAAAK..', '..KAAAAAAAK..', '..KAAAAAAK...', '...KKKKKKK...', '...K.....K...', '..KKK...KKK..', '..KKK...KKK..'], pal: C => ({ K: C.fg, A: C.acc }) },
  glass: { rows: ['G......G', 'G......G', 'G......G', 'GLLLLLLG', 'GLLLLLLG', '.GLLLLG.', '..GGGG..', '...GG...', '...GG...', '..GGGG..'], pal: () => ({ G: '#f3f1e6', L: '#e8dfb0' }) },
  note: { rows: ['...KKKKK', '...K...K', '...K...K', '...K...K', '.KKK.KKK', 'KKKK.KKK', '.KK...K.'], pal: C => ({ K: C.acc }) },
  ...(THEME_STORY.props || {}),
};
const drawProp = (k, x, y, s, C, o) => drawPixels(PROPS[k].rows, PROPS[k].pal(C), x, y, s, o);

// ---------------------------------------------------------------- blocks
function colorOf(C, c) { return C[c || 'fg'] || c; }

function textLine(s, o) { text(s, 0, 0, { font: FONT[o.font || 'D'], size: o.size || 120, color: o.color, align: o.align || 'center', alpha: o.alpha ?? 1, jit: false, maxW: o.maxW || 1760 }); }

function drawWords(b, t, C, alpha) {
  const font = FONT[b.font || 'D'], size = b.size || 120, words = b.txt.split(' ');
  const ws = words.map(w => measure(w, font, size)), gap = size * (b.font && b.font !== 'D' ? .6 : .26);
  const total = ws.reduce((x, y) => x + y, 0) + gap * (words.length - 1);
  const sc = Math.min(1, 1760 / total); ctx.save(); ctx.scale(sc, sc);
  const chars = b.txt.length; let x = -total / 2, c = 0;
  if (b.hl && t > b.t1) {   // highlighter swipes in once the line is complete
    const q = E.out(prog(t, b.t1, b.t1 + .35));
    ctx.save(); ctx.globalAlpha = alpha * .38; ctx.fillStyle = colorOf(C, b.hl);
    ctx.fillRect(-total / 2 - 14, -size * .42, (total + 28) * q, size * .84); ctx.restore();
  }
  words.forEach((w, i) => {
    const wt = b.t0 + (b.t1 - b.t0) * (c / chars), p = prog(t, wt, wt + .22);
    if (p > 0) {
      ctx.save(); ctx.translate(x + ws[i] / 2, (1 - E.out(p)) * size * .25); const s = .7 + .3 * E.back(p); ctx.scale(s, s);
      text(w, 0, 0, { font, size, color: colorOf(C, b.col), alpha: alpha * clamp(p * 2), jit: false });
      ctx.restore();
    }
    x += ws[i] + gap; c += w.length + 1;
  });
  ctx.restore();
  return total * sc;
}

function stampBox(s, p, color, size, alpha) {
  const sc = 1.9 - .9 * E.out(clamp(p * 1.3)), w = measure(s, 'DISP', size) + size * .7, h = size * 1.35;
  ctx.save(); ctx.scale(sc, sc); ctx.globalAlpha = clamp(p * 2.5) * .92 * alpha;
  ctx.strokeStyle = color; ctx.lineWidth = size * .09; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, size * .2); ctx.stroke();
  text(s, 0, size * .06, { font: 'DISP', size, color, jit: false });
  ctx.restore();
}

function drawBlock(b, t, C) {
  if (t < b.t0 - .001) return;
  const out = b.tout != null ? prog(t, b.tout, b.tout + (b.exit === 'strike' ? .35 : .4)) : 0;
  if (out >= 1 && b.exit !== 'strike') return;
  const p = prog(t, b.t0, b.t0 + (b.in === 'slam' ? .28 : .4));
  let alpha = 1, dy = 0, dx = 0, s = 1, rot = 0;
  if (b.exit === 'fade') alpha = 1 - out;
  if (b.exit === 'up') { alpha = 1 - out; dy = -70 * E.in(out); }
  if (b.exit === 'drop') { dy = 1000 * out * out; rot = out * .5; }
  if (b.exit === 'strike') alpha = 1 - .55 * out;
  ctx.save(); ctx.translate(b.x || 0, b.y || 0); ctx.rotate(b.rot || 0);
  if (b.fx) {
    if (!FX[b.fx]) throw new Error(`unknown set piece fx: '${b.fx}' (engine/kinetic.js FX or theme.js fx)`);
    ctx.translate(0, dy); ctx.rotate(rot); FX[b.fx](b, t, C, alpha); ctx.restore(); return;
  }
  const color = colorOf(C, b.col), size = b.size || 120, font = b.font || 'D';
  switch (b.in) {
    case 'slam': s = 1 + 1.3 * (1 - E.out(p)); alpha *= clamp(p * 3); break;
    case 'pop': s = E.back(p); break;
    case 'up': dy += 80 * (1 - E.out(p)); alpha *= p; break;
    case 'left': dx = -300 * (1 - E.out(p)); alpha *= p; break;
    case 'right': dx = 300 * (1 - E.out(p)); alpha *= p; break;
    case 'fade': alpha *= prog(t, b.t0, b.t0 + .6); break;
  }
  ctx.translate(dx, dy); ctx.rotate(rot); ctx.scale(s, s);
  let w;
  if (b.in === 'words') w = drawWords(b, t, C, alpha);
  else if (b.in === 'stamp') { stampBox(b.txt, prog(t, b.t0, b.t0 + .35), color, size, alpha); w = 0; }
  else {
    const str = b.in === 'type' ? typed(b.txt, prog(t, b.t0, b.t0 + b.txt.length * .04)) : b.txt;
    textLine(str, { font, size, color, alpha }); w = Math.min(1760, measure(b.txt, FONT[font], size));
  }
  if (b.exit === 'strike' && out > 0) {   // strike-through drawn across the line
    ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = size * .08; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-w / 2 - 20, size * .05); ctx.lineTo(-w / 2 - 20 + (w + 40) * E.out(out), -size * .06); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- generic set pieces (fx); projects add more in theme.js
const FX = {
  // a receipt card; rows: [label, value, labelAnchor, valueAnchor]
  receiptCard(b, t, C, alpha) {
    const w = b.w || 980, rh = 86, h = 90 + b.rows.length * rh, p = E.out(prog(t, b.t0, b.t0 + .45));
    ctx.save(); ctx.globalAlpha = alpha * p; ctx.translate(0, (1 - p) * 160);
    ctx.fillStyle = C.card; ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2);
    for (let x = -w / 2; x <= w / 2; x += 24) ctx.lineTo(x, -h / 2 + ((x / 24) % 2 ? 9 : 0));
    ctx.lineTo(w / 2, h / 2); for (let x = w / 2; x >= -w / 2; x -= 24) ctx.lineTo(x, h / 2 - ((x / 24) % 2 ? 9 : 0));
    ctx.closePath(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14; ctx.fill(); ctx.restore();
    b.rows.forEach((r, i) => {
      const [tl, tv] = b.rowT[i], y = -h / 2 + 70 + i * rh, pl = prog(t, tl, tl + .3), pv = prog(t, tv, tv + .3);
      if (pl > 0) text(r[0], -w / 2 + 60, y, { font: 'MONO', size: 52, color: C.cardInk, align: 'left', alpha: alpha * pl, jit: false });
      if (pv > 0) {
        ctx.save(); ctx.translate(w / 2 - 60, y); const s = .6 + .4 * E.back(pv); ctx.scale(s, s);
        text(r[1], 0, 0, { font: 'MONOB', size: 56, color: C.cardInk, align: 'right', alpha: alpha * clamp(pv * 2), jit: false }); ctx.restore();
      }
    });
  },
  // a mini character from minis-ai.js (key: 'claude' by default), bobbing and blinking
  mini(b, t, C, alpha) {
    const p = E.back(prog(t, b.t0, b.t0 + .4)); if (p <= 0) return;
    drawMini(b.key || 'claude', 0, Math.sin(T * 2.2) * 6, (b.s || 14) * p, { blink: T % 3.3 < .12, alpha });
  },
  claude(b, t, C, alpha) { FX.mini({ ...b, key: 'claude' }, t, C, alpha); },
  // a row of n people popping in; lit: how many light up at litAt (colour litCol, default acc)
  people(b, t, C, alpha) {
    const n = b.n, s = b.s || 9, gap = b.gap || 80, x0 = -(n - 1) * gap / 2;
    for (let i = 0; i < n; i++) {
      const p = E.back(prog(t, b.t0 + i * .045, b.t0 + i * .045 + .3)); if (p <= 0) continue;
      let col = C.fg;
      if (b.lit != null) { const lit = i < b.lit && b.tlit != null && t > b.tlit + i * .05; col = lit ? C[b.litCol || 'acc'] : mixHex(C.bg, C.mute, .55); }
      drawPixels(PROPS.person.rows, { P: col }, x0 + i * gap, s * 5.5, s * p, { alpha });
    }
  },
  // n copies of a prop in a row, popping in one by one (key: prop name)
  row(b, t, C, alpha) {
    const n = b.n, s = b.s || 12, gap = b.gap || s * (PROPS[b.key].rows[0].length + 3), x0 = -(n - 1) * gap / 2;
    for (let i = 0; i < n; i++) {
      const p = E.back(prog(t, b.t0 + i * .12, b.t0 + i * .12 + .3));
      if (p > 0) drawProp(b.key, x0 + i * gap, s * PROPS[b.key].rows.length / 2, s * p, C, { alpha });
    }
  },
  // one prop, bobbing; badge: a small prop (flag, check) above its shoulder
  sprite(b, t, C, alpha) {
    const p = E.back(prog(t, b.t0, b.t0 + .4)), s = b.s || 12; if (p <= 0) return;
    const rows = PROPS[b.key].rows, h = rows.length * s;
    drawProp(b.key, 0, h / 2 + Math.sin(T * 2.4 + b.t0) * 4, s * p, C, { alpha });
    if (b.badge) {
      const q = E.back(prog(t, b.t0 + .35, b.t0 + .7));
      if (q > 0) drawProp(b.badge, rows[0].length * s * .55, -h / 2 + Math.sin(T * 3) * 5, s * .75 * q, C, { alpha });
    }
  },
  // a sheet that keeps unrolling off the bottom of the frame (a long rulebook, a terms page)
  scroll(b, t, C, alpha) {
    const w = b.w || 430, q = E.inOut(prog(t, b.t0, b.t0 + 3.2)), h = 80 + 1500 * q, r = rnd(41);
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = C.card; ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 24;
    ctx.fillRect(-w / 2, 0, w, h); ctx.shadowBlur = 0; ctx.fillStyle = mixHex(C.card, C.cardInk, .35);
    for (let y = 36; y < h - 20; y += 30) ctx.fillRect(-w / 2 + 34, y, (w - 68) * (.45 + r() * .55), 8);
    ctx.fillStyle = C.acc; ctx.fillRect(-w / 2 - 12, -14, w + 24, 28); ctx.restore();
  },
  // soft stage light behind a title
  spot(b, t, C, alpha) {
    const q = E.out(prog(t, b.t0, b.t0 + .6)), g = ctx.createRadialGradient(0, 0, 40, 0, 0, 760);
    g.addColorStop(0, `rgba(255,248,225,${.55 * q * alpha})`); g.addColorStop(1, 'rgba(255,248,225,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 900, 620, 0, 0, TAU); ctx.fill();
  },
  // a bar drawn left to right (a threshold, a divider)
  rule(b, t, C, alpha) {
    const q = E.out(prog(t, b.t0, b.t0 + .6)), w = b.w || 1200;
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = colorOf(C, b.col || 'acc');
    ctx.fillRect(-w / 2, -6, w * q, 12); ctx.restore();
  },
  // a check or cross mark (kind: 'check' | 'cross')
  mark(b, t, C, alpha) {
    const p = E.back(prog(t, b.t0, b.t0 + .35)); if (p <= 0) return;
    drawProp(b.kind, 0, (b.s || 12) * 3, (b.s || 12) * p, C, { alpha });
  },
  ...(THEME_STORY.fx || {}),
};

// ---------------------------------------------------------------- frame
function drawSection(sc, t) {
  const C = sc.C;
  ctx.drawImage(BG[sc.bg], 0, 0);
  const cm = cameraOf(sc, t);
  let amp = 0;   // landing shake from slams and stamps
  for (const b of sc.blocks) if ((b.in === 'slam' || b.in === 'stamp') && t > b.t0 + .26) amp = Math.max(amp, 11 * (1 - prog(t, b.t0 + .26, b.t0 + .5)));
  const [sx, sy] = shake(amp, 3);
  speedLines(cm.fly * .5, mixHex(C.bg, C.mute, .5));
  ctx.save(); cam(cm.z, cm.x, cm.y, cm.r, sx, sy);
  sc.frames.forEach((fr, fi) => {   // only frames near the camera
    if (Math.abs(fr.x - cm.x) > 2600 || Math.abs(fr.y - cm.y) > 1800) return;
    ctx.save(); ctx.translate(fr.x, fr.y); ctx.rotate(fr.r || 0);
    for (const b of sc.blocks) if (b.f === fi) drawBlock(b, t, C);
    ctx.restore();
  });
  ctx.restore();
}

runLook({ draw: drawSection });   // hud (kicker + dots) and the colour-wipe entry are the runtime defaults
