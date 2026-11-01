# Style: paper cut-out

*(story-video original · no built-in look yet: author as a custom look)*

A handmade stop-motion world of layered paper and cardboard: cut-out shapes with torn and scissored edges, real drop
shadows between layers, and deliberately choppy motion at 12 frames per second. It's warm, playful and tactile, and
suits lighter stories, children's-book energy and anything with a journey.

## Signature
| Item | On screen |
|---|---|
| Material | Coloured paper with visible fibre texture, some sheets with a slight curl; a kraft-cardboard backdrop |
| Edges | Slightly irregular cut edges and occasional torn white edges; no perfect vectors |
| Depth | 3–5 stacked layers with soft drop shadows beneath each, offset down and right; the parallax is subtle |
| Motion | **Stepped** at 12 fps (hold each pose for 2–3 frames); tiny random jitter per step, like pieces nudged by hand |
| Characters | Flat cut-out figures with split-pin joints; heads bob, arms swing on pivots |
| Type | Letters cut from paper, or a friendly slab serif on paper strips; words assemble piece by piece |
| Props | Paper sun on a stick, cotton-ball clouds, cardboard buildings with cut windows lit from behind |
| Palette | Muted craft colours: mustard, brick, teal, cream, kraft brown |

## Direction
Build each chapter as a little stage set that assembles on screen: the backdrop slides in, props drop onto it with a
tiny bounce, characters walk on. Keep motion stepped and slightly imperfect; smooth motion breaks the illusion. Use
shadows to sell depth instead of perspective. Transitions are a hand-cranked slide of the whole set sideways, or a
paper curtain. Sound is paper rustles, small wooden clicks and a light ukulele or glockenspiel tune.

## Narration
Characters act out the sentence (walk on, point, shrug) on its key words, and props drop in on the words that name
them. An optional caption strip on a paper banner can be skipped when the scene tells it.

## Block ideas for a look
`set { backdrop, at }`, `prop { shape, x, y, at, drop }`, `actor { shape, from, to, at, pose }`,
`words { txt, at }` (cut-paper letters), `curtain { at }`.
