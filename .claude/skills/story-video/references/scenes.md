# Scenes (scenes.js)

Each section is a row of camera **frames**, the world positions the camera flies between (rotating so the target
lands upright). Each frame holds **blocks**: text or set pieces anchored to the narrator's words.
`template/scenes.js` (what `new` gives a kinetic project) is a working starting point.

```js
STORY.bearnaise = {
  bg: 'paper', kicker: '04 · CASE FILE · 31.08.2026',          // bg: a palette name from theme.js
  frames: [
    { at: 0, x: 960, y: 540, r: 0, z: 1 },
    { at: 'bearnaise only', x: 3100, y: 300, r: -.05, z: 1 },   // the camera arrives as he says it
  ],
  blocks: [
    { f: 0, at: 'the big one', txt: 'THE BIG ONE.', size: 310, y: 40, in: 'slam', col: 'red' },
    { f: 1, at: 'only goes in the cart', txt: 'ONLY GOES IN THE CART', font: 'M', size: 62, y: 110, in: 'words' },
    { f: 1, at: 'fourteen people', fx: 'people', n: 14, y: 270, s: 9 },
  ],
};
```

## Anchors
- `'words'`: fires when the narrator starts saying them. Whole words only, searched forward from the previous block.
- `{ w: 'words', end: true }`: fires when he finishes them. `{ w: 'words', dt: .3 }`: offset by `dt` seconds.
- A number is seconds into the section, and `'end'` is the section's end.
- Spelling follows the narration, normalised: "here's" → `heres`, "Fever-Tree" → `fever tree`.
- Any field ending in `At` is an anchor too, e.g. `litAt` becomes the block's `tlit`.
- `out: <anchor>` together with `exit: fade | up | drop | strike` makes a block leave or get struck through.
- `layout` throws on an anchor that isn't in the narration after the previous one.

## Block fields
| Field | Values |
|---|---|
| `f` | frame index |
| `x`, `y` | offset from the frame centre. Keep within ±760, ±420. |
| `txt`, `size` | the text (uppercase reads best in the display font) and its px size. Display 120–340, mono 44–84. |
| `font` | `D` display (default), `M` mono, `MB` mono bold |
| `col` | `fg` (default), `mute`, `acc`, `red`, `green` (tokens of the section's palette), or any CSS colour |
| `in` | `slam` (big hit plus screen shake), `pop`, `up`, `left`, `right`, `fade`, `type` (typewriter), `words` (word by word, synced to speech), `stamp` (rubber stamp box) |
| `rot` | radians, for stamps and tilted words (±0.1) |
| `hl` | highlighter colour token swiped behind a `words` line once it's complete |

## Generic set pieces (`fx`)
| fx | Fields | Use |
|---|---|---|
| `people` | `n`, `s`, `gap`, `lit`, `litAt`, `litCol` | a row of pixel people; `lit` of them light up at `litAt` ("10 of 14 came") |
| `row` | `key`, `n`, `s`, `gap` | n copies of any prop popping in one by one |
| `sprite` | `key`, `s`, `badge` | one bobbing prop, with an optional small `flag` / `check` badge |
| `mark` | `kind: 'check' \| 'cross'`, `s` | a tick or a cross next to a line |
| `receiptCard` | `rows: [[label, value, labelAnchor, valueAnchor]]`, `w` | a receipt with rows printing on cue |
| `scroll` | `w` | a sheet that keeps unrolling off-frame (long rules, terms) |
| `rule` | `w`, `col` | a bar drawn left to right (a threshold, "the bar") |
| `spot` | — | a soft spotlight behind a title |
| `mini` / `claude` | `key`, `s` | a character from engine/minis-ai.js |

Generic props: `person`, `check`, `cross`, `flag`, `cart`, `glass`, `note`. Add more in theme.js `props` as
`{ rows: ['..XX..', ...], pal: C => ({ X: C.acc }) }`, 6–16 px wide, reinterpreting real things as generic pixel art
with no brand marks. Project set pieces go in theme.js `fx` as `name(b, t, C, alpha)`. They can use `FX.row(...)`,
`drawPixels`, `prog`, `E`, `ctx` and `PROPS`.

## Layout that works
- **Frames:** space them at least 2100 px apart horizontally or 1300 px vertically, and tilt them alternately
  (`r` ±0.03–0.05). The camera pulls back mid-flight, so neighbours flash past, and that's part of the look.
- **Frame count:** one frame per sentence or idea, so the camera moves every 3–8 s. A section with 6 sentences gets
  about 6 frames.
- **Per frame:** one big line (a `slam` or `words` in display) plus one or two small supporting lines (mono, `mute`).
  The big word is the one the narrator leans on.
- **Set pieces carry the argument:** people rows for headcounts, rows of props for quantities, a strike-through for
  corrections, stamps for verdicts. At least one per section.
- **Keep stamps, checks and props off the text** they comment on: place them beside it (x ±600–800) or below.
- **Alternate section backgrounds** (dark / paper / accent) so each wipe reads as a new chapter.
- **The kicker** (top left) names the section, like a slide header. Keep it short and uppercase.
- **Ending:** make the last section `keep: true` and put a final card or stamp at `{ w: 'last words', dt: … }`, so it
  stays up for the final hold.
