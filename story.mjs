#!/usr/bin/env node
// story-video: narrated kinetic-typography videos from a script.
//
//   node story.mjs new <project> [--look <l>]    scaffold projects/<project> (kinetic | documentary | whiteboard | cinematic | postmortem | custom)
//   node story.mjs <project> chars               billable characters for the voice engine (budget check)
//   node story.mjs <project> voices ...          ElevenLabs: voices mine | library "query" [--accent ..] | sample <id> ["text"] [--as <name>]
//   node story.mjs <project> sfxgen "<prompt>" --as <name> [--dur s] [--influence 0-1]
//                                                ElevenLabs sound effect -> assets/sfx/<name>.wav (cached by prompt)
//   node story.mjs <project> musicgen            ElevenLabs music from project.json "musicgen", one chunk per group of
//                                                sections, timed by the layout (cached by plan)
//   node story.mjs <project> voice               synthesize the narration (project.json voice.engine; cached)
//   node story.mjs <project> layout              timeline, sfx cues, page — after any script/scenes/timing change
//   node story.mjs <project> audio               sound effects + music + narration mix, then a balance report
//   node story.mjs <project> build               voice + layout + audio
//   node story.mjs <project> stills <t> ...      PNG stills at those seconds -> output/stills
//   node story.mjs <project> qa                  one still per camera frame + contact sheets -> output/qa
//   node story.mjs <project> clip <from> <to>    a window of the video with sound -> output/clip.mp4
//   node story.mjs <project> render [name.mp4]   the full video -> output/
//   node story.mjs <project> remux [name.mp4]    put the current mix on an already rendered video (audio-only changes)
//   node story.mjs <project> measure             balance report for the current mix
//   node story.mjs <project> all                 build + render
// Section times are printed by `layout`. Everything runs from the repo root.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { resolveScene, narration, autoScene, stripMarks, stripTags } = require('./engine/anchors.js');
const BUILT_IN_LOOKS = fs.readdirSync(path.join(ROOT, 'engine', 'looks')).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
const [name, cmd = 'build', ...args] = process.argv.slice(2);

function sh(bin, argv, env = {}) {
  const r = spawnSync(bin, argv, { stdio: 'inherit', env: { ...process.env, ...env }, shell: false });
  if (r.status !== 0) { console.error(`\n${bin} ${argv.slice(0, 3).join(' ')} ... failed (exit ${r.status})`); process.exit(r.status || 1); }
}
const UV = ['run', '--quiet', '--with', 'numpy', '--with', 'scipy', '--with', 'soundfile', '--with', 'pyloudnorm', 'python'];

if (!name || name === 'help' || name === '--help') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 18).join('\n').replace(/^\/\/ ?/gm, '')); process.exit(0); }

if (name === 'new') {
  const dst = path.join('projects', cmd);
  if (!cmd || fs.existsSync(dst)) { console.error(cmd ? `${dst} already exists` : 'usage: node story.mjs new <project> [--look <look>]'); process.exit(1); }
  const li = args.indexOf('--look'), look = li >= 0 ? args[li + 1] : 'kinetic';
  if (look !== 'custom' && !BUILT_IN_LOOKS.includes(look)) { console.error(`unknown look "${look}": ${BUILT_IN_LOOKS.join(', ')}, custom`); process.exit(1); }
  fs.mkdirSync('projects', { recursive: true });   // git-ignored: your projects, or a link to wherever you keep them
  fs.cpSync('template', dst, { recursive: true });
  const kit = path.join('template', 'looks', look);   // a look's starter kit: its theme.js and fonts
  if (fs.existsSync(kit)) fs.cpSync(kit, dst, { recursive: true });
  fs.rmSync(path.join(dst, 'looks'), { recursive: true, force: true });
  const pj = path.join(dst, 'project.json'), c = JSON.parse(fs.readFileSync(pj, 'utf8'));
  fs.writeFileSync(pj, JSON.stringify({ ...c, look }, null, 2) + '\n');
  if (look !== 'kinetic') {   // the template scenes are kinetic blocks; other looks start from their own fallback
    fs.writeFileSync(path.join(dst, 'scenes.js'), `'use strict';\n// What appears on screen, and when. Block vocabulary for the "${look}" look:\n// .claude/skills/story-video/references/looks/${look}.md. Sections without an entry use the look's fallback.\nvar STORY = {};\n\nif (typeof module !== 'undefined') module.exports = { STORY };\n`);
  }
  if (look === 'custom') fs.copyFileSync('template/look.custom.js', path.join(dst, 'look.js'));
  fs.rmSync(path.join(dst, 'look.custom.js'), { force: true });
  console.log(`created ${dst} (look: ${look}) — edit story.js (script), scenes.js (visuals), theme.js (palette, fonts), project.json (voice, music, mix)`);
  process.exit(0);
}

// ---------------------------------------------------------------- project
const P = path.join('projects', name);
if (!fs.existsSync(path.join(P, 'project.json'))) { console.error(`no project at ${P} (node story.mjs new ${name})`); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(path.join(P, 'project.json'), 'utf8'));
const load = f => { const m = path.resolve(P, f); delete require.cache[m]; return require(m); };
// VARIANT=<name>: an alternate cut of the same project (story.js / scenes.js branch on the global VARIANT, '' for the
// main cut). It shares the voice cache; its manifest is kept apart so building one cut never breaks the other.
const VARIANT = process.env.VARIANT || '';
globalThis.VARIANT = VARIANT;
// project.json "variants": { "<name>": { ...top-level keys } } replaces those keys for that cut (e.g. its own musicgen, score)
if (VARIANT && cfg.variants?.[VARIANT]) Object.assign(cfg, cfg.variants[VARIANT]);
const { SECTIONS, SAY = {} } = load('story.js');
for (const s of SECTIONS) s.say ||= [];   // a section without narration: a `hold` (fixed length), e.g. a silent opening
const { STORY } = load('scenes.js');
const BUILD = path.join(P, '.build'), OUT = path.join(P, 'output');
fs.mkdirSync(BUILD, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const engine = process.env.VOICE || cfg.voice.engine;   // VOICE=kokoro (free voice) or VOICE=none (no voice) overrides project.json
const LOOK = cfg.look || 'kinetic';
if (LOOK !== 'custom' && !BUILT_IN_LOOKS.includes(LOOK)) { console.error(`project.json look "${LOOK}" is not a built-in look (${BUILT_IN_LOOKS.join(', ')}) or "custom"`); process.exit(1); }
if (LOOK === 'custom' && !fs.existsSync(path.join(P, 'look.js'))) { console.error(`look "custom" needs ${P}/look.js`); process.exit(1); }
// node-side twin of each look's fallback scene (only blocks matter here: they drive the sound effects)
const fallback = LOOK === 'kinetic' ? autoScene : () => ({ blocks: [], auto: true });
const SILENT = cfg.sfx === false && !(cfg.music && cfg.music.file) && !cfg.score && engine === 'none';
// "render": { "loudness": "linear" }: the mixer normalises with one plain gain, and the mux leaves it alone. For
// scores with big contrast (a quiet minute, then a hit): ffmpeg's one-pass loudnorm would ride the quiet part up.
const LINEAR = cfg.render?.loudness === 'linear';
const CACHE = path.join(P, '.cache', engine), MANIFEST = VARIANT ? `manifest.${VARIANT}.json` : 'manifest.json';
const posix = p => p.split(path.sep).join('/');

const T = { lead: .8, phrase_gap: .24, pause: { '': .38, '//': .85, '///': 1.3 }, outro: .45, final_hold: 3.2, ...(cfg.timing || {}) };

function writeScript() {
  const script = { eleven: cfg.voice.eleven, kokoro: cfg.voice.kokoro, say: SAY, slides: SECTIONS.map(s => ({ key: s.key, sentences: s.say })) };
  fs.writeFileSync(path.join(BUILD, 'script.json'), JSON.stringify(script, null, 1));
}

function chars() {
  let n = 0, tags = 0;
  for (const s of SECTIONS) for (const raw of s.say) {
    const t = stripMarks(raw).split('|').map(p => p.replace('~', '').trim()).join(' ');
    n += t.length; tags += t.length - stripTags(t).length;
  }
  return { n, tags };
}

function voice() {
  writeScript();
  fs.mkdirSync(CACHE, { recursive: true });
  // the engines always write manifest.json: in a variant, keep the main cut's safe and file the variant's apart
  const mainMf = path.join(CACHE, 'manifest.json'), mainKept = VARIANT && fs.existsSync(mainMf) ? fs.readFileSync(mainMf) : null;
  if (engine === 'eleven') {
    const { n } = chars(); console.log(`ElevenLabs: ${n} characters for a full read (cached sentences are free)`);
    sh('uv', [...UV, 'tools/eleven.py', path.join(BUILD, 'script.json'), CACHE]);
  } else if (engine === 'kokoro') {
    for (const f of ['kokoro-v1.0.onnx', 'voices-v1.0.bin']) {
      const dst = path.join('tools', 'models', f);
      if (!fs.existsSync(dst)) {
        console.log(`downloading Kokoro model file ${f} (one time)`);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        sh('curl', ['-fL', '-o', dst, `https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/${f}`]);
      }
    }
    sh('uv', ['run', '--quiet', '--python', '3.12', '--with', 'kokoro-onnx', '--with', 'soundfile', 'python', 'tools/speak.py', path.join(BUILD, 'script.json'), CACHE]);
  } else if (engine === 'none') {
    // no narration: estimate each phrase at a narrator's pace (14.5 characters/s, ElevenLabs George, measured on a 5-minute script),
    // '~' phrases 10% slower. Anchors, layout and render work unchanged; there is simply nothing to hear.
    const manifest = SECTIONS.map(s => ({ key: s.key, sentences: s.say.map(raw => stripMarks(raw).split('|').map(part => {
      const txt = stripTags(part.replace('~', '')).trim(), slow = part.trim().startsWith('~');
      return { dur: +Math.max(.35, txt.length / 14.5 / (slow ? .9 : 1) + .15).toFixed(3) };
    })) }));
    fs.writeFileSync(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest));
    const secs = manifest.reduce((a, s) => a + s.sentences.flat().reduce((x, p) => x + p.dur, 0), 0);
    console.log(`no voice: ${secs.toFixed(1)} s of estimated speech (timing only, nothing to hear)`);
  } else { console.error(`unknown voice.engine "${engine}" (eleven | kokoro | none)`); process.exit(1); }
  if (VARIANT) { fs.renameSync(mainMf, path.join(CACHE, MANIFEST)); if (mainKept) fs.writeFileSync(mainMf, mainKept); }
}

function layout() {
  const mf = path.join(CACHE, MANIFEST);
  if (!fs.existsSync(mf)) { console.error(`no narration yet for ${engine}: node story.mjs ${name} voice`); process.exit(1); }
  const manifest = JSON.parse(fs.readFileSync(mf, 'utf8'));
  const slides = {}, placement = [];
  let clock = 0;
  SECTIONS.forEach(sec => {
    const m = manifest.find(x => x.key === sec.key);
    if (!m || m.sentences.length !== sec.say.length) { console.error(`${engine} narration is out of date for "${sec.key}": node story.mjs ${name} voice`); process.exit(1); }
    const a = clock, ph = [];
    let t = a + (sec.lead ?? T.lead), lastPause = 0;   // a section can set its own lead-in, e.g. to land a line on a downbeat
    sec.say.forEach((raw, i) => {
      ph.push([]);
      const want = stripMarks(raw).split('|').length;
      if (m.sentences[i].length !== want) { console.error(`${sec.key} sentence ${i}: ${m.sentences[i].length} phrases in the narration, ${want} in the script: re-run voice`); process.exit(1); }
      m.sentences[i].forEach((p, j) => {
        if (j && !m.sentences[i][j - 1].join) t += T.phrase_gap;   // join: the narrator read straight through this beat
        if (p.wav) placement.push([+t.toFixed(3), p.wav.includes('/') ? p.wav : posix(path.join(CACHE, p.wav))]);   // none: no audio
        ph[i].push(p.chars ? [+(t - a).toFixed(3), p.dur, p.chars] : [+(t - a).toFixed(3), p.dur]);
        t += p.dur;
      });
      lastPause = T.pause[(raw.match(/\/+\s*$/) || [''])[0].trim()] ?? T.pause[''];
      t += lastPause;
    });
    const speechEnd = t - lastPause;
    const b = sec.hold != null ? a + sec.hold   // hold: a fixed length, narrated or not
      : sec.keep ? speechEnd + T.final_hold : speechEnd + Math.max(lastPause, .6) + T.outro;
    if (sec.hold != null && speechEnd > b) { console.error(`${sec.key}: the narration runs ${(speechEnd - a).toFixed(1)} s, past its hold of ${sec.hold} s`); process.exit(1); }
    slides[sec.key] = { a: +a.toFixed(3), b: +b.toFixed(3), ph };
    clock = b;
  });
  const dur = Math.ceil(clock * 10) / 10;

  // sound effects follow the scenes: a block's own `sfx` (effect name, or false), else hits on slams and stamps and pops
  // on pops; project.json "sfx": { "section": <effect>, "end": <effect> } overrides the defaults, "sfx": false turns them off
  const cues = [], sfxCfg = cfg.sfx === false ? null : { section: 'whoosh', end: 'chime', ...(cfg.sfx || {}) };
  SECTIONS.forEach((sec, i) => {
    const tl = slides[sec.key], sc = resolveScene(STORY, sec.key, sec.say, tl, fallback);   // throws on an anchor that isn't in the narration
    if (sfxCfg && i && sfxCfg.section) cues.push([+(tl.a + .02).toFixed(3), sfxCfg.section, .22]);
    if (sfxCfg) for (const b of sc.blocks) {
      if (b.sfx === false) continue;
      if (b.sfx) {   // a block's own sounds: sfx.py names or project .wav files (one, or a list), each peaking on the block
        for (const s of [].concat(b.sfx)) cues.push([+(tl.a + b.t0).toFixed(3), /\.wav$/i.test(s) ? posix(path.resolve(P, s)) : s, b.sfxGain ?? .4]);
        continue;
      }
      const fx = { slam: ['thud', .45], stamp: ['thud', .7], pop: ['pop', .22] }[b.in];
      if (fx) cues.push([+(tl.a + b.t0 + (b.in === 'pop' ? 0 : .3)).toFixed(3), fx[0], fx[1]]);
    }
    if (sc.auto) console.log(`  note: "${sec.key}" has no scene in scenes.js yet (${LOOK} fallback)`);
  });
  if (sfxCfg && sfxCfg.end) cues.push([+(dur - 2.2).toFixed(2), sfxCfg.end, .4]);

  fs.writeFileSync(path.join(BUILD, 'timeline.js'), `'use strict';\n// generated by story.mjs layout; do not edit\nvar TIMELINE = ${JSON.stringify({ dur, slides })};\nvar VARIANT = ${JSON.stringify(VARIANT)};\nwindow.VIDEO.dur = TIMELINE.dur;\n`);
  fs.writeFileSync(path.join(BUILD, 'placement.json'), JSON.stringify({ dur, clips: placement }));
  const silence = posix(path.join(BUILD, 'silence.wav'));
  sh('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', String(dur + 1), silence]);
  fs.writeFileSync(path.join(BUILD, 'audio.json'), JSON.stringify({ dur, bpm: 84, key: 'D', mode: 'major', chords: ['I', 'V', 'vi', 'IV'], sections: [[0, dur, .3]], song: { path: silence, gain: 0 }, cues }));
  const v = { w: 1920, h: 1080, fps: 30, ...(cfg.video || {}) }, base = `/${posix(P)}/`;
  fs.writeFileSync(path.join(BUILD, 'index.html'), `<!doctype html>
<meta charset="utf-8">
<title>${cfg.title || name}</title>
<style>html, body { margin: 0; background: #000; } canvas { display: block; width: 100vw; height: auto; }</style>
<canvas id="c"></canvas>
<script type="importmap">{ "imports": { "three": "/node_modules/three/build/three.module.js", "three/addons/": "/node_modules/three/examples/jsm/" } }</script>
<script>window.VIDEO = { w: ${v.w}, h: ${v.h}, fps: ${v.fps}, dur: 60 }; window.PROJECT_BASE = '${base}'; window.PROJECT = ${JSON.stringify({ name, title: cfg.title || name, source: cfg.source || '' })};</script>
<script src="${base}.build/timeline.js"></script>
<script src="/node_modules/roughjs/bundled/rough.js"></script>
<script src="/engine/kit.js"></script>
<script src="/engine/minis-ai.js"></script>
<script src="/engine/anchors.js"></script>
<script src="${base}story.js"></script>
<script src="${base}scenes.js"></script>
<script src="${base}theme.js"></script>
<script src="/engine/runtime.js"></script>
<script src="${LOOK === 'custom' ? `${base}look.js` : `/engine/looks/${LOOK}.js`}"></script>
`);
  for (const [k, s] of Object.entries(slides)) console.log(`  ${k.padEnd(12)} ${s.a.toFixed(1).padStart(6)} → ${s.b.toFixed(1).padStart(6)}  (${(s.b - s.a).toFixed(1)} s)`);
  if (VARIANT) console.log(`  variant: ${VARIANT}`);
  console.log(`  total ${dur} s (${Math.floor(dur / 60)}:${String(Math.round(dur % 60)).padStart(2, '0')}), ${cues.length} sound effects, voice: ${engine}, look: ${LOOK}`);
  return { dur, slides };
}

function audio() {
  const fx = path.join(BUILD, 'fx.wav'), mixOut = path.join(BUILD, 'audio.wav');
  if (SILENT) {   // no voice, no music, no effects: render without an audio track
    fs.rmSync(mixOut, { force: true });
    console.log('silent project (voice none, no music, sfx false): no audio track');
    return;
  }
  sh('uv', [...UV, 'tools/sfx.py', path.join(BUILD, 'audio.json'), fx]);
  let music = cfg.music && cfg.music.file ? path.join(P, cfg.music.file) : null;
  if (cfg.score) {   // a music-led score built from parts (tools/score.py); it replaces music.file
    const tl = eval(fs.readFileSync(path.join(BUILD, 'timeline.js'), 'utf8').replace(/window\.VIDEO.*$/m, '').replace("'use strict';", '') + ';TIMELINE');
    const at = v => typeof v === 'number' ? v : v === 'end' ? tl.dur : typeof v === 'string' ? sectionAt(v)
      : sectionAt(v.section) + (v.dt || 0);
    const sectionAt = k => { if (!tl.slides[k]) { console.error(`score: no section "${k}"`); process.exit(1); } return tl.slides[k].a; };
    const abs = f => posix(path.resolve(P, f));
    const sc = cfg.score, spec = sc.bed   // a finished track (bed) with drop-outs, or a drone stretched into a drop
      ? { ...sc, bed: Array.isArray(sc.bed) ? sc.bed.map(s => ({ ...s, file: abs(s.file), from: at(s.from) })) : abs(sc.bed),
          len: at(sc.len ?? 'end'), duck: (sc.duck || []).map(d => ({ ...d, from: at(d.from), to: at(d.to) })) }
      : { ...sc, drone: abs(sc.drone), drop: abs(sc.drop), hit: at(sc.hit), len: at(sc.len ?? 'end') };
    spec.fx = (sc.fx || []).map(f => ({ ...f, file: abs(f.file), at: at(f.at) }));
    fs.writeFileSync(path.join(BUILD, 'score.json'), JSON.stringify(spec, null, 1));
    music = path.join(BUILD, 'score.wav');
    sh('uv', [...UV, 'tools/score.py', path.join(BUILD, 'score.json'), music]);
  }
  if (music && !fs.existsSync(music)) { console.error(`music file missing: ${music}`); process.exit(1); }
  const env = { MUSIC_LU: String(cfg.mix?.music_lu ?? -7), DUCK_DB: String(cfg.mix?.duck_db ?? 12), FX_LU: String(cfg.mix?.fx_lu ?? -13.5),
    LOUDNESS: LINEAR ? 'linear' : '', VOICE_CREST: String(cfg.mix?.voice_crest_db ?? ''),
    MUSIC_CREST: String(cfg.mix?.music_crest_db ?? ''), MASTER_LIMIT: cfg.render?.limit ? '1' : '' };
  sh('uv', [...UV, 'tools/mix.py', fx, path.join(BUILD, 'placement.json'), mixOut, ...(music ? [music] : [])], env);
  if (engine !== 'none') sh('uv', [...UV, 'tools/measure.py', mixOut, path.join(BUILD, 'placement.json')], { MUSIC_MIN_LU: String(cfg.mix?.music_min_lu ?? 18) });
}

const page = posix(path.join(P, '.build', 'index.html'));
const render = (out, env = {}) => sh('node', ['engine/render.mjs', page, 'video', out, path.join(BUILD, 'audio.wav')], { CRF: String(cfg.render?.crf ?? 25), LOUDNORM: LINEAR ? '0' : '1', ...env });
const stills = (dir, times) => sh('node', ['engine/render.mjs', page, 'stills', dir, ...times.map(String)]);

function qa() {
  const tl = eval(fs.readFileSync(path.join(BUILD, 'timeline.js'), 'utf8').replace(/window\.VIDEO.*$/m, '').replace("'use strict';", '') + ';TIMELINE');
  const times = [];
  for (const sec of SECTIONS) {
    const s = tl.slides[sec.key], sc = resolveScene(STORY, sec.key, sec.say, s, fallback);
    if (sc.frames.length) sc.frames.forEach((f, i) => times.push(+(s.a + (i + 1 < sc.frames.length ? sc.frames[i + 1].t0 - .7 : sc.d - .6)).toFixed(2)));
    else for (const x of narration(sec.say, s.ph).sentences) times.push(+(s.a + Math.min(sc.d - .3, x.t1 + .3)).toFixed(2));   // camera-less: each sentence's end
  }
  const dir = path.join(OUT, 'qa');
  fs.rmSync(dir, { recursive: true, force: true });
  stills(path.join(dir, 'frames'), times);
  sh('uv', ['run', '--quiet', '--with', 'pillow', 'python', 'tools/contact_sheet.py', path.join(dir, 'frames'), dir]);
  console.log(`${times.length} stills (each camera frame before it moves on, or each sentence's end) -> ${dir}/sheet*.png`);
}

const cmds = {
  chars: () => { const { n, tags } = chars(); console.log(`${n} characters per full read (${tags} of them tone tags)`); },
  voice, layout, audio,
  build: () => { voice(); layout(); audio(); },
  stills: () => stills(path.join(OUT, 'stills'), args),
  qa,
  clip: () => render(path.join(OUT, args[2] || 'clip.mp4'), { FROM: args[0], TO: args[1] }),
  render: () => { const out = path.join(OUT, args[0] || `${name}.mp4`); render(out); console.log(`-> ${out}`); },
  remux: () => {   // audio-only change (music, balance, sfx): no need to re-render 20 minutes of frames
    const out = path.join(OUT, args[0] || `${name}.mp4`), tmp = out.replace(/\.mp4$/, '.remux.mp4');
    sh('ffmpeg', ['-v', 'error', '-y', '-i', out, '-i', path.join(BUILD, 'audio.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
      ...(LINEAR ? [] : ['-af', 'loudnorm=I=-14:TP=-1.5:LRA=11']), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', tmp]);
    fs.renameSync(tmp, out); console.log(`-> ${out} (new audio, same frames)`);
  },
  musicgen: () => {   // a score composed to the cut: each chunk lasts exactly as long as the sections it covers
    const mg = cfg.musicgen;
    if (!mg) { console.error('project.json has no "musicgen" (model, chunks: [{ sections, text, styles, avoid }])'); process.exit(1); }
    const tf = path.join(BUILD, 'timeline.js');
    if (!fs.existsSync(tf)) { console.error(`run layout first: node story.mjs ${name} layout`); process.exit(1); }
    const tl = eval(fs.readFileSync(tf, 'utf8').replace(/window\.VIDEO.*$/m, '').replace(/^var VARIANT.*$/m, '').replace("'use strict';", '') + ';TIMELINE');
    const covered = new Set(), chunks = mg.chunks.map((c, i) => {
      const secs = c.sections.map(k => { if (!tl.slides[k]) { console.error(`musicgen chunk ${i}: no section "${k}"`); process.exit(1); } covered.add(k); return tl.slides[k]; });
      const ms = Math.round(secs.reduce((n, s) => n + (s.b - s.a), 0) * 1000) + (c.extra_ms || 0);
      return { text: c.text, duration_ms: ms, positive_styles: [...(mg.styles || []), ...(c.styles || [])],
        negative_styles: [...(mg.avoid || []), ...(c.avoid || [])], context_adherence: c.adherence || 'high' };
    });
    const short = chunks.findIndex(c => c.duration_ms < 3000);   // the API's minimum chunk length
    if (short >= 0) { console.error(`musicgen chunk ${short} (${chunks[short].text}) is ${chunks[short].duration_ms} ms: chunks must be at least 3000 ms, so merge it with a neighbouring section`); process.exit(1); }
    const missing = SECTIONS.map(s => s.key).filter(k => !covered.has(k) && !(mg.skip || []).includes(k));   // skip: scored elsewhere
    if (missing.length) { console.error(`musicgen: sections without music: ${missing.join(', ')} (the chunks must cover the whole cut, in order)`); process.exit(1); }
    for (const c of chunks) console.log(`  ${(c.duration_ms / 1000).toFixed(2).padStart(6)} s  ${c.text}`);
    const plan = path.join(BUILD, 'musicgen.json');
    fs.writeFileSync(plan, JSON.stringify({ model_id: mg.model || 'music_v2_5', seed: mg.seed ?? null, chunks }, null, 1));
    sh('uv', ['run', '--quiet', 'python', 'tools/eleven_music.py', plan, path.join(P, mg.out || 'assets/music/generated.mp3'), path.join(P, '.cache', 'music')]);
  },
  sfxgen: () => {   // a generated sound effect for the project, e.g. a trailer impact; paid, so cached in .cache/sfx
    const ai = args.indexOf('--as'), as = ai >= 0 ? args[ai + 1] : null, [prompt] = args;
    if (!prompt || prompt.startsWith('--') || !as) { console.error('usage: sfxgen "<prompt>" --as <name> [--dur s] [--influence 0-1]'); process.exit(1); }
    const extra = ['--dur', '--influence'].flatMap(k => args.includes(k) ? [k, args[args.indexOf(k) + 1]] : []);
    sh('uv', ['run', '--quiet', 'python', 'tools/eleven_sfx.py', prompt, path.join(P, 'assets', 'sfx', `${as}.wav`), path.join(P, '.cache', 'sfx'), ...extra]);
  },
  voices: () => {   // pick a voice: list yours, search the library, render one short sample into output/voice-samples/
    const [sub, ...rest] = args;
    if (sub === 'sample') {
      // a sample uses the narration's model and voice settings, so it sounds like the real read; --as names the file
      const ai = rest.indexOf('--as'), as = ai >= 0 ? rest.splice(ai, 2)[1] : null;
      const [vid, text = 'Hei folks. Case file: August thirty-first. I saw one scary word, and panicked. Humbling.'] = rest;
      const dir = path.join(OUT, 'voice-samples'); fs.mkdirSync(dir, { recursive: true });
      const e = cfg.voice.eleven || {}, vs = Object.fromEntries(['stability', 'similarity_boost', 'style', 'speed'].filter(k => k in e).map(k => [k, e[k]]));
      let out = path.join(dir, `${as || vid}.mp3`);
      for (let n = 2; !as && fs.existsSync(out); n++) out = path.join(dir, `${vid}-${n}.mp3`);   // never overwrite a sample
      console.log(`model ${e.model || 'eleven_v4'}, settings ${JSON.stringify(vs)}`);
      sh('uv', ['run', '--quiet', 'python', 'tools/voices.py', 'sample', vid, text, out, '--model', e.model || 'eleven_v4', '--settings', JSON.stringify(vs)]);
    } else sh('uv', ['run', '--quiet', 'python', 'tools/voices.py', sub || 'mine', ...rest]);
  },
  measure: () => sh('uv', [...UV, 'tools/measure.py', path.join(BUILD, 'audio.wav'), path.join(BUILD, 'placement.json')]),
  all: () => { voice(); layout(); audio(); const out = path.join(OUT, `${name}.mp4`); render(out); console.log(`-> ${out}`); },
};
if (!cmds[cmd]) { console.error(`unknown command "${cmd}". Commands: ${Object.keys(cmds).join(', ')}`); process.exit(1); }
cmds[cmd]();
