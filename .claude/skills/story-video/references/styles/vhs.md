# Style: 90s corporate training video

*(story-video original · no built-in look yet: author as a custom look)*

A lovingly bad early-90s corporate training tape: VHS tracking noise, chunky beveled titles, beige gradients, clip-art
icons, a laser-pointer dot, and the unshakeable confidence of a production that thought this looked futuristic. It's
pure comedy for the right script, such as a mock-serious rulebook or "workplace safety" for bearnaise.

## Signature
| Item | On screen |
|---|---|
| Tape | 4:3 safe area inside 16:9 (dark pillarbox), chroma bleed, scanlines, a wobbling horizontal tracking band now and then, occasional colour-fringe glitches on cuts |
| OSD | "PLAY ▶" and a running timecode in the corner in a blocky VCR font at the start; "REC ●" on a flashback |
| Titles | Extruded, beveled chrome or gold text flying in and spinning to a stop, with a lens-flare glint |
| Backgrounds | Purple-to-teal or beige-to-brown gradients, gridded floors fading to a horizon, floating geometric shapes |
| Graphics | Clip-art style icons (a lightbulb, a handshake, a floppy disk), bullet points with big square markers, a slowly rotating 3D pie chart |
| Pointer | A red laser-pointer dot circling the important bit |
| Lower thirds | Semi-transparent blue bars with white Arial-bold names: "ALEX · CATERING COMPLIANCE" |
| Palette | Saturated early-CG colours, cyan, magenta, gold, never quite in gamut |

## Direction
Play it completely straight. Each chapter is a "module" with a numbered title card ("MODULE 2: THE BEARNAISE"). Bullet
points appear one at a time with a whoosh, key terms get the pointer, numbers get a spinning 3D chart. Cut between
cards with a tape glitch. End with a "REMEMBER:" card and a rolling list of credits for roles that don't exist. The
music is a cheesy synth-pop library track, and the sound design is whooshes and a cash-register ding.

## Narration
Bullets and cards land on their words, and the pointer circles on "this" or "here". Captions in a yellow closed-caption
box are optional for the full effect, placed in the classic black-box style.

## Block ideas for a look
`module { n, title, at }`, `bullet { txt, at }`, `chart3d { slices, at }`, `pointer { x, y, at }`,
`lowerthird { name, role, at }`, `glitch { at }`, `remember { txt, at }`.
