# Style: code walkthrough

*(story-video original · no built-in look yet: author as a custom look)*

A narrated tour through code in a modern editor: the camera sits on an IDE window while lines are typed, highlighted,
folded, diffed and run as the narrator explains them. It's the dev-tooling successor to upstream's CRT terminal: a
real editor instead of a retro screen.

## Signature
| Item | On screen |
|---|---|
| Window | A dark editor (One Dark or GitHub Dark tones): tab bar with file names, a line-number gutter, a minimap strip, a status bar with branch and language |
| Code | Syntax-highlighted monospace (JetBrains Mono); lines type in at a readable pace, or appear whole and get a **highlight band** |
| Focus | Everything but the lines being discussed dims to 35%; the camera eases to the active region and zooms slightly |
| Diffs | Red removed lines slide out, green added lines slide in, with `+`/`−` markers in the gutter |
| Cursor | A blinking caret and multi-cursor edits for renames |
| Hover | Tooltip cards (type signatures, docs) pop beside a symbol |
| Terminal | A split pane at the bottom: a command typed with a prompt, output streaming, a green test tick or a red stack trace |
| Callouts | Small handwritten-style arrows or numbered badges in the margin for "step 1, 2, 3" |

## Direction
Show one file at a time, with the active function filling most of the window. Walk top to bottom as the narration
does. When the narrator names a line, highlight it; when they change it, show the diff. Keep code short and real, with
6–20 lines on screen. Run it at the end of each chapter in the terminal pane: a failing test before the fix, a passing
one after. Use the status bar for small jokes (branch `fix/bearnaise-math`). The camera moves are subtle zooms and
pans, no flying.

## Narration
Anchor highlights to the words that name the code ("this guard clause"), type-ins to "we add…", terminal runs to "and
now it passes". There's no caption bar: the code is the text on screen, so narration doesn't need repeating.

## Block ideas for a look
`file { name, lang, code }`, `type { lines, at }`, `highlight { lines, at, out }`, `diff { remove, add, at }`,
`hover { line, col, text, at }`, `run { cmd, output, ok, at }`, `badge { line, n, at }`.
