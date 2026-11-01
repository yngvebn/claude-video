'use strict';
// Look: incident post-mortem (story-video original; guide: references/styles/postmortem.md). The story told as an
// incident review on a dark monitoring dashboard: a status pill that moves FIRING -> INVESTIGATING -> RESOLVED on the
// narrator's words, live time-series panels whose line advances with the narration (spikes, thresholds), single-stat
// panels, an alert banner, a timeline, streaming logs, a root-cause callout and ticked action items. Each section is one
// dashboard. The narration runs in a transcript bar. Block vocabulary: references/looks/postmortem.md
// Globals owned here: none besides this closure's result (POSTMORTEM).
const POSTMORTEM = (() => {
  const F = { sans: 'SANS', sansB: 'SANSB', mono: 'MONO', monoB: 'MONOB' };
  const TOP = 76, PAD = 22, COLS = 24, ROW = 64, GAP = 12, BOTTOM = 64;
  const COLW = (W - 2 * PAD + GAP) / COLS;
  const col = (C, c, d = 'fg') => C[c || d] || c;
  const tx = (s, x, y, o = {}) => text(s, x, y, { font: o.font || F.sans, size: o.size || 22, color: o.color, align: o.align || 'left', alpha: o.alpha ?? 1, jit: false, maxW: o.maxW || 0 });
  const rect = ([gx, gy, gw, gh]) => ({ x: PAD + gx * COLW, y: TOP + 12 + gy * ROW, w: gw * COLW - GAP, h: gh * ROW - GAP });
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  function vis(b, t) {
    if (t < b.t0) return 0;
    let a = E.out(prog(t, b.t0, b.t0 + .45));
    if (b.tout != null) a *= 1 - prog(t, b.tout, b.tout + .4);
    return a;
  }
  // the dashboard clock: scene `clock` ('14:02') plus `rate` minutes per narration second
  function clockLabel(sec, s) {
    const [h, m] = String(sec.clock || '14:00').split(':').map(Number), mins = h * 60 + m + Math.round(s * (sec.rate || 1));
    return `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
  function panel(b, a, C, titleExtra) {   // panel chrome: surface, border, title
    const R = rect(b.pos), dy = 10 * (1 - a);
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, dy);
    ctx.fillStyle = C.panel; rrect(R.x, R.y, R.w, R.h, 6); ctx.fill();
    ctx.strokeStyle = C.border; ctx.lineWidth = 1.5; ctx.stroke();
    if (b.title) tx(b.title, R.x + 18, R.y + 30, { font: F.sansB, size: 21, color: C.fg });
    if (titleExtra) tx(titleExtra, R.x + R.w - 18, R.y + 30, { font: F.mono, size: 18, color: C.mute, align: 'right' });
    return R;
  }
  const endPanel = () => ctx.restore();

  // value of a series at time s: before its first point `base` (or the first value), then linear or stepped
  function valueAt(sr, s) {
    const P = (sr.points || []).filter(p => p.t0 != null).sort((x, y) => x.t0 - y.t0);
    if (!P.length || s < P[0].t0) return sr.base ?? (P[0] ? P[0].v : 0);
    for (let i = 1; i < P.length; i++) if (s < P[i].t0) return sr.step ? P[i - 1].v : lerp(P[i - 1].v, P[i].v, E.inOut((s - P[i - 1].t0) / Math.max(.01, P[i].t0 - P[i - 1].t0)));
    return P[P.length - 1].v;
  }

  const KIND = {
    // time-series panel: the line advances as the narration does; x spans the section, y is 0..yMax
    graph(b, t, C, a, sec) {
      const R = panel(b, a, C, b.unit || '');
      const x0 = R.x + 64, x1 = R.x + R.w - 20, y0 = R.y + R.h - (b.legend === false ? 40 : 70), y1 = R.y + 54;
      const ymax = b.yMax || Math.max(1, ...b.series.flatMap(sr => [(sr.base ?? 0), ...(sr.points || []).map(p => p.v)])) * 1.25;
      const X = s => x0 + (x1 - x0) * s / sec.d, Y = v => y0 - (y0 - y1) * v / ymax;
      ctx.strokeStyle = C.border; ctx.lineWidth = 1;   // grid and axes
      for (let g = 0; g <= 4; g++) {
        const y = lerp(y0, y1, g / 4); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        tx(String(+(ymax * g / 4).toFixed(ymax < 4 ? 1 : 0)), x0 - 12, y, { font: F.mono, size: 16, color: C.mute, align: 'right' });
      }
      for (let k = 0; k <= 5; k++) tx(clockLabel(sec, sec.d * k / 5), X(sec.d * k / 5), y0 + 22, { font: F.mono, size: 15, color: C.mute, align: 'center' });
      if (b.threshold) {
        ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.globalAlpha *= .8;
        ctx.beginPath(); ctx.moveTo(x0, Y(b.threshold.v)); ctx.lineTo(x1, Y(b.threshold.v)); ctx.stroke(); ctx.restore();
        if (b.threshold.label) tx(b.threshold.label, x1 - 6, Y(b.threshold.v) - 14, { font: F.mono, size: 16, color: C.red, align: 'right' });
      }
      const now = Math.min(t, sec.d);
      b.series.forEach((sr, si) => {
        const c = col(C, sr.color, 'acc'), pts = [];
        for (let s = 0; s <= now; s += .2) pts.push([X(s), Y(valueAt(sr, s))]);
        pts.push([X(now), Y(valueAt(sr, now))]);
        if (pts.length < 2) return;
        const fill = ctx.createLinearGradient(0, y1, 0, y0); fill.addColorStop(0, c + '55'); fill.addColorStop(1, c + '00');
        ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0][0], y0); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(pts[pts.length - 1][0], y0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
        const [hx, hy] = pts[pts.length - 1];   // the live head
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(hx, hy, 5 + 2 * Math.sin(T * 6), 0, TAU); ctx.fill();
        if (b.legend !== false) {
          const lx = R.x + 64 + si * 280, ly = R.y + R.h - 24;
          ctx.fillStyle = c; ctx.fillRect(lx, ly - 3, 22, 5);
          tx(`${sr.name}  ${+valueAt(sr, now).toFixed(1)}`, lx + 32, ly, { font: F.mono, size: 17, color: C.fg });
        }
      });
      endPanel();
    },
    // one big number, coloured by severity; counts up, and can change to `to` at toAt
    stat(b, t, C, a) {
      const R = panel(b, a, C);
      let v = lerp(b.from ?? 0, b.value, E.out(prog(t, b.t0, b.t0 + 1)));
      if (b.to != null && b.tto != null) v = lerp(v, b.to, E.inOut(prog(t, b.tto, b.tto + 1)));
      const changed = b.to != null && b.tto != null && t >= b.tto, c = col(C, changed ? (b.toSev || b.sev) : b.sev, 'fg');
      tx(`${v.toFixed(b.dec || 0)}`, R.x + R.w / 2, R.y + R.h / 2 + 18, { font: F.sansB, size: Math.min(110, R.h * .5), color: c, align: 'center' });
      if (b.unit) tx(b.unit, R.x + R.w / 2, R.y + R.h - 26, { font: F.mono, size: 18, color: C.mute, align: 'center' });
      endPanel();
    },
    // the alert banner: pulsing while firing, green once resolveAt lands
    alert(b, t, C, a) {
      const R = rect(b.pos), res = b.tresolve != null && t >= b.tresolve, c = res ? C.green : C.red, k = res ? 1 : .75 + .25 * Math.sin(T * 5);
      ctx.save(); ctx.globalAlpha *= a;
      ctx.fillStyle = c + '26'; rrect(R.x, R.y, R.w, R.h, 6); ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = c; ctx.fillRect(R.x, R.y, 8, R.h);
      ctx.globalAlpha *= k; ctx.beginPath(); ctx.arc(R.x + 36, R.y + R.h / 2, 9, 0, TAU); ctx.fill(); ctx.globalAlpha /= k;
      tx(res ? 'RESOLVED' : 'FIRING', R.x + 60, R.y + R.h / 2, { font: F.monoB, size: 22, color: c });
      tx(res ? (b.resolvedText || b.text) : b.text, R.x + 200, R.y + R.h / 2, { font: F.mono, size: 21, color: C.fg, maxW: R.w - 230 });
      ctx.restore();
    },
    // events down a line, each on its anchor
    timeline(b, t, C, a) {
      const R = panel(b, a, C), ev = (b.events || []).filter(e => e.t0 != null && t >= e.t0), rowH = 64, max = Math.floor((R.h - 60) / rowH);
      const shown = ev.slice(-max), x = R.x + 36;
      ctx.strokeStyle = C.border; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, R.y + 60); ctx.lineTo(x, R.y + R.h - 20); ctx.stroke();
      shown.forEach((e, i) => {
        const y = R.y + 76 + i * rowH, p = E.out(prog(t, e.t0, e.t0 + .35)), c = col(C, e.sev, 'acc');
        ctx.save(); ctx.globalAlpha *= p;
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill();
        tx(e.time || '', x + 24, y - 12, { font: F.mono, size: 17, color: C.mute });
        tx(e.text, x + 24, y + 14, { font: F.sans, size: 21, color: C.fg, maxW: R.w - 70 });
        ctx.restore();
      });
      endPanel();
    },
    // streaming log lines, newest at the bottom
    logs(b, t, C, a, sec) {
      const R = panel(b, a, C), lines = (b.lines || []).filter(l => l.t0 != null && t >= l.t0), lh = 32, max = Math.floor((R.h - 56) / lh);
      const LV = { ERROR: 'red', WARN: 'yellow', INFO: 'green', DEBUG: 'mute' };
      lines.slice(-max).forEach((l, i) => {
        const y = R.y + 66 + i * lh, p = prog(t, l.t0, l.t0 + .2);
        ctx.save(); ctx.globalAlpha *= p;
        tx(`${clockLabel(sec, l.t0)}:${String(Math.floor((l.t0 * 7) % 60)).padStart(2, '0')}`, R.x + 18, y, { font: F.mono, size: 18, color: C.mute });
        tx((l.level || 'INFO').padEnd(5), R.x + 130, y, { font: F.monoB, size: 18, color: col(C, LV[l.level || 'INFO']) });
        tx(l.text, R.x + 210, y, { font: F.mono, size: 18, color: C.fg, maxW: R.w - 230 });
        ctx.restore();
      });
      endPanel();
    },
    // the root cause (or lesson), in a highlighted card
    callout(b, t, C, a) {
      const R = rect(b.pos), c = col(C, b.color, 'orange');
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, 10 * (1 - a));
      ctx.shadowColor = c + '88'; ctx.shadowBlur = 24; ctx.fillStyle = C.panel; rrect(R.x, R.y, R.w, R.h, 6); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = c; ctx.fillRect(R.x, R.y, 8, R.h);
      tx(b.title || 'ROOT CAUSE', R.x + 30, R.y + 34, { font: F.monoB, size: 19, color: c });
      tx(b.text, R.x + 30, R.y + R.h / 2 + 16, { font: F.sansB, size: b.size || 28, color: C.fg, maxW: R.w - 60 });
      ctx.restore();
    },
    // action items that get ticked on their doneAt anchor
    checklist(b, t, C, a) {
      const R = panel(b, a, C), items = (b.items || []).filter(it => it.t0 == null || t >= it.t0);
      items.forEach((it, i) => {
        const y = R.y + 84 + i * 62, p = it.t0 != null ? E.out(prog(t, it.t0, it.t0 + .35)) : 1, done = it.tdone != null && t >= it.tdone;
        ctx.save(); ctx.globalAlpha *= p;
        ctx.strokeStyle = done ? C.green : C.mute; ctx.lineWidth = 2.5; rrect(R.x + 22, y - 15, 30, 30, 5); ctx.stroke();
        if (done) {
          const q = E.out(prog(t, it.tdone, it.tdone + .3));
          ctx.fillStyle = C.green; ctx.globalAlpha *= q; rrect(R.x + 22, y - 15, 30, 30, 5); ctx.fill(); ctx.globalAlpha /= q;
          ctx.strokeStyle = C.bg; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(R.x + 29, y); ctx.lineTo(R.x + 35, y + 7); ctx.lineTo(R.x + 46, y - 7); ctx.stroke();
        }
        tx(it.text, R.x + 70, y, { font: F.sans, size: 24, color: done ? C.fg : C.mute, maxW: R.w - 90 });
        ctx.restore();
      });
      endPanel();
    },
    status() {},   // drawn in the top bar
  };

  // ---------------------------------------------------------------- chrome: top bar with the status pill, transcript
  function topBar(sec, t, C) {
    ctx.fillStyle = C.bar; ctx.fillRect(0, 0, W, TOP); ctx.fillStyle = C.border; ctx.fillRect(0, TOP - 1, W, 1);
    ctx.fillStyle = C.acc; rrect(PAD, 20, 36, 36, 8); ctx.fill();
    ctx.strokeStyle = C.bar; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(PAD + 8, 46); ctx.lineTo(PAD + 16, 34); ctx.lineTo(PAD + 22, 40); ctx.lineTo(PAD + 30, 28); ctx.stroke();
    tx('Incidents  /', PAD + 56, 38, { font: F.sans, size: 21, color: C.mute });
    tx(sec.title || sec.key, PAD + 184, 38, { font: F.sansB, size: 23, color: C.fg, maxW: 1100 });
    let st = sec.status || { state: 'MONITORING', sev: 'green' }, since = 0;   // the latest status block that has landed
    for (const b of sec.blocks) if (b.kind === 'status' && t >= b.t0) { st = b; since = b.t0; }
    const c = col(C, st.sev, 'mute'), label = st.state, pw = measure(label, F.monoB, 20) + 60, px = W - PAD - pw - 190;
    const pulse = since ? 1 + .12 * (1 - prog(t, since, since + .6)) : 1;
    ctx.save(); ctx.translate(px + pw / 2, 38); ctx.scale(pulse, pulse);
    ctx.fillStyle = c + '2e'; rrect(-pw / 2, -19, pw, 38, 19); ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-pw / 2 + 22, 0, 6, 0, TAU); ctx.fill();
    tx(label, -pw / 2 + 38, 1, { font: F.monoB, size: 20, color: c });
    ctx.restore();
    tx(`${clockLabel(sec, Math.min(t, sec.d))}`, W - PAD - 70, 38, { font: F.mono, size: 20, color: C.fg, align: 'right' });
    ctx.fillStyle = C.red; ctx.globalAlpha = .6 + .4 * Math.sin(T * 4); ctx.beginPath(); ctx.arc(W - PAD - 52, 38, 6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    tx('LIVE', W - PAD - 40, 38, { font: F.monoB, size: 17, color: C.mute });
  }
  function transcript(sec, t, C) {
    if (sec.transcript === false) return;
    ctx.fillStyle = C.bar; ctx.fillRect(0, H - BOTTOM, W, BOTTOM); ctx.fillStyle = C.border; ctx.fillRect(0, H - BOTTOM, W, 1);
    let cur = null;
    for (const s of sec.sentences) for (const p of s.phrases) if (t >= p.t0 - .05) cur = p;
    if (!cur || t > cur.t1 + 1.5) return;
    tx('>', PAD, H - BOTTOM / 2, { font: F.monoB, size: 22, color: C.acc });
    const words = sec.words.filter(w => w.t0 >= cur.t0 - .01 && w.t0 <= cur.t1 + .01 && w.t0 <= t).map(w => w.w).join(' ');
    tx(words + (Math.floor(T * 2) % 2 ? '_' : ''), PAD + 30, H - BOTTOM / 2, { font: F.mono, size: 22, color: C.fg, maxW: W - 2 * PAD - 40 });
  }

  return {
    fallback: () => ({ bg: Object.keys(THEME_STORY.palettes)[0], blocks: [] }),   // an empty dashboard + the transcript
    draw(sec, t) {
      const C = sec.C;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      const enter = sec.i > 0 ? E.out(prog(t, 0, .5)) : 1;   // switching dashboards: the new one slides in a touch
      ctx.save(); ctx.globalAlpha = enter; ctx.translate(40 * (1 - enter), 0);
      for (const b of sec.blocks) {
        const a = vis(b, t); if (a <= 0) continue;
        if (!KIND[b.kind]) throw new Error(`postmortem: unknown block kind "${b.kind}" in section ${sec.key}`);
        if (b.pos || b.kind === 'status') { ctx.save(); KIND[b.kind](b, t, C, a, sec); ctx.restore(); }
      }
      ctx.restore();
      topBar(sec, t, C);
      transcript(sec, t, C);
    },
    hud: false, enter: false,
  };
})();
runLook(POSTMORTEM);
