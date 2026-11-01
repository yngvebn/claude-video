'use strict';
// Word anchors: turn "fire when the narrator says 'grocery receipt'" into seconds. Shared by the browser runtime
// (engine/runtime.js, every look) and the CLI (story.mjs, for sound-effect cues), so picture and sound agree on every hit.
//
// Anchor forms used in a project's scenes.js (`at`, `out`, any `*At` field, receipt row anchors):
//   'words'                      when the narrator starts saying them (whole words, searched forward in order)
//   { w: 'words', dt: 0.3 }      shifted by dt seconds
//   { w: 'words', end: true }    when the narrator finishes them
//   12.5                         seconds into the section
//   'end'                        the section's last moment

function normText(s) { return s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9æøåéô]+/g, ' ').trim(); }
const stripMarks = s => s.replace(/\s*\/+\s*$/, '');
// tone tags for the voice engine, e.g. "[deadpan] Humbling." — never spoken by Kokoro, never shown, never anchored
const stripTags = s => s.replace(/\[[^\]]*\]\s*/g, '');
// one phrase as spoken and shown: no tags, no slow mark
const phraseText = part => stripTags(part.replace('~', '')).trim();

// Time of character k of a phrase. ElevenLabs phrases carry exact per-character start times (ph[si][pj][2]);
// Kokoro and the `none` engine are estimated linearly across the phrase.
function phraseClock(st, du, chars, txt) {
  const exact = chars && chars.length === txt.length;
  return k => exact ? st + chars[k] : st + .04 + (k / Math.max(1, txt.length - 1)) * Math.max(.1, du - .18);
}

// Character-level clock for one section: every spoken character gets a time, over normalised text.
// The normalisation mirrors normText() exactly, so anchors match whichever engine timed the phrase.
function speechClock(say, ph) {
  let S = ''; const T = [];
  say.forEach((raw, si) => stripMarks(raw).split('|').forEach((part, pj) => {
    const txt = phraseText(part), low = txt.toLowerCase(), [st, du, chars] = ph[si][pj];
    const at = phraseClock(st, du, chars, txt);
    let gap = S.length > 0;
    for (let k = 0; k < low.length; k++) {
      const ch = low[k];
      if (ch === "'" || ch === '’') continue;
      if (/[a-z0-9æøåéô]/.test(ch)) { if (gap) { S += ' '; T.push(at(k)); gap = false; } S += ch; T.push(at(k)); }
      else if (S.length) gap = true;
    }
    gap = true;
  }));
  return { S, T };
}

// The narration as a look can use it directly (captions, word-by-word writing): display words with their times,
// and sentences with their phrases. words: [{ w, t0, t1, si, pj }], sentences: [{ si, t0, t1, text, phrases }].
function narration(say, ph) {
  const words = [], sentences = [];
  say.forEach((raw, si) => {
    const phrases = [];
    stripMarks(raw).split('|').forEach((part, pj) => {
      const txt = phraseText(part), [st, du, chars] = ph[si][pj], at = phraseClock(st, du, chars, txt);
      for (const m of txt.matchAll(/\S+/g)) words.push({ w: m[0], t0: at(m.index), t1: at(m.index + m[0].length - 1) + .06, si, pj });
      phrases.push({ t0: st, t1: st + du, text: txt });
    });
    sentences.push({ si, t0: phrases[0].t0, t1: phrases[phrases.length - 1].t1, text: phrases.map(p => p.text).join(' '), phrases });
  });
  return { words, sentences };
}

// Kinetic's fallback for a section without a hand-built scene: one frame per sentence, each phrase revealed word by word.
// Good enough to preview timing; replace with a real scene before the final render.
function autoScene(say) {
  const frames = [], blocks = [];
  say.forEach((raw, si) => {
    const parts = stripMarks(raw).split('|').map(phraseText);
    frames.push({ at: normText(parts[0]).split(' ').slice(0, 3).join(' '), x: 960 + si * 2100, y: 540 + (si % 2 ? 180 : -180), r: si % 2 ? .03 : -.03, z: 1 });
    parts.forEach((p, j) => blocks.push({ f: si, at: p, txt: p.toUpperCase(), size: j ? 90 : 120, y: (j - (parts.length - 1) / 2) * 150, in: 'words', col: j ? 'fg' : 'acc' }));
  });
  return { bg: 'dark', kicker: '', frames, blocks, auto: true };
}

// story: the project's STORY object; say: the section's sentences; tl: its timeline entry { a, b, ph };
// fallback(say): the scene to use when STORY has none (each look has its own; kinetic's is autoScene).
// frames and blocks are both optional: camera-less looks have no frames, caption-only sections no blocks.
function resolveScene(story, key, say, tl, fallback = autoScene) {
  const sc = story[key] || fallback(say), clk = speechClock(say, tl.ph), d = tl.b - tl.a;
  const at = (q, from) => {   // whole-word search: 'me' must not match inside "someone"
    for (let i = clk.S.indexOf(q, from); i >= 0; i = clk.S.indexOf(q, i + 1))
      if ((i === 0 || clk.S[i - 1] === ' ') && (i + q.length === clk.S.length || clk.S[i + q.length] === ' ')) return i;
    return -1;
  };
  const finder = () => {
    let cursor = 0;   // frames and blocks are each authored in narration order, so each search only moves forward
    return (a, advance) => {
      if (a == null) return null;
      if (typeof a === 'number') return { t0: a, t1: a };
      if (a === 'end') return { t0: d, t1: d };
      const w = typeof a === 'string' ? a : a.w, dt = (typeof a === 'object' && a.dt) || 0, q = normText(w);
      const i = at(q, cursor);
      if (i < 0) throw new Error(`scene ${key}: "${w}" not found in the narration after the previous anchor`);
      if (advance) cursor = i;
      const t0 = clk.T[i] + dt, t1 = clk.T[i + q.length - 1] + dt;
      return typeof a === 'object' && a.end ? { t0: t1, t1 } : { t0, t1 };
    };
  };
  const ff = finder(), fb = finder();
  const frames = (sc.frames || []).map(fr => { const r = ff(fr.at, true); return { ...fr, t0: r.t0 }; });
  const blocks = (sc.blocks || []).map(b => {
    const r = fb(b.at, true), o = { ...b, t0: r.t0, t1: r.t1 };
    if (b.out) o.tout = fb(b.out, false).t0;
    for (const k of Object.keys(b)) if (k.endsWith('At')) o['t' + k.slice(0, -2)] = fb(b[k], false).t0;   // litAt -> tlit, ...
    if (b.rows && Array.isArray(b.rows[0])) o.rowT = b.rows.map(r => [fb(r[2], false).t0, fb(r[3], false).t0]);   // kinetic receipt rows
    // any array of objects on a block (card rows, graph points, timeline events, log lines, items): each object's `at`
    // and *At fields resolve too, `at` -> t0, xAt -> tx. Searched from the block's anchor, in the order written.
    // nested too: a graph's series[].points[] resolve the same way
    const objArr = v => Array.isArray(v) && v.length && typeof v[0] === 'object' && v[0] !== null && !Array.isArray(v[0]);
    const deep = r => {
      const q = { ...r };
      for (const [k, v] of Object.entries(r)) {
        if (k === 'at' || k.endsWith('At')) q[k === 'at' ? 't0' : 't' + k.slice(0, -2)] = fb(v, false).t0;
        else if (objArr(v)) q[k] = v.map(deep);
      }
      return q;
    };
    for (const [key, arr] of Object.entries(b)) if (objArr(arr)) o[key] = arr.map(deep);
    return o;
  });
  return { ...sc, frames, blocks, d };
}

if (typeof module !== 'undefined') module.exports = { resolveScene, speechClock, narration, autoScene, normText, stripMarks, stripTags, phraseText };
