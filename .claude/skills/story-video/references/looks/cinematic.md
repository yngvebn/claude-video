# Look: cinematic film essay (`"look": "cinematic"`)

A narrated film in 2.39:1. Each section is one continuous shot through graded, layered scenery. It opens on a black
chapter slate, dollies slowly forward and ends by fading to black. Titles in a light serif rack into focus on their
anchor words, silhouettes stand in for the subject, and cinema subtitles carry the narration. Style guide:
`../styles/cinematic.md`. Starter: `node story.mjs new <p> --look cinematic`.

`new --look cinematic` gives the palette (`film`) and fonts (Cormorant Garamond light, medium and italic, plus Work Sans).

## Scene fields
```js
STORY.hansa = { bg: 'film', title: 'The Hansa incident', chapter: 1, slateHold: 2.2, subtitles: true, focus: .58,
  scape: { preset: 'city', time: 'dusk', seed: 3, pan: 140, dolly: .07 }, blocks: [...] };
```
- `scape.preset`: `mountains` (default), `city` (skylines with lit windows), `sea` (water with glints, a far island),
  or `plain` (hills, lone trees, foreground grass).
- `scape.time`: `dusk` (default), `night`, `dawn` or `day`. This sets the sky grade, the sun or moon, and the haze.
- `scape.seed` gives a different landscape; `pan` is the lateral camera travel in px over the section; `dolly` is how
  much the near layers grow.
- `title` and `chapter` make the black slate (a roman numeral and an italic title); without `title` the scene just
  fades up. `slateHold` sets how many seconds the slate holds.
- `focus` is the starting focus depth. Depths: .12 haze · .32 far layer · .58 subject plane · 1 foreground.
- `subtitles: false` hides the subtitles for the section.

## Blocks
Coordinates are relative to the centre of the image area (the letterbox is 803 px tall). Blocks fade in over about 1 s on
`at` and fade out over about 0.8 s on `out` (or when a later block has `clear: true`).

| kind | Fields | On screen |
|---|---|---|
| `title` | `txt`, `size` (128), `x`, `y` (−40), `italic`, `weight: 'medium'` (default light), `depth`, `track`, `color` | a serif title that closes its letter-spacing and racks into focus as it fades up, with a warm halation glow |
| `line` | `txt`, `size` (24), `y` (70), `track` (9), `depth`, `color` | a small tracked-caps context line (a date, a place, a label) |
| `number` | `count`, `countFrom`, `dec`, `txt` (`'{n}'` template), `size` (220), `y`, `depth` | a big light numeral counting up |
| `object` | `shape`, `x`, `scale`, `depth`, `n`, `gap`, `gone`, `goneAt`, `ground` | black silhouettes on the subject plane, rim-lit. `shape` is `figure`, `bottle`, `lamp` (with a light cone), `monolith` or `tree`. `n` makes a row; `gone` of them fade out, one after another, at `goneAt` |
| `focus` | `depth`, `dur` (1.4) | a rack focus to that depth, starting at `at` |

## Trailer mode
For a music-led intro with hard cuts (see also `hold` / `lead` in `script.md` and `score` in `audio.md`).
- Section fields: `fade: [in, out]` in seconds (`[0, 0]` is a hard cut; the default fades through black),
  `exposure: [[t, v], ...]` (seconds into the section, 0 black to 1 full, eased: an imperceptibly slow fade-up),
  `subtitles: false`.
- `scape.id`: sections with the same id share one painted landscape and **one camera move** across all of them, so
  cuts don't restart the dolly. Without it, every section paints and moves on its own.
- `scape.sunX` / `sunY` pin the light (px from the centre / above the horizon), e.g. clear of wide titles;
  `sunRise` is how far it climbs over the span.

| kind | Fields | On screen |
|---|---|---|
| `cut` | `txt`, `size`, `font` (`'steel'` = theme font STEEL in brushed metal, `'sans'`, `'light'`, or the serif), `track`, `y`, `sub`, `subFont: 'mono'`, `black`, `flash` (0–1, default .35), `punch`, `keep` | a title that slams on at `at` with a small punch-in and a flash, and cuts off hard at the next `cut` in its section (`keep: true` holds it). `black: true` puts it on black |
| `type` | `txt`, `typeAt`, `cps` (9), `size`, `y`, `out` | a blinking `_` cursor from `at`, the text typed out from `typeAt` (theme font MONO) |
| `flash` | `peak` (.85), `dur` (.5), `color` | a white flash over the frame (`color: '#000'`, `dur: .07`: a flicker) |
| `glitch` | `dur` (.35), `amp` (90), `slices` (9), `tints` (two rgba slice colours) | torn horizontal slices |
| `screen` | `img`, `full: true`, `fadeIn` (s), `zoom` (start scale), `push` / `pushDur` | a photo filling the image area; with `exposure: [[0, 0]]` it replaces the scape |

### `preset: 'orbit'`
A planet's night side from orbit: stars, city lights in clusters linked like a network (with light pulses along the
links), a blue atmosphere rim, and a white-gold sunrise over the limb.
`scape: { preset: 'orbit', id, seed, planet: { r: 3400, x: 160, top: 770 }, sunAt: 360, dolly: .07, light: [[s, v], ...] }`
- `planet`: radius, centre offset from the middle, and the limb's top in px. `sunAt`: px along the limb from the
  planet's centre.
- `light` keyframes are in **video seconds**, 0 night to 1 full sunrise. Two keys close together make a jump:
  `[59.9, .32], [60.02, 1]` is the sunrise on a hit at 1:00. Combine with a section's `exposure` for the dark part.
- Wide centred titles want the sun off-centre (`sunAt` of about 360): a sunburst under the credit lines washes them out.
- `wake: { accents, pulses, breaths, until: [s0, s1] }` (video seconds) animates the dark part over the exposure mask,
  so the planet stays unseen: each accent wakes one city's lights (a bloom settling to a glow, later ones brighter),
  each pulse brightens a city linked to the newest one a little, and the stars breathe on all three. Just the lights:
  halos and dots travelling between cities were tried and read as orbs and noise. It hands over to the
  planet between `until[0]` and `until[1]`. Take the times from the music: low-band onsets for accents, mid-band
  onset runs for pulses (one teaser's came from the stretched drone in `.build/score.wav`).

### `preset: 'reentry'`
The orbit, then a plunge into the planet, then a **3D night city** (`engine/city3d.js`, three.js/WebGL) that plays
the music. It's the answer to the orbit, when the trailer starts straight in and the background has to act.
`scape: { preset: 'reentry', ...orbit fields, drop: 26.0, dive: 1.7, climb: 46.16, beat: { t0: 26.14, period: .4615 },
push: .22, city3d: { speed: 120, altitude: 15, turn: 60, seed: 4 } }`, all in video seconds.
- Until `drop`: the orbit, with a slow `push` in. For `dive` seconds: a 2D hard zoom into the limb with plasma and
  clouds, while the 3D camera drops from high above and behind, pitched down, and levels into a street canyon.
- The flight: a seeded city (`seed`) of `block`-unit blocks with `road`-wide streets. Buildings sit only inside blocks
  and are removed wherever they'd come within 7 units of the path. Facades get procedural windows in a shader (crisp
  at any height). The ground is lit gold, with lamps, fog, a sky gradient and bloom. The path runs straight down
  avenues joined by `turn`-radius arcs at the intersections, at constant `speed` along the arc length and at
  `altitude` (below the roofs). The camera aims at the average of the path 25–85 units ahead and banks by the
  curvature smoothed over ±60 units, capped at 4°. **Keep turns wide:** a 30-unit radius at this speed swung the view
  90° in 0.4 s and was nauseating; 60 takes about 1.3 s.
- **On every beat** (`beat.t0 + n * period`, the "hits" from `tools/onsets.py`): the street lines flash, the windows
  brighten, and light pulses race ahead down the street (two on even beats). From `climb` the camera rises 420 units
  and looks down.
- Grading that worked: ACES at exposure 0.8, fog `#0c0a12` (exp2 0.0016), bloom 0.5 / 0.4 / threshold 0.55, about a
  third of the windows lit, dimly. A bloom threshold of 0.18 turned the night into milky beige.
- Deterministic (the same frame twice: max difference 0), but slow: a 50 s trailer took about 6 minutes on an
  integrated GPU.

## Tips
- Titles add emphasis; the subtitles already carry every word. Pick the phrase the sentence turns on.
- Titles in a chapter replace each other: give each one an `out` at the next one's anchor.
- A focus pull to .32 with a title at `depth: .32` makes a reveal. A pull to 1 blurs the subject for an inward moment.
- Keep silhouettes simple and few. One figure facing the sea says more than a crowd.
- Rendering is a bit slower than kinetic, because each section first paints its layers (sharp and blurred) once.
