'use strict';
// A custom look: this file draws the whole video. `node story.mjs new <p> --look custom` copies it to projects/<p>/look.js.
// Contract and helpers: .claude/skills/story-video/references/looks.md. Style guides to build from:
// .claude/skills/story-video/references/styles/*.md. Start from engine/looks/<closest>.js when a guide is close to one.
// Rules: draw(sec, t) must paint the same pixels for the same t (no Math.random: use the kit's rnd(seed)).

runLook({
  // one whole frame of section `sec`, t seconds into it
  draw(sec, t) {
    const C = sec.C;
    ctx.drawImage(BG[sec.bg], 0, 0);                              // the palette's textured background
    const s = activeSentence(sec, t);                             // the sentence being spoken
    if (s) text(s.text, W / 2, H / 2, { font: 'DISP', size: 72, color: C.fg, maxW: W - 240, jit: false });
    for (const b of sec.blocks) if (t >= b.t0)                    // scenes.js blocks, anchored to the narration
      text(b.txt || '', W / 2 + (b.x || 0), H / 2 + (b.y ?? 160), { font: 'MONO', size: 40, color: C.acc, alpha: prog(t, b.t0, b.t0 + .4), jit: false });
  },
  // a section without a scenes.js entry: nothing but the narration above
  fallback: () => ({ bg: Object.keys(THEME_STORY.palettes)[0], blocks: [] }),
});
