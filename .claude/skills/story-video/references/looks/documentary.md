# Look: documentary case file (`"look": "documentary"`)

Near-black stage with stars and embers. Each section is a **chapter**: it opens with a card (turning network sphere,
"CHAPTER N", serif title), carries a case-file tag top-left and a citation bottom-left, and cross-dissolves into the
next chapter. **The narration builds up as captions** at the bottom, clause by clause, with no authoring needed. Blocks
add the evidence. Style guide: `../styles/documentary.md`. Starter: `node story.mjs new <p> --look documentary`.

`new --look documentary` gives the palette (`case`) and fonts (Playfair Display, Work Sans, IBM Plex Mono).

## Scene fields
```js
STORY.hansa = { bg: 'case', title: 'The Hansa incident', chapter: 1, cardHold: 2.8, captions: true, source: '...', blocks: [...] };
```
- `title` shows on the chapter card and in the tag. Without it, there's no card and the tag uses `kicker`.
- `chapter` is the number (default: section index + 1); `false` hides it.
- `cardHold` is how many seconds the card holds before fading; keep the first block's anchor after it.
- `captions: false` turns captions off for the chapter. They also pause automatically while a `witness` is up.
- `source` overrides the citation line (default: `project.json source`).

## Blocks
Coordinates are relative to the frame centre. Every block settles in on its `at` anchor and stays until its `out`
anchor, **or until a later block with `clear: true` lands**. That's the normal way to move from one piece of evidence
to the next.

| kind | Fields | On screen |
|---|---|---|
| `headline` | `txt`, `size` (130), `x`, `y`, `col`, `italic`, `font: 'mono'`, `sub`, `subCol`, `count`, `countFrom`, `dec`, `countDur` | a big serif line; with `count`, `txt` is a template (`'{n} people'`) that counts up |
| `note` | `txt`, `size`, `y`, `font: 'serif'` (italic) or mono, `col`, `track` | a small line: dates, codes, a one-word verdict |
| `card` | `title`, `rows: [{ label, value, at?, strikeAt?, to?, toAt? }]`, `stamp`, `stampAt`, `w`, `x`, `y`, `tilt`, `toCol` | an aged-paper evidence card. Rows can appear on their own `at`. `strikeAt` strikes the value in brick red, then an arrow and the `to` value appear (at `toAt`, or right after). `stamp` is a round ink stamp at `stampAt` |
| `bars` | `bars: [{ label, value, accent }]`, `max`, `unit`, `dec`, `title`, `w`, `y` | minimal horizontal bars: dotted gridlines, one `accent` bar in coral, the rest charcoal, lengths and numbers counting up |
| `witness` | `name`, `role`, `quote`, `quoteAt` | a backlit silhouette in a light wedge, labelled "graphic reconstruction", with a lower third. The quote builds word by word **as the narrator says it**, starting at `quoteAt`, so write `quote` as the narration's words |
| `emblem` | `size`, `x`, `y` | the network sphere on its own |

## Tips
- One piece of evidence at a time: put `clear: true` on each new card, chart or headline.
- Keep card values short, about 25 characters for `value` and less when there's a `to`.
- Put the coral accent on the one number the section is about, and red only on corrections.
- Headlines shouldn't repeat the caption word for word. Pick the fact, number or quote the sentence hinges on.
