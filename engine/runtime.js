'use strict';
// Narrated runtime: everything a look needs that isn't the look itself. Loaded after kit.js, minis-ai.js, anchors.js
// and the project's files (story.js, scenes.js, theme.js), before the look (engine/looks/<name>.js or the project's
// look.js). A look calls runLook({ draw, ... }) once. Authoring guide: .claude/skills/story-video/references/looks.md
//
// Globals owned here: PAL, SEC, WIPES, runLook, cameraOf, activeSentence, wordsSpoken, defaultHud, defaultEnter.
const PAL = THEME_STORY.palettes;
const WIPES = ['right', 'down', 'left', 'up'];
let SEC = [];

// ---------------------------------------------------------------- narration helpers for looks
// the sentence being spoken at t (or the last one started); null before the first
function activeSentence(sec, t) {
  let s = null;
  for (const x of sec.sentences) if (t >= x.t0 - .05) s = x;
  return s;
}
// the words already spoken at t, in order
const wordsSpoken = (sec, t) => sec.words.filter(w => w.t0 <= t);

// ---------------------------------------------------------------- camera: fly between frames, rotating so the target lands upright
function cameraOf(sc, t) {
  const F = sc.frames;
  if (!F.length) return { x: W / 2, y: H / 2, z: 1, r: 0, fly: 0 };
  let i = 0;
  while (i + 1 < F.length && t >= F[i + 1].t0 - .55) i++;
  const cur = F[i], prev = F[Math.max(0, i - 1)];
  const k = i ? E.inOut(prog(t, cur.t0 - .55, cur.t0 + .1)) : 1;
  const dip = 1 - .14 * Math.sin(Math.PI * k) * (i ? 1 : 0);          // pull back mid-flight
  const drift = 1 + .012 * clamp((t - cur.t0) / 6);                    // slow push-in while holding
  return {
    x: lerp(prev.x, cur.x, k), y: lerp(prev.y, cur.y, k), z: lerp(prev.z || 1, cur.z || 1, k) * dip * drift,
    r: -lerp(prev.r || 0, cur.r || 0, k) + .004 * Math.sin(t * .45), fly: i ? Math.sin(Math.PI * k) : 0,
  };
}

// ---------------------------------------------------------------- defaults a look may replace
// section header top-left (the scene's kicker) and progress dots, one per section
function defaultHud(sc, t) {
  const C = sc.C, a = prog(t, .3, .9);
  if (sc.kicker) {
    text(sc.kicker, 72, 70, { font: 'MONOB', size: 26, color: C.acc, align: 'left', alpha: a, jit: false });
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.acc; ctx.fillRect(72, 92, 60 * a, 3); ctx.restore();
  }
  if (THEME_STORY.dots === false) return;
  const n = SEC.length, gap = 26, x0 = W / 2 - (n - 1) * gap / 2;
  for (let i = 0; i < n; i++) {
    ctx.save(); ctx.globalAlpha = .9; ctx.fillStyle = i === sc.i ? C.acc : mixHex(C.bg, C.mute, .5);
    ctx.beginPath(); ctx.arc(x0 + i * gap, H - 48, i === sc.i ? 7 : 5, 0, TAU); ctx.fill(); ctx.restore();
  }
}
// section entry: the previous section's colour retracts off screen
function defaultEnter(sc, prev, t) {
  const q = prog(t, 0, .5);
  if (q < 1) { wipe(1 - q, prev.C.bg, WIPES[sc.i % 4]); speedLines((1 - q) * .8, prev.C.mute); }
}

// ---------------------------------------------------------------- the look contract
// look = {
//   draw(sec, t)             required: one whole frame of section `sec` at t seconds into it
//   fallback(say)            scene for a section without a STORY entry (default: kinetic's word-by-word autoScene)
//   init(SEC)                once, after sections are resolved (precompute layouts)
//   setup()                  async, after fonts load (offscreen canvases, textures)
//   hud(sec, t) | false      overlay after draw (default: kicker + progress dots)
//   enter(sec, prev, t)|false transition drawn over the start of each section after the first (default: colour wipe)
// }
// Each section in SEC: the resolved scene (bg, kicker, frames, blocks with t0/t1/tout/...) plus
//   key, i, a, b (absolute start/end), d (length), C (palette), words, sentences (engine/anchors.js narration()).
function runLook(look) {
  for (const s of SECTIONS) s.say ||= [];   // `hold` sections may have no narration
  SEC = SECTIONS.map((s, i) => {
    const tl = TIMELINE.slides[s.key], sc = resolveScene(STORY, s.key, s.say, tl, look.fallback || autoScene);
    if (!PAL[sc.bg]) throw new Error(`section ${s.key}: background "${sc.bg}" is not a palette in theme.js`);
    const n = narration(s.say, tl.ph);
    return { ...sc, key: s.key, i, a: tl.a, b: tl.b, C: PAL[sc.bg], words: n.words, sentences: n.sentences };
  });
  if (look.init) look.init(SEC);
  const hud = look.hud === false ? null : look.hud || defaultHud, enter = look.enter === false ? null : look.enter || defaultEnter;
  Object.assign(THEME, { paper: PAL[Object.keys(PAL)[0]].bg, dark: PAL[Object.keys(PAL)[0]].fg });
  boot({
    scenes: SEC.map(sec => [sec.a, sec.b, t => {
      look.draw(sec, t);
      if (hud) hud(sec, t);
      if (enter && sec.i > 0) enter(sec, SEC[sec.i - 1], t);
    }]),
    setup: async () => {
      // theme.js fonts: { family: file in assets/fonts }; the legacy keys D / M / MB load as DISP / MONO / MONOB
      const legacy = { D: 'DISP', M: 'MONO', MB: 'MONOB' }, base = window.PROJECT_BASE + 'assets/fonts/';
      await useFonts(Object.entries(THEME_STORY.fonts || {}).map(([k, f]) => [legacy[k] || k, base + f]));
      for (const [k, p] of Object.entries(PAL)) BG[k] = makeBG(p.bg, 4, p.fiber || mixHex(p.bg, p.fg, .5), p.vignette || 'rgba(0,0,0,.25)');
      if (look.setup) await look.setup();
    },
    // theme.js images: { key: file in assets/ } (decoded before rendering, drawn via IMG[key]);
    // clips: { id: { n, fps } } for JPEG frame sequences in assets/clips/<id>/0001.jpg..., loaded on demand
    images: Object.fromEntries(Object.entries(THEME_STORY.images || {}).map(([k, f]) => [k, window.PROJECT_BASE + 'assets/' + f])),
    clips: THEME_STORY.clips || {},
    noise: 4,
  });
}
