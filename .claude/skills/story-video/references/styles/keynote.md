# Style: keynote stage

*(story-video original · no built-in look yet: author as a custom look, closest built-in: kinetic)*

Product-launch keynote energy with nobody's branding: a black stage, a single idea per beat, enormous type, spotlight
gradients and one hero object per chapter. The narration is the presenter. Everything on screen is the slide behind
them, staged with confidence and air.

## Signature
| Item | On screen |
|---|---|
| Stage | Pure black with a soft radial spotlight that follows the hero element; a subtle floor reflection under objects |
| Type | One huge headline at a time in a heavy geometric sans (Inter Display or similar), tight tracking, often a single word; a light grey subline |
| Reveals | Words fade and rise a few pixels; numbers count up in a gradient fill; the "one more thing" beat gets a pause and a slow push-in |
| Hero object | A product-render-like shape (a card, a device, a bottle) drawn with gradients and a specular highlight, slowly rotating or tilting in 3D-ish perspective |
| Gradients | Vivid two-tone gradients (violet to orange, teal to lime) on hero words and numbers only |
| Comparisons | Two big numbers side by side, the winner in the gradient, the loser in grey |
| Transitions | A black dip between chapters, or the hero object pushing through the camera |
| Palette | Black, white, one grey, one gradient pair per video |

## Direction
Give every chapter one headline and one hero. Say less on screen than the narrator says: a keynote slide is five words
at most. Use the gradient sparingly, on the one number or word that matters, so it stays special. Hold on reveals; the
silence after "Two." is the point. The camera moves are slow push-ins and gentle orbits around the hero object. Music
is a steady, optimistic pulse that drops out for the big reveal.

## Narration
The headline lands on the key word of the sentence. Counts land on the number's word, and the hero object turns on
"introducing" or "meet". No captions: the headline is the caption.

## Block ideas for a look
`headline { txt, gradient, at }`, `sub { txt, at }`, `count { value, unit, at }`, `hero { shape, at, spin }`,
`versus { a, b, winner, at }`, `pause { at, dur }`.
