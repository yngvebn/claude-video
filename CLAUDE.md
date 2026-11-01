# story-video

Narrated videos from source material: a script is read by a TTS voice, every on-screen beat is anchored to the moment
the narrator says it, the picture comes from a pluggable **look** (kinetic typography, documentary case file, whiteboard
lecture, cinematic film essay, incident post-mortem, or a custom look written from one of 42 style guides), and the whole thing renders to an MP4 with a measured
music/voice mix.
The workflow for making a new video lives in the skill: `.claude/skills/story-video/SKILL.md`. Read it before starting one.

## Stack
- `story.mjs`: the only entry point, and it runs everything from the repo root. `node story.mjs help` lists commands.
- Browser renderer:
  - `engine/kit.js`: canvas helpers, camera, `boot()`.
  - `engine/anchors.js`: word → time, plus `narration()` word and sentence timings; shared with node.
  - `engine/runtime.js`: sections, fonts, backgrounds, camera, default HUD and wipe; looks call `runLook()`.
  - `engine/looks/<name>.js`: the built-in looks `kinetic`, `documentary`, `whiteboard`, `cinematic` and `postmortem`.
    A project can bring its own `look.js`.
  - `engine/render.mjs`: headless Chrome via playwright-core → PNG frames → ffmpeg H.264, with 4 pages rendering in parallel.
  - `engine/city3d.js`: a 3D night city (three.js, WebGL) for the cinematic `reentry` preset. It's an ES module that
    the look loads with `import()`; the generated page has an import map for `three` and `three/addons/` (served
    from `node_modules`).
- Look contract and authoring: `.claude/skills/story-video/references/looks.md`. Style guides (33 from code-video, MIT, plus 9 story-video originals):
  `.claude/skills/story-video/references/styles/`.
- Python tools, all run through `uv` with no venv:
  - `tools/eleven.py` for ElevenLabs,
  - `tools/voices.py` for finding an ElevenLabs voice (`node story.mjs <p> voices mine | library "..." | sample <id>`),
  - `tools/speak.py` for Kokoro (local),
  - `tools/sfx.py` for the synthesized sound effects,
  - `tools/mix.py` for voice + music + effects, balanced by measurement,
  - `tools/measure.py` for the balance report,
  - `tools/contact_sheet.py` for QA sheets,
  - `tools/onsets.py` for the beats to cut on (accents, pulses, hits, tempo) in a track,
  - `tools/eleven_music.py` and `tools/eleven_sfx.py` for ElevenLabs music and sound effects (via `musicgen` / `sfxgen`).
- `template/`: what `new` copies into a project, plus each built-in look's starter theme and fonts (`template/looks/`).
- A project lives in `projects/<name>/`. The whole `projects/` folder is git-ignored: videos are the user's own
  material, not part of this repo. It may be a link (junction / symlink) to a folder elsewhere; `new` creates it if
  it's missing. Never commit a project here.
  - `project.json`: look, voice (engine `eleven` | `kokoro` | `none`), timing, music, sfx, mix, video.
  - `story.js`: the narration.
  - `scenes.js`: the visuals.
  - `theme.js`: palettes and fonts, plus kinetic props and set pieces.
  - `look.js`: only with `"look": "custom"`.
  - `PROJECT.md`: the project's memory (see Rules).
  - `assets/`: fonts and music.
  - `.cache/<engine>/` (paid voice audio), `.build/` (generated) and `output/` (renders, QA). If the user keeps
    their projects folder under its own version control, these are theirs to track or ignore.
- Requirements: node 20+, ffmpeg with libx264 and the loudnorm/ebur128/anullsrc filters, Chrome or Playwright's Chromium, uv, curl.
  On Linux (cloud containers included), run `./setup_environment.sh` first; `--check` verifies without installing.

## Rules
- Never put an API key in the repo, in a file, or in the chat. ElevenLabs reads the `ELEVENLABS_API_KEY` environment variable
  only (the scripts never read a key file, on purpose). If it's missing, check for the repo's git-ignored `.env`
  and load it into the command's environment (`set -a; . ./.env; set +a` in Git Bash) without printing it. Only if
  there's no `.env` either, ask the user to set it; don't write it anywhere.
- ElevenLabs costs credits. Run `node story.mjs <p> chars` before `voice`, and tell the user the cost. Cached sentences are free.
  To test the pipeline, use `VOICE=kokoro node story.mjs <p> ...` (a free voice) or `VOICE=none` (timing only,
  silent), which cost nothing.
- Before an expensive step (full voice read, 15-minute render), show the user a sample: voice samples, stills, a `clip`.
- `.cache/` holds paid audio. Don't delete it to "clean up". Old-format cache entries can go.
- **Every project keeps its memory in `projects/<name>/PROJECT.md`:** the brief, the style and why, the voice and its
  settings, music sources and measured beats, exact sound-effect prompts, mix, timeline, local-only files, and every
  decision the user made, including what they rejected. **A project isn't done or updated until its PROJECT.md says
  so**: update it in the same change, with a dated history line. Existing projects are resumed with the
  `story-video-resume` skill, which reads it first. `new` copies the skeleton from `template/PROJECT.md`.
- **"Slightly cheesy" is the leading star of every video** (the user, 2026-10-27). Cheese *on purpose*, played
  completely straight: trailer clichés with a wink, a mock-epic voice on mundane things, a pun the narrator lands with
  a dramatic beat, callbacks, a deadpan button after the end card. Proven: "Yule... bord.", "The sequel... is back.",
  "And one more thing...", "And at seven... pizza.", "Nobody knows what the new guy does", a `hello._` callback, a
  mock-serious grocery-order case file. *Slightly*: one or two winks per section, never a wall of jokes, and never
  accidental. A narrator reading taglines was "a bit much", and an unplanned language switch was "corny". Pick the
  look, the voice, the tags and the effects (a sleigh bell on a Christmas party) to serve it. When in doubt, the cheesier of
  two options that's still delivered straight.
- **Pick the style yourself, from the material.** Don't ask the user to browse 33 styles. Read the source, judge its
  theme, tone, audience and occasion, and choose the look that fits:
  - an investigation or case file, told soberly → `documentary`;
  - something that broke, an outage, an engineering mishap (even a comic one), for a technical audience → `postmortem`;
  - teaching, a process, a calculation, before/after numbers → `whiteboard`;
  - a reflective, emotional or big-picture story, a retrospective, a vision talk → `cinematic`;
  - an announcement, a celebration, punchy and energetic, a team show-and-tell → `kinetic`;
  - otherwise the closest guide in `references/styles/`, written as a custom look: codewalk for code, chatreplay for
    a team saga, architecture for how a system works, keynote for a launch, vhs for a mock-serious rulebook, papercut
    or storybook for a light journey, fieldjournal for research, news for updates, trailer for hype, detective for a
    mystery, thermal for costs and receipts, sports for results, weather for forecasts.

  Say what you chose, in one sentence of reasoning, and go on. The two-section `clip` is the checkpoint where the
  user can redirect. If the user names a style, use theirs.
- **When ElevenLabs is requested, pick the voice yourself.** Match it to the material and the chosen look:
  - **Language and accent:** the on-screen language and the audience come first. A Norwegian audience with an
    English script suits British or neutral English. The multilingual models handle names in other languages natively.
  - **Tone by look:** documentary → mature, calm, measured, narrative. Whiteboard → clear, friendly educator.
    Kinetic → warm and lively, a storyteller. Cinematic → deep, unhurried, warm. Post-mortem → dry, precise,
    deadpan. News or sports → a crisp broadcaster.
  - **Persona:** if the script speaks as a character (e.g. a script that speaks as Claude: dry, self-deprecating), choose a
    voice that can carry that, and use tone tags for the rest.
  - **Search:** start with `node story.mjs <p> voices mine`. The stock voices have no extra cost. George
    (`JBFqnCBsd6RMkjVDRZzb`, warm British storyteller) is the proven default for English narration. Search the
    shared library (`voices library "<description>" --accent ... --gender ... --age ...`) only when nothing stock
    fits, and skip library voices with a custom rate unless the user agrees to the price. Library voices may need
    adding to "My voices" in the ElevenLabs app first.
  - **Confirm cheaply:** render **one** sample of your pick (`voices sample <id> "<a line from the script with its
    hardest words>"`, about 150 characters). Send it, stating the voice and why, and continue unless the user objects.
    Offer alternatives only if they ask.

## Gotchas (each one cost real time once)

### Looks
- **Wrap every look in a closure** and expose one name (`const DOCUMENTARY = (() => {...})(); runLook(DOCUMENTARY);`).
  All scripts share one global scope, so top-level helpers in two files collide and kill the page.
- **The runtime owns** `PAL`, `SEC`, `WIPES`, `runLook`, `cameraOf`, `activeSentence`, `wordsSpoken`, `defaultHud` and
  `defaultEnter`. **kinetic.js owns** `FONT`, `PROPS`, `FX`, `drawProp`, `drawBlock`, `drawSection` and a few helpers.
- **Fades multiply; they never set.** Inside a block, `ctx.globalAlpha = a` (an absolute value) makes ghosted or
  dissolving content pop back to full opacity. Pass the section's alpha down and multiply it in.
- **Each look defines its own block schema** (`kind: 'card'`, `in: 'slam'`, …). `resolveScene` resolves times for any
  block: `at`, `out`, every `<name>At` field (→ `t<name>`), and `at` / `*At` inside arrays of objects at any depth
  (card rows, `series[].points[]`, events, log lines, items).
- **Big offscreen canvases multiply by four:** the render runs 4 pages in parallel. The cinematic look caches about
  60 MB of pre-blurred layers per section, so it keeps only the current section's. Paint layers once and move them;
  don't blur full-screen layers per frame.
- **Music-led videos** (an intro, a trailer): `hold` sections fix a length with or without narration, `lead` sets when
  a section's first line starts, and `project.json "score"` builds the music from a drone, a drop and effects
  (`tools/score.py`). Put the cuts on the drop's measured downbeats, not on guesses.
- **ElevenLabs music fits the cut, not the drama.** `node story.mjs <p> musicgen` composes from `project.json
  "musicgen"`: one chunk per group of sections, timed by the layout. Chunk durations are exact, and the minimum is
  3 s, so merge short sections. The asks inside a chunk ("drop out", "final hit") are suggestions: the model smooths
  everything into 4-bar phrases. Use the result as a `score.bed` (start-aligned), and make the drop-outs (`duck`) and
  hits (`fx`) in the mix. Measure with `tools/onsets.py`. The key needs the `music_generation` permission (a change
  can take a moment to apply). One take rarely does both a restrained build and a hard drive: compose takes to the
  same timeline and join them at the drop (`score.bed: [{ file, from }, ...]`), hiding the switch in a short duck with a
  riser and an impact on the downbeat.
- **Every visual event in a trailer needs a sound,** or it plays as an awkward silence (the user, on screens appearing
  without one). Put the sound on the block: `sfx: 'assets/sfx/whoosh.wav'` (or a list, or an sfx.py name),
  `sfxGain`. Layout places it on the block's moment (each effect peaks there), and it follows the anchors when the
  timing changes. Set `project.json "sfx": { "section": false, "end": false }` to drop the automatic cues.
- **Alternate cuts are variants, not copies.** `VARIANT=<name> node story.mjs <p> voice|layout|audio|render <file>.mp4`
  builds one; `story.js` and `scenes.js` branch on `VARIANT === '<name>'`, typically spreading extra lines or blocks
  in with `...(VARIANT === 'x' ? [...] : [])`. The voice cache is shared, so only the variant's own lines bill. Its
  manifest is `manifest.<name>.json`, and the main cut's `manifest.json` is protected. `.build/` holds whichever cut
  was built last, so rebuild the main cut afterwards. Check that the main cut's `timeline.js` is unchanged.
  A cut with its own music or mix puts the changed keys in
  `project.json "variants": { "<name>": { "look": ..., "musicgen": ..., "score": ..., "render": ... } }` (top-level keys, replaced
  whole). A variant can even switch looks (`"look": "custom"` loads the project's look.js for that cut only); name its closure
  apart from the scenes' constants (`SITCOM` in scenes.js and look.js killed the page).
- **The `none` voice estimates timing** at 14.5 characters per second, which is ElevenLabs George's measured pace.
  Style tests and look drafts run on it at no cost, and a real voice later just re-times everything.
- **Chrome's rasteriser isn't bit-exact** on frames with shadow blur or shake: rendering the same build twice differs
  by up to ±2/255 on a few dozen pixels. A regression diff needs that tolerance; anything bigger is a real change.

### Globals and page loading
- **kit.js owns these globals:** `SCENES`, `BG`, `IMG`, `LOOK`, `T`, `W`, `H`, `FPS`, `DUR`, `THEME`, `ctx`.
- **`VARIANT` is read-only for project files:** `story.mjs` sets it in Node and the generated `timeline.js` in the
  browser (`''` for the main cut).
- **Project files declare only** `SECTIONS`, `SAY`, `STORY` and `THEME_STORY` (plus one closure name in a custom `look.js`). Redeclaring anything else kills the page with
  "Identifier has already been declared". The scenes object is called `STORY` because `SCENES` was taken.
- **`window.VIDEO.dur` has to be set before kit.js loads.** kit reads it at load time. The generated
  `.build/index.html` loads `timeline.js` first for exactly this reason, so don't reorder the tags.

### Word anchors
- **Anchors are whole words, searched forward, in authored order.** Frames and blocks each keep their own cursor. Author
  blocks in narration order, and make repeated words unambiguous with more context, e.g. `'hashtag launch'`.
  Plain substring search once matched "me" inside "someone".
- **Anchor text is normalised.** Lowercase, apostrophes dropped ("here's" → `heres`), anything else becomes a space
  ("Fever-Tree" → `fever tree`). Write anchors the way the narration spells the words, not the way the screen does.
- **A missing anchor throws** at `layout` with the section and the words. Fix the anchor, or change the narration.
- **Tone tags `[deadpan]` are for ElevenLabs only.** anchors.js `phraseText()` and speak.py strip them. Kokoro would
  otherwise read them aloud, and they must never reach the screen.

### ElevenLabs
- **Generate one request per sentence, never per phrase.** Per-phrase requests stutter on short phrases ("F-Fever-Tree"),
  and next-text context makes every clip end on an inhale that then gets cut off.
- **Cut ` | ` beats at the quietest 10 ms between the words.** Don't cut at the midpoint of the timestamp gap: syllables
  decay past their end timestamp, and midpoint cuts clip them.
- **Where the narrator reads straight through a beat, the cut is loud** (over `JOIN_RMS`). Those phrases are marked
  `join`, and story.mjs skips the pause there instead of chopping the voice.
- **Model features differ.** `eleven_v4` supports audio tags and request stitching (`previous_request_ids`).
  `eleven_v3` has tags but no stitching. `eleven_multilingual_v2` has stitching but no tags.
- **Timestamps include tag characters**, usually at near-zero duration. eleven.py maps them back to the display text,
  so the per-phrase `chars` arrays have exactly the length of `phraseText()`.
- **But a leading tag's timestamps can be stretched** ("[epic] " over 0.34 s while the voice starts at 0.08). Cutting at
  the first letter's timestamp then clipped the first syllable: 22 clips in one video (up to 0.4 s), 3 and 7 in
  two others, found when "Air-gapped" sounded cut off. eleven.py now pins the first letter to the
  real audio onset (`onset()`, the first 10 ms above −50 dBFS). Re-cutting is free (from the cached full takes) but
  makes sentences slightly longer: re-check `hold`s and anything timed to fixed seconds.
- **A sample only means something with the narration's settings.** Without `voice_settings`, ElevenLabs uses the
  voice's stored defaults, and on v3/v4 the stability setting decides how strongly tags like `[epic]` act. `voices
  sample` now sends the project's model and settings, and prints them. To match a take from the ElevenLabs editor,
  copy the editor's model and sliders into `project.json` first.
- **The multilingual models read Norwegian words natively.** The `SAY` respellings in story.js are for Kokoro only.

### Length and timing
- **The word count sets the length, not the speed setting.** A narrator runs at about 150–165 wpm, plus TED-style pauses.
  558 words came to 5:10 with Kokoro and 4:55 with ElevenLabs v4. Kokoro's `speed` barely moves it. Estimate
  words ÷ 150 minutes before promising a length.
- **Changing the voice changes the timeline,** so the frames need a full re-render. Audio-only changes (music, balance,
  sfx) don't: use `node story.mjs <p> remux`, which takes about a minute.
- **The music must be at least as long as the video.** Longer tracks start early, so their own ending lands on the last
  frame; a shorter track leaves the finale silent. Ask the user for a cut at exactly the length `layout` prints.
  Suno takes a duration.

### Audio balance
- **Set every layer relative to the measured voice, never with a fixed gain.** ElevenLabs George is about 3 dB quieter
  than Kokoro George. A fixed effects gain once left the slams only 4 LU under the voice, with peaks louder than
  speech, because they land exactly on words.
- **Targets that worked, checked with `measure` after every mix:**
  - Music 20–25 LU under the voice while it speaks (the loudest 3 s window at least 12 LU under).
  - Sound effects about 14 LU under.
  - Defaults: `music_lu -7`, `duck_db 12`, `fx_lu -13.5`.
- **A score with a quiet minute needs `"render": { "loudness": "linear" }`.** One-pass loudnorm is dynamic and rides
  the quiet part up. Then judge loudness on the loud part: integrated loudness includes the quiet minute. The peak cap
  was the trailer voice's consonants, not the sub booms, so `mix.voice_crest_db` limits the voice only.
- **A loud trailer mix needs `"render": { "limit": true }`** with linear loudness: a gain to −14 LUFS, then a master
  limiter at −2 dBFS. With the music close under the voice, their peaks land together and cap a plain gain about 3 dB
  short; limiting each stem alone (`voice_crest_db`, `music_crest_db`) doesn't fix a sum. All three are opt-in, and
  projects without them mix byte-identically.
- **Cutting a section out of generated music: splice it, don't regenerate.** `score.cut: [[from, to]]` removes a
  stretch of the bed bar to bar (measure the beat), and holding the other sections to their old lengths keeps every
  cut on the music.
- **"Turn the music up a little" means +3 dB** on `music_lu`. Past about −5 it starts to compete with the voice.
- **The synthesized music bed in sfx.py sounds bad.** It is always replaced by silence (`song.gain 0`). Use a real
  track the user can license, or none.

### Rendering and QA
- **`render` reads `.build/audio.wav` only at the end, when it muxes.** Replacing the mix during a render is safe, and
  the video comes out with the new mix.
- **`qa` stills are taken just before the camera moves on.** A still that looks empty is usually the instant before a
  slam or mid-wipe. Check a still ±0.5 s either side before "fixing" anything.
- **Layout rules:**
  - Keep stamps and props off the numbers and values they comment on.
  - A frame's visible area is about ±900 × ±480 around its centre; keep blocks inside ±760 × ±420.
  - The HUD dots sit at the bottom.
- **WebGL renders fine headless:** Chrome uses the GPU when there is one (ANGLE / Direct3D 11 here), else SwiftShader,
  which recent Chrome only allows with `--enable-unsafe-swiftshader` (render.mjs passes it). Keep 3D deterministic:
  build the scene from a seed and set the camera and every animated value from the video time; no clocks, no
  `Math.random`. Check by rendering the same frame twice. Draw the WebGL canvas into the 2D canvas
  (`preserveDrawingBuffer: true`). It's slow: the 3D city with bloom ran about 7 s of render per second of video.
- **Don't fake a 3D camera in 2D projection.** The first city flyover was a 2D projection with a sine-wave path. At
  speed the path wobbled twice a second, and the bank came from finite differences and jerked. The user: "the world's
  worst rollercoaster". In real 3D, a path of lines and wide arcs, a look-ahead aim and a smoothed, capped bank made
  it a calm ride.
- **The browser:** render.mjs uses the installed Chrome, else Playwright's Chromium (Chrome has no ARM Linux build);
  `BROWSER=chrome|chromium` forces one. It always passes `--disable-dev-shm-usage`, because containers have a tiny
  `/dev/shm` and Chrome crashes mid-render without it.
- **The font subsets are Latin only.** They cover æ ø å ô é ÷ · — but not → or ≈: write "=", "~" or words instead.
  Check new glyphs in a still.
- **Canvas text wider than 1760 px shrinks automatically.** Very long lines get small; split them into two blocks.

### Environment (Windows, Git Bash)
- **Heredocs full of nested quotes break in Git Bash.** Write a patch or script to a file and run that instead.
- **Never `cmd | grep -q` under `set -o pipefail`.** grep exits on the first match and cmd dies of SIGPIPE, so the
  pipeline reports a miss for something that is there. Ubuntu's ffmpeg failed the libx264 check this way in a cloud
  environment. Capture into a variable and use `grep -q x <<<"$out"`. Windows has no SIGPIPE, so it only shows on Linux.
- **Testing Linux scripts through `wsl.exe` from Git Bash:** `$` gets expanded before bash sees it (`$?` always reads 0),
  and `/mnt/c` paths get rewritten. Put the test in a file and run it with
  `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/.../test.sh`.
- **Windows temp paths inside Python strings break.** `C:\Users\...` hits `\U` escapes, so use forward slashes.
- **Never smooth an audio envelope with `np.convolve` and a long kernel.** 15 M samples × a 0.8 s kernel took over 10
  minutes. Use a cumulative-sum moving average (see mix.py `smooth`).
