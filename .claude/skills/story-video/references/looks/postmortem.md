# Look: incident post-mortem (`"look": "postmortem"`)

Each section is one incident dashboard on a dark monitoring UI. Panels appear on their anchor words and then stay, like
an engineer pulling up evidence. The status pill in the top bar changes on the decisive words, graphs advance live with
the narration, alerts fire and resolve, and the narration types into a transcript bar at the bottom. Style guide:
`../styles/postmortem.md`. Starter: `node story.mjs new <p> --look postmortem`.

`new --look postmortem` gives the palette (`ops`) and fonts (Inter, JetBrains Mono).

## Scene fields
```js
STORY.hansa = { bg: 'ops', title: 'INC-0831 · Hansa policy false positive', clock: '14:02', rate: 1,
  status: { state: 'MONITORING', sev: 'green' }, transcript: true, blocks: [...] };
```
- `title` goes in the top bar after "Incidents /".
- `clock` and `rate` drive the dashboard clock: the start time, and minutes per narration second. The graph axes,
  log timestamps and top-bar time all follow it.
- `status` is the pill before any `status` block lands. `transcript: false` hides the transcript bar.

## Grid
`pos: [x, y, w, h]` on **24 columns × 64 px rows**, starting under the top bar. Rows 0–13 fit above the transcript bar.

## Blocks
Severity tokens are `green`, `yellow`, `orange`, `red`, `blue` (or `acc`), `purple` and `mute`. Every `at` / `*At`,
including inside `points`, `events`, `lines` and `items`, is an anchor.

| kind | Fields | On screen |
|---|---|---|
| `status` | `state`, `sev` | changes the top-bar pill (with a pulse) from `at` on; no `pos` |
| `graph` | `title`, `pos`, `unit`, `yMax`, `threshold: { v, label }`, `legend`, `series: [{ name, color, base, step, points: [{ at, v }] }]` | a time series over the section. The line advances with "now"; values are `base` until the first point, then linear (or stepped with `step: true`) between anchored points |
| `stat` | `title`, `pos`, `value`, `from`, `dec`, `unit`, `sev`, `to`, `toAt`, `toSev` | one big number counting up, coloured by `sev`; changes to `to` at `toAt` |
| `alert` | `pos` (a 1-row strip), `text`, `resolveAt`, `resolvedText` | a red FIRING banner with a pulsing dot, turning green RESOLVED at `resolveAt` |
| `timeline` | `title`, `pos`, `events: [{ at, time, text, sev }]` | events on a vertical line, each appearing on its anchor |
| `logs` | `title`, `pos`, `lines: [{ at, level, text }]` | streaming log lines with clock timestamps; `level` is ERROR, WARN, INFO or DEBUG |
| `callout` | `pos`, `title` ('ROOT CAUSE'), `text`, `size`, `color` (orange) | the highlighted root-cause card; use `color: 'red'` and `title: 'LESSON'` for the moral |
| `checklist` | `title`, `pos`, `items: [{ at, text, doneAt }]` | action items appearing on `at`, ticking green on `doneAt` |

## Tips
- Start each dashboard nearly empty; panels appear as the story reaches them.
- Blocks must be listed in narration order (anchors search forward). A block whose anchor comes earlier than the one
  before it fails `layout` with a clear message.
- The status pill tells the story in one word: MONITORING → FIRING → INVESTIGATING → RESOLVED, or DEGRADED → MITIGATING.
- Keep panel text terse and technical (`violation raised id=8812`); the transcript carries the plain-language telling.
