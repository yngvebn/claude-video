# story-video

Narrated presentation videos from any source material (a deck, an article, notes, a URL), made with
[Claude Code](https://claude.com/claude-code).

A TTS voice (ElevenLabs, or Kokoro locally for free) reads a written script with TED-style pauses. Every beat on
screen lands at the exact moment it's spoken, in a **look** chosen to fit the material:

| Look | What it is |
|---|---|
| `kinetic` | kinetic typography: words slam and pop, the camera flies between tilted frames, pixel props and stamps |
| `documentary` | documentary case file: chapters, evidence cards with red corrections and ink stamps, bar charts, a witness silhouette, captions built from the narration |
| `whiteboard` | whiteboard lecture: a hand writes and draws everything as it's said, and old sections ghost through |
| `cinematic` | a narrated film: 2.39:1, slow dollies through layered, graded scenery, rack focus, grain, silhouettes, subtitles, chapter slates; a 3D night-city flyover for trailers |
| `postmortem` | an incident review on a dark monitoring dashboard: status pill, live graphs, alerts, logs, root cause, action items |
| `custom` | any of 42 [style guides](.claude/skills/story-video/references/styles/README.md) (news, trailer, code walkthrough, chat replay, architecture, keynote, VHS training tape, …) written as a project `look.js` |

It all renders to an MP4 (1920×1080, H.264) over a music bed balanced by measurement, not by ear-guessing.

## Making a video with Claude Code
1. Install the requirements (below), clone this repo, `npm i`, and open the folder in Claude Code.
2. Share the source material and say **"make a video of this"**.

Two project skills in `.claude/skills/` drive the work. Claude Code picks them up automatically when it opens the repo:

| Skill | When | What it does |
|---|---|---|
| [`story-video`](.claude/skills/story-video/SKILL.md) | a new video | reads the source → writes the script (you approve) → picks a voice and a look → previews two sections as a clip (you can redirect) → builds the scenes, sound and mix → renders and checks the result |
| [`story-video-resume`](.claude/skills/story-video-resume/SKILL.md) | an existing video | reads the project's `PROJECT.md` and makes the change the cheapest way: re-time, re-word, re-voice, re-mix or re-render |

[`CLAUDE.md`](CLAUDE.md) holds the stack, the rules (cost checks before paid steps, how the style and voice are
chosen) and the gotchas. The skill references hold the details: [script](.claude/skills/story-video/references/script.md),
[scenes](.claude/skills/story-video/references/scenes.md), [looks](.claude/skills/story-video/references/looks.md),
[audio](.claude/skills/story-video/references/audio.md).

The house style is **"slightly cheesy"**: trailer clichés with a wink, a pun landed with a dramatic beat, all played
completely straight. Ask for something else if that's not your occasion.

## Without Claude Code
```bash
npm i
node story.mjs new my-story --look cinematic   # kinetic | documentary | whiteboard | cinematic | postmortem | custom
# write projects/my-story/story.js (narration) and scenes.js (visuals), see the skill references
node story.mjs my-story build        # voice + layout + audio
node story.mjs my-story qa           # stills of every camera frame -> output/qa
node story.mjs my-story clip 0 20    # a 20 s preview with sound -> output/clip.mp4
node story.mjs my-story render       # -> projects/my-story/output/my-story.mp4
```
`node story.mjs help` lists every command. Pick the voice per run with `VOICE=`:
- `VOICE=none`: silent, timing estimated at a narrator's pace. Free, and the fastest way to try a look.
- `VOICE=kokoro`: a local voice, free. The model (~340 MB) downloads on first use.
- `VOICE=eleven` (or `"engine": "eleven"` in `project.json`): ElevenLabs. Paid; run `node story.mjs <p> chars` first to see the cost.

## Your projects
Videos live in `projects/<name>/`, and that folder is **git-ignored**: your scripts, voice audio and renders are
your own material, not part of this repo. `new` creates it on first use, copied from [`template/`](template).

Each project has:

| File | What |
|---|---|
| `project.json` | look, voice (engine, voice id, model, settings), timing, music, sound effects, mix, render |
| `story.js` | the narration, with delivery marks (`|` breath, `//` pause, `///` punchline, `[deadpan]` ElevenLabs tags) |
| `scenes.js` | what appears on screen, anchored to the narrator's words |
| `theme.js` | palettes and fonts |
| `PROJECT.md` | the project's memory: brief, decisions, voice, music, mix, history. The resume skill starts here |
| `assets/` | fonts, music, sound effects |
| `.cache/` | paid ElevenLabs audio, cached per sentence. Don't delete it: re-recording costs credits |
| `.build/`, `output/` | generated page and audio; renders, stills and QA sheets |

To keep projects somewhere else (another drive, their own git repo), make `projects` a link to that folder:
```powershell
New-Item -ItemType Junction -Path projects -Target D:\path\to\my-video-projects   # Windows (PowerShell)
```
```bash
ln -s /path/to/my-video-projects projects                                       # macOS / Linux
```

## Requirements
| Tool | Why |
|---|---|
| Node.js 20+ and `npm i` | `story.mjs` and the frame renderer (`playwright-core`, `roughjs`, `three`) |
| Google Chrome, or Playwright's Chromium | renders every frame headless (Chrome is used when installed) |
| ffmpeg with `libx264` and the `loudnorm`, `ebur128`, `anullsrc` filters | encoding, muxing, loudness |
| [uv](https://docs.astral.sh/uv/) | runs the Python tools with their dependencies, no venv; fetches Python 3.12 for Kokoro |
| curl, internet on first run | Python packages, the Kokoro model, the ElevenLabs API |

- **Windows:** `winget install OpenJS.NodeJS.LTS Google.Chrome Gyan.FFmpeg astral-sh.uv`, then `npm i`.
- **macOS:** `brew install node ffmpeg uv`, plus Chrome, then `npm i`.
- **Linux (Debian / Ubuntu, cloud containers too):** `./setup_environment.sh` installs whatever is missing and
  verifies it. `--check` only verifies, `--kokoro` prefetches the voice model, `--smoke` does an end-to-end test render.

### ElevenLabs (optional)
Voice, music (`musicgen`) and sound effects (`sfxgen`) can come from ElevenLabs. Set `ELEVENLABS_API_KEY` in the
environment of the shell you run from. There is no key file, on purpose; a git-ignored `.env` in the repo root works
if you load it into the shell yourself (`set -a; . ./.env; set +a`). Music needs the key's `music_generation`
permission.

## Layout
| Path | What |
|---|---|
| `story.mjs` | the CLI: the whole pipeline |
| `engine/` | browser side: `runtime.js` (sections, timings, look contract), `looks/*.js`, `anchors.js` (word → time), `kit.js`, `city3d.js`, `render.mjs` |
| `tools/` | Python: `eleven.py`, `voices.py`, `speak.py` (Kokoro), `mix.py`, `measure.py`, `sfx.py`, `score.py`, `onsets.py`, `contact_sheet.py`, ElevenLabs music and effects |
| `template/` | the project skeleton `new` copies, with each look's starter theme and fonts |
| `.claude/skills/` | the Claude Code skills and their references, including the 42 style guides |
| `CLAUDE.md` | stack, rules and hard-won gotchas |

## Credits
The canvas kit (`engine/kit.js`, `minis-ai.js`), `tools/sfx.py`, `contact_sheet.py` and 33 of the style guides come from
[code-video](https://github.com/Changroro/code-video) by Bae-ChangHyun (MIT, `references/styles/LICENSE-code-video`).
Local voice: [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) via kokoro-onnx (Apache 2.0). 3D: [three.js](https://threejs.org) (MIT).
