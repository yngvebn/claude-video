---
name: story-video
description: Turn source material (a deck, an article, notes, a doc, a URL) into a narrated presentation video in this repo. A voice reads a written script with TED-style pauses, every on-screen beat lands exactly when it is spoken, in a look chosen to fit the material (kinetic typography, documentary case file, whiteboard lecture, cinematic film essay, incident post-mortem, or any of 42 styles as a custom look), over a measured music mix, rendered to MP4. Use for "make a video of this", "turn this into a presentation video", "narrated explainer", a named visual style, or when the user brings new material for story-video.
---

# story-video

This skill turns source material into `projects/<name>/output/<name>.mp4`. Read `CLAUDE.md` first, especially the
gotchas. The references hold the details:
- [script.md](references/script.md): writing narration and its delivery marks.
- [looks.md](references/looks.md): the look contract and how to write a custom look. The built-in looks'
  vocabularies are in [scenes.md](references/scenes.md) (kinetic) and `references/looks/`: documentary, whiteboard,
  cinematic, postmortem.
- [styles/](references/styles/README.md): 42 style guides, and which ones have a built-in look.
- [audio.md](references/audio.md): voices, music and balance.

Every step has a checkpoint with the user. The expensive parts (paid voice credits, a 15-minute render) happen only
after the user has seen a sample.

## 0. Read the source, ask the few real questions
- Read all of the source. If it's a claude.ai artifact, use the Artifact tool's read action.
  If it already has speaker notes or narration text, that's your script draft.
- Ask in one go, and skip anything the user already said:
  - Length. Tell them the word count sets it: about 150 wpm plus pauses.
  - Audience and occasion.
  - On-screen language.
  - Voice engine: ElevenLabs (needs a key and costs credits, best quality) or Kokoro (free, local).
  - Whether they have music.
- Don't ask which style or which voice. You pick both (steps 2 and 3, rules in CLAUDE.md), unless the user named one.
- **Choose the look now,** from the material's theme, tone, audience and occasion (CLAUDE.md "Pick the style yourself").
  Tell the user in one sentence which look and why, then create the project with it:
  `node story.mjs new <name> --look <kinetic | documentary | whiteboard | cinematic | postmortem | custom>`. Put the source link in `project.json`.

## 1. Script (checkpoint: the user approves the script)
- Write `story.js`: sections of 3–8 sentences, one idea per section, and one or two dry or funny beats per section
  when the material allows. **Aim for "slightly cheesy", played straight** (CLAUDE.md, the leading star of every
  video): a mock-epic line, a pun with a beat, a callback, a button after the end. Every fact comes from the source; don't invent numbers.
- Add delivery marks where a presenter would breathe or land a line: ` | `, `//`, `///`, `~` and `[tone]` tags.
  See script.md.
- Show the script with its word count, the estimated length (words ÷ 150 minutes, plus about 20% for pauses) and,
  for ElevenLabs, the character cost from `node story.mjs <name> chars`.

## 2. Voice (you pick; the user can veto)
- **ElevenLabs:**
  - The user sets up a key: Text to Speech access, Voices read, nothing else, and a credit limit. Tell them not to
    paste it into the chat. They set it as the `ELEVENLABS_API_KEY` environment variable themselves; never write it to a file.
  - Pick the voice yourself, following CLAUDE.md "pick the voice yourself": language and accent for the audience,
    tone for the look, persona for the script. Use `node story.mjs <p> voices mine` first, and
    `voices library "<description>" --accent .. --gender .. --age ..` only if nothing stock fits. Check library voices
    for a custom rate.
  - Render one sample: `voices sample <id> "<a script line with the hardest words>"`. Send it with the voice's name and
    a one-line reason. Continue unless the user objects.
  - Model: `eleven_v4`, for tags and stitching.
- **Kokoro:** pick one of `bm_george` (UK), `am_michael` (US) or `af_heart` (US) the same way; samples cost nothing.
- **Drafting the look before the voice** is fine: `VOICE=none` gives the timing for free, and the real voice re-times it.
- Set `project.json` → `voice`, then run `node story.mjs <name> voice`, then `layout`. Report the real length.

## 3. Look (checkpoint: two sections previewed as clips)
- Built-in look: its vocabulary doc says what blocks exist. Custom look: write `look.js` from the style guide, following
  looks.md (a closure, deterministic, anchors for every beat), starting from the closest built-in look.
- `theme.js`:
  - Palettes come from the source's real colours (the deck's CSS, the brand page, the site's CSS), or from the
    style guide's hex values when the source has no brand. Kinetic: one palette per section background, alternated so
    every wipe is visible. Documentary and whiteboard: one palette.
  - Fonts from the source where possible. Put the `.woff2` files in `assets/fonts`, and check glyph coverage for the
    language.
- `scenes.js`: build the **two strongest sections** first (the cold open plus the best story beat). Leave the rest on
  the look's automatic fallback.
- Check the `qa` sheets against the style guide's Signature rows: palette, type, and the signature objects.
- Run `layout`, `audio`, `qa`, and look at every sheet. Then render a `clip` of each of the two sections and send them.
  This is the look checkpoint, so iterate here: it's cheap.

## 4. Build the rest
- Author every remaining section with its own set piece from the look's vocabulary. For kinetic, reuse the generic
  set pieces and add project-specific props or fx in `theme.js`.
- `layout` fails loudly on an anchor that isn't in the narration, so fix those as they come.
- Run `qa` and look at every sheet. Fix overlaps, text sitting on values, clipped edges, and anything cramped.

## 5. Sound
- Music: the user supplies a track they can use at the event, and it must be at least as long as the video. The
  exact length is printed by `layout`, and Suno can generate that length. Set `project.json` → `music.file`.
- Run `node story.mjs <name> audio`. The balance report has to show `[ok]` for music and effects. If the user asks
  for louder or quieter music, change `mix.music_lu` in steps of about 3 dB and use `remux` on the rendered video.

## 6. Render and deliver
- `node story.mjs <name> render`. It takes about 3 s of wall time per second of video, so run it in the background.
- Before delivering:
  - Check the MP4 with ffprobe: duration, both streams, about −14 LUFS.
  - Look at frames at every section change and a few mid-flight.
  - Crop the smallest text in a frame to check compression.
- Send the file. Report the length, size and loudness, the balance numbers, what changed from the plan, and what you
  couldn't verify (you can't listen to audio: pronunciation and feel are the user's call).
- For audio-only changes, use `remux` (a minute) and don't render again.
- **Write `PROJECT.md`** (from the template the project started with): the brief, the style and why, the voice, the
  music and its source or prompts, the exact sound-effect prompts, the mix and measured results, the timeline, the
  local-only files, and the decisions and rejected ideas from the session. The video isn't delivered until it exists.

## When the user asks for tweaks
For a project from an earlier session, use the **story-video-resume** skill: it starts from `PROJECT.md`. Every tweak
ends with PROJECT.md updated: the changed sections plus a dated line under Decisions and history.

- **Wording on screen or positions:** edit `scenes.js`, then `layout` and `render`. The voice is untouched.
- **Narration wording:** edit `story.js`, then `voice` (bills only the changed sentences), `layout`, `audio` and `render`.
  Then re-check any anchors on changed words.
- **Pronunciation:** with ElevenLabs, rephrase or add a tag. With Kokoro, add a respelling to `SAY`.
- **Voice glitches** (stutter, clipped breath): see audio.md. Usually the fix is in how the sentence is split, not in
  the voice settings.
