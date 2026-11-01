'use strict';
// Look: whiteboard lecture. After the code-video style guide (references/styles/whiteboard.md, MIT), adapted to
// narration: a hand writes and draws on a locked-off whiteboard exactly as the narrator speaks; earlier sections stay on
// the board as faint ghosts. Block vocabulary and an example: .claude/skills/story-video/references/looks/whiteboard.md
//
// Warm off-white board with cleaning smudges, inside an aluminium bevel frame. Ink: black for headlines and labels, blue
// for new or updated values, red for strikes and alert circles, green for a check, orange for the one accent (title
// underline, the "after" bars). Each section opens with a circled numeral and a handwritten headline. Coordinates are
// board pixels from the top-left, like writing on a board. Nothing fades in: everything is written or drawn on.
// Globals owned here: none besides this closure's result (WHITEBOARD).
const WHITEBOARD = (() => {
  const F = { hand: 'HAND', body: 'HANDR', script: 'SCRIPT', mono: 'MONO' };
  const FRAME = 34, INSET = 18;   // aluminium rim + inner bevel, px
  let SURFACE = null;

  const col = (C, c, d = 'fg') => C[c || d] || c;
  const fontOf = b => F[b.font || 'hand'] || b.font;
  const sizeOf = b => b.size || 60;
  const idOf = (sec, j, k = 0) => sec.i * 1000 + j * 10 + k + 1;   // stable rough.js seed per stroke
  const ink = (C, c, w = 4) => ({ stroke: col(C, c), strokeWidth: w, roughness: 1.1, bowing: .7 });

  // how long drawing a block takes, and where the pen tip is at progress p (for the hand)
  function writeDur(b) { return b.dur ?? clamp(b.txt.length * .05, .35, Math.max(.6, Math.min(3, (b.t1 - b.t0) + .3))); }
  function bbox(b) {   // a write block's box; measured lazily (fonts must be loaded)
    if (!b._box) { const w = Math.min(measure(b.txt, fontOf(b), sizeOf(b)), b.maxW || 1600); b._box = { x: b.x, y: b.y, w, h: sizeOf(b) }; }
    return b._box;
  }
  function geom(sec, ref) {   // blocks refer to earlier write blocks by id
    const t = sec.blocks.find(x => x.id === ref);
    if (!t) throw new Error(`whiteboard: no block with id "${ref}" in section ${sec.key}`);
    return bbox(t);
  }

  // ---------------------------------------------------------------- strokes: [t0, t1, draw(p), tip(p)] per block
  function strokes(sec) {
    if (sec._strokes) return sec._strokes;
    const C = sec.C, out = [];
    const slugT = .2;   // the section slug: a circled numeral, then the headline
    out.push({ slug: true, t0: slugT, t1: slugT + .7, draw: p => sketch(circlePts(128, 128, 40, 38), p, idOf(sec, 99), ink(C, 'fg', 3.5), 0),
      tip: p => { const a = -Math.PI / 2 + p * TAU * 1.06; return [128 + Math.cos(a) * 40, 128 + Math.sin(a) * 38]; },
      after: () => text(String(sec.number ?? sec.i + 1), 128, 131, { font: F.hand, size: 50, color: C.fg, jit: false }) });
    if (sec.title) {
      const tt = { txt: sec.title, x: 196, y: 130, size: 62, t0: slugT + .6, t1: slugT + .6 + sec.title.length * .05 };
      out.push({ ...writeStroke(C, tt, 'fg', writeDur(tt)), slug: true });
    }
    sec.blocks.forEach((b, j) => {
      const k = KIND[b.kind]; if (!k) throw new Error(`whiteboard: unknown block kind "${b.kind}" in section ${sec.key}`);
      out.push(...[].concat(k(sec, b, j, C)));
    });
    return (sec._strokes = out);
  }
  function writeStroke(C, b, c, dur) {
    const box = { x: b.x, y: b.y, w: 0 };
    return { t0: b.t0, t1: b.t0 + dur,
      draw: p => text(b.txt, b.x, b.y, { font: fontOf(b), size: sizeOf(b), color: col(C, b.col || c), align: 'left', reveal: p, jit: false, maxW: b.maxW || 1600 }),
      tip: p => { if (!box.w) box.w = Math.min(measure(b.txt, fontOf(b), sizeOf(b)), b.maxW || 1600); return [b.x + box.w * p, b.y + sizeOf(b) * .18]; } };
  }
  const line = (a, b, n = 16, wob = 3, seed = 1) => { const r = rnd(seed); return Array.from({ length: n + 1 }, (_, i) => [lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n) + (i && i < n ? (r() - .5) * wob : 0)]); };
  const tipOn = pts => p => pts[Math.min(pts.length - 1, Math.floor(p * (pts.length - 1)))];

  const KIND = {
    write: (sec, b, j, C) => writeStroke(C, b, 'fg', writeDur(b)),
    underline(sec, b, j, C) {
      const g = b.under ? geom(sec, b.under) : b, x0 = g.x - 6, x1 = g.x + (b.w || g.w) + 10, y = g.y + (g.h || 60) * .55;
      const pts = line([x0, y], [x1, y + 4], 18, 5, idOf(sec, j));
      return { t0: b.t0, t1: b.t0 + (b.dur || .45), draw: p => sketch(pts, p, idOf(sec, j), ink(C, b.col || 'acc', 5), 0), tip: tipOn(pts) };
    },
    strike(sec, b, j, C) {
      const g = geom(sec, b.of), y = g.y + 2, pts = line([g.x - 12, y + 6], [g.x + g.w + 12, y - 6], 14, 4, idOf(sec, j));
      return { t0: b.t0, t1: b.t0 + (b.dur || .4), draw: p => sketch(pts, p, idOf(sec, j), ink(C, b.col || 'red', 5), 0), tip: tipOn(pts) };
    },
    circle(sec, b, j, C) {
      const g = b.around ? geom(sec, b.around) : null;
      const cx = g ? g.x + g.w / 2 : b.x, cy = g ? g.y : b.y, rx = b.rx || (g ? g.w / 2 + 34 : 80), ry = b.ry || (g ? g.h * .72 : 60);
      const pts = circlePts(cx, cy, rx, ry, 48, -2.4);
      return { t0: b.t0, t1: b.t0 + (b.dur || .6), draw: p => sketch(pts, p, idOf(sec, j), ink(C, b.col || 'red', 4.5), 0), tip: tipOn(pts) };
    },
    check(sec, b, j, C) {
      const s = b.size || 60, x = b.after ? geom(sec, b.after).x + geom(sec, b.after).w + 40 + s * .5 : b.x, y = b.after ? geom(sec, b.after).y : b.y;
      const pts = [[x - s * .5, y], [x - s * .12, y + s * .4], [x + s * .6, y - s * .55]];
      return { t0: b.t0, t1: b.t0 + (b.dur || .35), draw: p => sketch(pts, p, idOf(sec, j), ink(C, b.col || 'green', 7), 0), tip: tipOn(pts) };
    },
    arrow(sec, b, j, C) {
      const [a, z] = [b.from, b.to], mid = [(a[0] + z[0]) / 2 + (b.bend || 0), (a[1] + z[1]) / 2 - Math.abs(b.bend || 0) * .4];
      const pts = bez(a, mid, z, 20), dur = b.dur || .5, id = idOf(sec, j), o = ink(C, b.col || 'fg', 4);
      const ang = Math.atan2(z[1] - pts[pts.length - 3][1], z[0] - pts[pts.length - 3][0]), L = 26;
      const head = [[z[0] + Math.cos(ang + 2.6) * L, z[1] + Math.sin(ang + 2.6) * L], z, [z[0] + Math.cos(ang - 2.6) * L, z[1] + Math.sin(ang - 2.6) * L]];
      return { t0: b.t0, t1: b.t0 + dur, draw: p => { sketch(pts, p, id, o, 0); if (p >= 1) sketch(head, 1, id + 5, o, 0); }, tip: tipOn(pts) };
    },
    // hand-drawn bars: a wavy baseline, solid bars growing up (gray = before, accent = after), values lettered above
    bars(sec, b, j, C) {
      const n = b.bars.length, bw = b.barW || Math.min(120, b.w / n * .55), gap = b.w / n, max = b.max || Math.max(...b.bars.map(r => r.value));
      const base = line([b.x - 20, b.y], [b.x + b.w + 10, b.y + 3], 22, 6, idOf(sec, j)), out = [];
      out.push({ t0: b.t0, t1: b.t0 + .5, draw: p => sketch(base, p, idOf(sec, j), ink(C, 'fg', 3.5), 0), tip: tipOn(base) });
      b.bars.forEach((r, i) => {
        const x = b.x + gap * i + (gap - bw) / 2, h = (b.h || 320) * r.value / max, t0 = b.t0 + .55 + i * .55, c = col(C, r.col || 'gray');
        out.push({ t0, t1: t0 + .5, draw: p => {
          if (p > 0) rc.rectangle(x, b.y - h * p, bw, h * p, ro(idOf(sec, j, i + 1), { fill: c, fillStyle: 'solid', stroke: c, strokeWidth: 2, roughness: .9 }, 0));
          if (p >= 1) text(String(r.value), x + bw / 2, b.y - h - 34, { font: F.hand, size: 44, color: c, jit: false });
          if (p >= 1) text(r.label, x + bw / 2, b.y + 42, { font: F.script, size: 38, color: C.fg, jit: false });
        }, tip: p => [x + bw * .5, b.y - h * p] });
      });
      return out;
    },
  };

  // ---------------------------------------------------------------- the board and the hand
  function board(C) {
    ctx.drawImage(SURFACE, 0, 0);
  }
  function hand(tip, C) {   // forearm in a navy sleeve from the bottom-right corner, a hand, a capped marker at the tip
    const [x, y] = tip, ang = Math.atan2(H + 260 - y, W + 180 - x);
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = C.sleeve || '#2F4A77'; ctx.lineWidth = 92;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * 120, y + Math.sin(ang) * 120); ctx.lineTo(W + 260, H + 360); ctx.stroke();
    ctx.fillStyle = C.skin || '#F0C3A2';
    ctx.save(); ctx.translate(x + Math.cos(ang) * 70, y + Math.sin(ang) * 70); ctx.rotate(ang);
    ctx.beginPath(); ctx.ellipse(0, 0, 58, 40, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-30, -26, 30, 14, -.5, 0, TAU); ctx.fill();   // thumb over the marker
    ctx.restore();
    ctx.strokeStyle = '#30343c'; ctx.lineWidth = 16;   // the marker
    ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * 8, y + Math.sin(ang) * 8); ctx.lineTo(x + Math.cos(ang) * 78, y + Math.sin(ang) * 78); ctx.stroke();
    ctx.restore();
  }
  // where the hand is: on the pen tip while something is being drawn, else travelling to the next stroke or away
  function handAt(list, t) {
    const rest = [W + 120, H + 160];
    const active = list.find(s => t >= s.t0 && t <= s.t1);
    if (active) return active.tip(prog(t, active.t0, active.t1));
    const next = list.filter(s => s.t0 > t).sort((a, b) => a.t0 - b.t0)[0];
    const last = list.filter(s => s.t1 < t).sort((a, b) => b.t1 - a.t1)[0];
    const from = last ? last.tip(1) : rest;
    if (next && next.t0 - t < .45) return lerpPt(from, next.tip(0), E.inOut(1 - (next.t0 - t) / .45));
    if (last) return lerpPt(from, rest, E.inOut(prog(t, last.t1 + .25, last.t1 + .8)));
    return rest;
  }
  const lerpPt = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

  function content(sec, t, alpha, ghost = false) {
    const list = strokes(sec);
    ctx.save(); ctx.globalAlpha = alpha;
    for (const s of list) {
      if (t < s.t0 || (ghost && s.slug)) continue;   // a ghost keeps its content, not its old section headline
      s.draw(clamp((t - s.t0) / Math.max(.01, s.t1 - s.t0)));
      if (s.after && t >= s.t1) s.after();
    }
    ctx.restore();
    return list;
  }

  return {
    fallback: say => ({   // an unauthored section: the narration handwritten, one line per sentence
      bg: Object.keys(THEME_STORY.palettes)[0],
      blocks: say.map((raw, si) => {
        const txt = stripMarks(raw).split('|').map(phraseText).join(' ');
        return { kind: 'write', at: normText(txt).split(' ').slice(0, 2).join(' '), txt, x: 196, y: 270 + si * 96, size: 44, font: 'body', maxW: 1500 };
      }),
    }),
    setup() {   // the board surface: frame, bevel, off-white with baked-in cleaning smudges
      SURFACE = document.createElement('canvas'); SURFACE.width = W; SURFACE.height = H;
      const g = SURFACE.getContext('2d'), C = PAL[Object.keys(PAL)[0]];
      const rim = g.createLinearGradient(0, 0, 0, H); rim.addColorStop(0, '#c9ccd2'); rim.addColorStop(.5, '#B4B8C0'); rim.addColorStop(1, '#9ea3ac');
      g.fillStyle = rim; g.fillRect(0, 0, W, H);
      g.fillStyle = '#F5F5F3'; g.fillRect(FRAME, FRAME, W - 2 * FRAME, H - 2 * FRAME);
      g.fillStyle = C.bg; g.fillRect(FRAME + INSET, FRAME + INSET, W - 2 * (FRAME + INSET), H - 2 * (FRAME + INSET));
      g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; g.strokeRect(FRAME + INSET, FRAME + INSET, W - 2 * (FRAME + INSET), H - 2 * (FRAME + INSET));
      const r = rnd(31); g.lineCap = 'round';
      for (let i = 0; i < 14; i++) {   // faint arcs left by an eraser: barely there
        g.strokeStyle = `rgba(90,95,105,${.008 + r() * .012})`; g.lineWidth = 30 + r() * 60;
        g.beginPath(); const cx = 120 + r() * (W - 240), cy = 120 + r() * (H - 240), rr = 80 + r() * 260, a0 = r() * TAU;
        g.arc(cx, cy, rr, a0, a0 + .6 + r() * 1.4); g.stroke();
      }
    },
    draw(sec, t) {
      const C = sec.C;
      board(C);
      const push = 1 + .015 * clamp(t / Math.max(1, sec.d));   // locked-off, a hint of push-in per section
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
      for (let k = 0; k < sec.i; k++) {   // the board never resets: earlier sections ghost through, older ones fainter
        const age = sec.i - 1 - k, rest = age ? .015 : .035;
        const fade = age ? rest : lerp(1, rest, E.inOut(prog(t, 0, .9)));
        content(SEC[k], SEC[k].d, fade, fade < .5 || age > 0);
      }
      const list = content(sec, t, 1);
      ctx.restore();
      const src = window.PROJECT && window.PROJECT.source;   // the running citation, bottom-left
      if (src) text(src, FRAME + INSET + 26, H - FRAME - INSET - 30, { font: F.script, size: 30, color: C.mute, align: 'left', jit: false });
      const tip = handAt(list, t);
      if (tip[0] < W + 100) {
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2); hand(tip, C); ctx.restore();
      }
    },
    hud: false,     // the slug and the citation are part of the board
    enter: false,   // no transition: the previous section fades to a ghost instead
  };
})();
runLook(WHITEBOARD);
