# Writing the narration (story.js)

```js
var SECTIONS = [
  { key: 'hansa', say: [
    "[mock-serious] Case file: | August thirty-first. //",
    "[sheepish] Turns out it's just Heineken, | brewed under license by Hansa Borg Bryggeri.",
    "~[deadpan] Humbling. ///"] },
  { key: 'signoff', keep: true, say: [ ... ] },   // keep: hold the last frame at the end of the video
];
// music-led videos: sections with a fixed length, narrated or silent 
//   { key: 'dark', hold: 60 },                     // 60 s, no narration: a silent opening, a montage, a beat
//   { key: 'open', lead: 0, say: [ ... ] },         // lead: when the first line starts (default timing.lead, 0.8 s)
//   { key: 'close', hold: 12.1, say: [ ... ] },     // narrated, but held to a fixed length (layout fails if the speech overruns)
var SAY = { Siobhan: 'Shiv-awn' };                    // Kokoro-only respellings
```

## Delivery marks
| Mark | Where | Effect |
|---|---|---|
| ` \| ` | inside a sentence | A breath between phrases (`timing.phrase_gap`, 0.24 s). With ElevenLabs, the sentence is generated whole and cut at this point. |
| `//` | end of a sentence | A longer pause (0.85 s) before the next sentence |
| `///` | end of a sentence | A punchline hold (1.3 s). Also the section's outro. |
| `~` | start of a phrase | That phrase is read slower (`slow`, 0.9). With ElevenLabs it becomes its own request. |
| `[tone]` | anywhere, usually at the start | An ElevenLabs v4 audio tag: `[deadpan]`, `[warmly]`, `[sheepish]`, `[dry]`, `[amused]`, `[mock-serious]`, `[sincere]`, `[sighs]`, `[whispers]`… Stripped for Kokoro, the screen and the anchors. Tags cost credits like normal characters. |

## What reads well
- **Slightly cheesy, on purpose** (the house style, see CLAUDE.md): the narrator plays it completely straight, and the
  words carry the wink. "And one more thing..." "The sequel... is back." "And at seven... pizza." One or two per section.
- **Foreign words in an English read:** a multilingual voice switches language on them (a Norwegian word came out
  Norwegian, mid-trailer, which was corny). Respell them for the narrator's accent ("Julebord" as "Yule... bord.") and point the
  anchor at the respelling; the screen keeps the real word.
- **Rhythm:** setup, beat, punchline. Put the `//` or `///` right before or after the line that should land.
  "I don't eat. // I have zero excuse. ///"
- **Pause sparingly.** A beat on every phrase flattens the rhythm. Use ` | ` where a presenter would actually breathe:
  before the reveal, around a list.
- **Tag sparingly.** Tag the sentences whose delivery should change, and leave the rest to the voice's natural read.
- **Write numbers and dates as spoken words** ("August thirty-first", "fourteen people"). The screen shows "31.08" and
  "14". Anchors match the spoken words, so write the anchor as the narration says it.
- **Short sentences** give the screen more moments to hit. Around 8–18 words per sentence works well.
- **The first line** should be short and on its own: "Hei folks. //".
- **The last section** gets `keep: true` and a final line to land the ending on.

## Length
Allow about 150 words per minute plus the pauses. For a quick estimate, run `node story.mjs <p> chars` (characters ÷ 5.5 ≈ words).
Once the voice is generated, `layout` prints the real length. That's the number to give the user, and to ask for music at.

## Pronunciation
- **ElevenLabs multilingual / v4:** names and words in other languages usually come out right as written. If one
  doesn't, rephrase it or spell it phonetically in that sentence. The screen text is authored separately in
  scenes.js, so it isn't affected.
- **Kokoro (English G2P):** add a respelling to `SAY`, e.g. `Familiepakning: 'fah-meelyeh-pahk-ning'`. It only
  affects the audio.
