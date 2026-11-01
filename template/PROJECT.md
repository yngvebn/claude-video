# <Title>

The project's memory: everything a later session needs to pick this video up again. Code and config hold the
*what*; this file holds the *why*, the sources, and every decision the user made. Update it whenever the project
changes (`story-video-resume` skill). Mark anything you inferred rather than were told as *(inferred)*.

## Brief
- **What:** <what the video is, for whom, the occasion and date, how it will be played>
- **Source:** <deck / URL / notes it was made from>
- **Length:** <m:ss> · **Status:** <in progress | final, date> · **Final render:** `output/<file>.mp4`

## Style
- **Look:** <look and preset>, chosen because <reason>.
- **Palette and type:** <colours, fonts, why>
- **Rejected:** <styles tried and why they lost>

## Script and voice
- Script: `story.js` (the source of truth). <Notes on structure, sections and wording decisions>
- **Voice:** <engine, name, id, model, settings>. Tags: <which, where>. Pauses: <timing overrides>.
- **Rejected voices / tags:** <...>

## Music
- <track, source (Suno prompt or licence), length, key, tempo, how it is placed (start, end-aligned, score)>
- **Measured beats** (`tools/onsets.py`): <the times the cuts hang on>

## Sound effects
- <name: source and exact prompt (ElevenLabs `sfxgen`), duration, where it sits, level>

## Mix
- <project.json mix and render settings, and why; measured results>

## Timeline
| Section | Start–end | What happens |
|---|---|---|

## Local-only files
<Git-ignored files the build needs (paid voice cache, licensed or generated audio) and how to get each back.>

## Rebuild
```bash
node story.mjs <name> build
node story.mjs <name> render <name>.mp4
```

## Decisions and history
- <date>: <what changed, at whose request, and why>

## Open items
- <checks still to do>
