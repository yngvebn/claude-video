# Look: whiteboard lecture (`"look": "whiteboard"`)

A locked-off whiteboard in an aluminium frame. A hand enters from the bottom-right and **writes and draws everything as
the narrator speaks**: text is written left to right, and lines, circles, strikes and checks are drawn stroke by stroke.
Nothing fades in. Each section opens with a circled numeral and a handwritten headline top-left. The board is never
wiped: earlier sections stay as faint ghosts, and their old headlines are erased. A citation runs bottom-left
(`project.json source`). Style guide: `../styles/whiteboard.md`. Starter: `node story.mjs new <p> --look whiteboard`.

`new --look whiteboard` gives the palette (`board`) and fonts (Kalam, Caveat, IBM Plex Mono).

## Scene fields
```js
STORY.bearnaise = { bg: 'board', title: 'The bearnaise', number: 2, blocks: [...] };
```
`title` is the handwritten headline, and `number` the circled numeral (default: section index + 1).

## Coordinates
**Board pixels from the top-left**, like writing on a real board. The usable area is about x 90–1830, y 230–960; the slug
takes the top 180 px. `y` is the text's vertical centre. Plan rows about 90–110 px apart at size 56–64.

## Blocks
| kind | Fields | Drawn |
|---|---|---|
| `write` | `txt`, `x`, `y`, `size` (60), `col` (fg/blue/red/green/acc/gray/mute), `font` (`hand` bold, `body` regular, `script` cursive), `id`, `dur`, `maxW` | written left to right. The speed follows the anchor words, capped at 3 s. Give it an `id` if other blocks refer to it |
| `underline` | `under: id` (or `x`, `y`, `w`), `col` (acc) | a wavy line under the text |
| `strike` | `of: id`, `col` (red) | a line through the text: the "old value" |
| `circle` | `around: id` (or `x`, `y`, `rx`, `ry`), `col` (red) | a hand-drawn oval around the text: the callout |
| `check` | `after: id` (or `x`, `y`), `size`, `col` (green) | a check mark to the right of the text |
| `arrow` | `from: [x, y]`, `to: [x, y]`, `bend`, `col` | a curved arrow with a head |
| `bars` | `x`, `y` (baseline), `w`, `h`, `max`, `bars: [{ label, value, col }]` | a wavy baseline, then solid bars growing up one by one, values lettered above, labels in script below. The guide's rule: `gray` for before/old, `acc` (orange) for after/new |

## Tips
- The guide's comparison pattern is `write` the old value, `strike` it, then `write` the new value in `blue` on the next row.
- Refer by `id` only to blocks earlier in the same section.
- Sections overlap as ghosts. Reusing the same rows keeps the palimpsest tidy; a full-width chart in one section and
  text in the next can make the ghosts busy.
- The hand needs a moment to travel between strokes (about 0.45 s), so anchors fired within a word or two of each
  other still read, but the hand hops.
