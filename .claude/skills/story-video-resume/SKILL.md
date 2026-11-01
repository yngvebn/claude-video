---
name: story-video-resume
description: Resume, update, tweak or re-render an existing story-video project from where it was left, using its PROJECT.md (script, voice, music, sound effects, style, timings, decisions). Use when the user refers to a video that already exists in projects/ ("the teaser", "the launch video"), asks to continue, change, fix, re-time, re-voice or re-render it, or asks what a project is or how it was made. For a brand-new video use the story-video skill instead.
---

# story-video-resume

Every project keeps its memory in `projects/<name>/PROJECT.md`: the brief, the style and why, the voice and its
settings, the music sources and measured beats, the sound-effect prompts, the mix, the timeline, which files are
local only, and every decision the user made, including what they rejected. Code holds the *what*; PROJECT.md holds
the *why*. Read `CLAUDE.md` too: the gotchas apply here as much as on a new video.

## 1. Find the project and load its memory
- `ls projects/`, and match the user's words to a project (folder name, `project.json` title, PROJECT.md brief).
  Ask only if two projects fit equally.
- Read **PROJECT.md in full** before touching anything, then `story.js`, `scenes.js` and `project.json`.
- Treat **Decisions and history** as constraints. A rejected idea (a voice, a style, an effect) stays rejected unless
  the user reopens it. Don't re-propose it.
- **No PROJECT.md** (an older project): write one first, from `template/PROJECT.md`, the project
  files, its git history if it has one and the renders in `output/`. Mark what you inferred, and show the user the gaps
  you couldn't fill.

## 2. Check what's actually on disk
PROJECT.md's **Local-only files** lists what the build needs that git doesn't carry. Check each one:
- the voice cache, `.cache/<engine>/`: re-recording costs characters and re-times everything;
- source audio such as Suno tracks or generated effects: are they present, and can they be regenerated (the prompts
  are in PROJECT.md) or only supplied by the user?
- the key: ElevenLabs reads `ELEVENLABS_API_KEY` from the environment only. If a git-ignored `.env` holds it, load it
  into the shell for the command without printing it.
- if the projects folder is its own git repo, `git -C projects status -- <name>`: uncommitted edits from a previous
  session? (`projects/` is git-ignored by this repo, so plain `git status` here shows nothing.)

If something the change needs is missing, say so and what it costs to get back, before starting.

## 3. Make the change the cheapest way
Follow "When the user asks for tweaks" in the story-video skill. In short:
- **On-screen wording or positions:** `scenes.js`, then `layout` and `render`.
- **Narration:** `story.js`, then `voice` (only changed sentences bill; run `chars` and state the cost), `layout`,
  `audio` and `render`. Re-check anchors on changed words, and anything hung on fixed times.
- **Music, balance or effects:** `audio` (or `remux` when the frames are unchanged). If a track or its placement
  changes, re-measure the beats with `tools/onsets.py` and move the times that hang on them.

Keep the project's established settings (timing overrides, tags, mix, loudness mode) unless the change is about them.

## 4. Verify
Same bar as a new video:
- stills or a `clip` around the change;
- ffprobe on the final file;
- loudness, measured by part when the video has a deliberately quiet stretch;
- for engine changes, stills of an existing project before and after, diffed within the ±2/255 Chrome noise noted
  in CLAUDE.md.

Say what you couldn't check (you can't hear audio).

## 5. Update PROJECT.md (the change isn't done until this is)
- Edit every section the change touched: script lines, voice, music, effect prompts, mix, the timeline, measured
  results, status and the final render.
- Add a dated line to **Decisions and history**: what changed, at whose request, why, and what was rejected.
- Put new local-only files in **Local-only files**, with how to get each back.
- Commit PROJECT.md in the same commit as the change it describes, when the user wants a commit (in the projects
  folder's own repo, never in this one).
