# Voice, music, balance

## Voice engines (project.json → voice)
| Engine | Quality | Cost | Notes |
|---|---|---|---|
| `eleven` | best, expressive, per-sentence tone tags | credits ≈ characters (+ tags) | model `eleven_v4`; exact per-character timestamps; needs a key |
| `kokoro` | decent, a bit flat | free, local | `bm_george` (UK), `am_michael` (US), `af_heart` (US); English G2P, so non-English words need `SAY` respellings |

`VOICE=kokoro node story.mjs <p> …` overrides the engine for one run. Use it to test the pipeline without spending credits.

**ElevenLabs key.** Scopes: Text to Speech access, Voices read, everything else no access. Set a credit limit, about
3× a full read. Stock voices that worked:
- George `JBFqnCBsd6RMkjVDRZzb`: warm British storyteller.
- Daniel `onwK4e9ZLuTAKqWW03F9`: dry British broadcaster.
- Roger `CwhRBWXzGAHq8TQ4Fs17`: laid-back American.

**Picking one:** you choose, from the material and the look (the rules are in CLAUDE.md). Search with
`node story.mjs <p> voices mine` or `voices library "<description>"`, render **one** sample of your pick with
`voices sample <id> "<line with the hard words>"`, send it with a one-line reason, and continue unless the user objects.

**How eleven.py works:**
1. It sends one request per sentence. A `~` slow phrase becomes its own request.
2. It stitches consecutive requests with `previous_request_ids`.
3. It cuts ` | ` beats at the quietest 10 ms between the words.
4. It drops the breath in between and fades each clip's edges (12 ms in, 45 ms out).
5. Where no quiet point exists, the narrator read straight through the beat. That beat becomes `join`: no pause is
   inserted and the voice stays continuous.

**Glitches:**
- A stutter at the start of a line, or a clipped breath, means something is cutting or restarting mid-flow. Check the
  cut energies, and don't regenerate blindly.
- A word said wrong: rephrase it, or change its tag.
- Re-running `voice` only bills sentences whose text or settings changed.

## Music
- The user supplies a track they're allowed to use at the event, and it must be **at least as long as the video**.
  Get the exact length from `layout`; Suno takes a target duration. A longer track is started early so its own
  ending lands on the last frame.
- Set `project.json` → `music.file` (relative to the project). Set `"music": null` for none.
- Don't use sfx.py's synthesized music bed. It's replaced by silence on purpose.

## A music-led score from parts (project.json → score)
For an intro or trailer where the music leads (a quiet minute, then a hit): `audio` builds the music with
`tools/score.py` from a drone, a separate drop and one-shot effects, and uses it instead of `music.file`.
```json
"score": { "drone": "assets/music/strings.wav", "drone_db": -11, "drop": "assets/music/drop.wav",
           "hit": "hit", "len": "end",
           "fx": [ { "file": "assets/sfx/riser.wav", "at": "hit", "align": "peak", "db": -8 },
                   { "file": "assets/sfx/boom.wav", "at": { "section": "close", "dt": 5.92 }, "db": -12 } ] }
```
- Times are seconds, a section key (its start), `{ section, dt }`, or `"end"`, so a re-timed narration moves the score.
- The drop's first transient (detected, past any leading click) lands exactly on `hit`. The drone is stretched with
  one equal-power crossfade at its best-matching spectrum, so its own fade-out ends just before the hit.
- `align: "peak"` puts an effect's loudest moment on `at` (a riser into the hit); `"start"` its onset.
- Generate the parts in Suno separately: a drone with no build ("no percussion, no choir, pianissimo") and a drop
  that starts on the hit and ends on a hard final hit, in the same key. Asking for "a minute of drone, then a drop"
  in one prompt gets a build spread over the whole minute. Measure the drop's downbeats and put the cuts on them.
- **Takes joined at a drop:** `"bed": [{ "file": "assets/music/drop-a.mp3", "from": 0 }, { "file": "assets/music/drive-a.mp3",
  "from": { "section": "back", "dt": .24 } }]`. Each file plays its own time (they were composed to the same timeline).
  Hide the switch in a `duck` just before it, with a riser peaking into an impact.
- **A finished track as the bed** (ElevenLabs `musicgen`, or any music that should start at 0:00): `"score": { "bed":
  "assets/music/generated.mp3", "duck": [{ "from": "reveal", "to": { "section": "outro", "dt": .09 }, "db": -40 }],
  "fx": [...] }`. Duck makes trailer drop-outs with 40 ms fades; return on the music's beat (measure it).
- Generated sound effects: `node story.mjs <p> sfxgen "<prompt>" --as <name> --dur 3` (ElevenLabs, about 10
  characters per second, cached in `.cache/sfx`). Trailer impacts come back almost pure sub-bass (98% under
  120 Hz), which small room speakers barely play: listen on the real speakers before adding a second, punchier layer.

## Balance (project.json → mix; applied by tools/mix.py)
Everything is set relative to the **measured** loudness of the narration while it speaks:
| Setting | Default | Meaning |
|---|---|---|
| `music_lu` | −7 | music level in pauses and gaps, relative to the voice |
| `duck_db` | 12 | extra cut under speech (0.3 s attack, 0.8 s release, so pauses breathe) |
| `fx_lu` | −13.5 | sound effects relative to the voice (they land on words, so keep them low) |

`audio` prints the report. Aim for:
- **Music:** 20–25 LU under the voice while it speaks, with the loudest 3 s window at least 12 LU under.
- **Effects:** about 14 LU under.

A trailer is different: the orchestra is half the point. One trailer used `music_lu −3`, `duck_db 6` and
`music_min_lu 8` (the report's threshold), which puts the orchestra about 10 LU under the voice.

"A little louder" means +3 dB on `music_lu`; stop around −5. After any audio-only change, run `remux` on the existing
video instead of rendering again. The final mux normalises to −14 LUFS; a single loudnorm pass lands between −14.1
and −14.8.

**Big contrast needs `"render": { "loudness": "linear" }`.** ffmpeg's one-pass loudnorm is dynamic: on a quiet minute
followed by a hit it rides the quiet part up and flattens the reveal. Linear mode normalises once in `mix.py` with a
plain gain (capped at −1.5 dBFS oversampled peak) and the mux leaves it alone. Judge the result by the loud part, not
the whole: one teaser's integrated loudness is −17 LUFS because of its dark minute, while the payoff plays at −14.5.
A trailer voice has big crest (consonant peaks 16 dB over its loudness), which caps that gain: `mix.voice_crest_db`
(11 in that teaser) limits only the voice's peaks.

## Sound effects
`layout` derives them from the scenes: a thud on each `slam` and `stamp`, a pop on each `pop`, a whoosh at each
section change, and a chime at the end. There's nothing to author, and they follow the anchors automatically.
