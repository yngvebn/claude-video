# Style guides

33 of these visual styles come from [code-video](https://github.com/Changroro/code-video) by Bae-ChangHyun (MIT, see
`LICENSE-code-video`), imported at upstream commit `03da4e3ab149`. Nine more are **story-video originals**, written
narration-first and marked as such in their headers: cinematic, postmortem, codewalk, chatreplay, architecture, keynote,
papercut, vhs and fieldjournal. Each guide is a **Signature** table (palette hex
values, type, the objects that make the look) plus a **Direction** paragraph. They're written for 30-second promos. The
table below says how to use them for a narrated story-video. Mentions of `<skill>/…` refer to upstream files
(reference images, scripts) that aren't bundled here.

Pick a style: `grep '^# Style' .claude/skills/story-video/references/styles/*.md`

| Style | Built-in look | Notes |
|---|---|---|
| (not upstream) kinetic typography | **`kinetic`** | words slam and pop on the narrator's words; `references/scenes.md` |
| documentary.md: documentary case file | **`documentary`** | `references/looks/documentary.md` |
| whiteboard.md: whiteboard lecture | **`whiteboard`** | `references/looks/whiteboard.md` |
| cinematic.md: cinematic film essay *(original)* | **`cinematic`** | `references/looks/cinematic.md` |
| postmortem.md: incident post-mortem *(original)* | **`postmortem`** | `references/looks/postmortem.md` |
| codewalk, chatreplay, architecture, keynote, papercut, vhs, fieldjournal *(originals)* | none yet | narration-first guides with block ideas for a custom look |
| handdrawn.md: hand-drawn + 8-bit minis | none; kinetic with a paper palette gets close | the kit has rough.js `sketch`, `circlePts`, `highlight`, pixel minis |
| thermal.md, terminal.md, transit.md, blueprint.md, arcade.md | none | an early video used code-video's thermal module; a narrated rebuild is a good first custom look |
| all others (news, trailer, detective, museum, storybook, comicbook, splitflap, weather, mathlecture, rpg, sports, infomercial, collage, scrapbook, neon, particles, sand, motion, brand, uimorph, manual, comic, free) | none | author a custom look (`references/looks.md`) |
| beat.md, lyric.md | not a fit | built around a song, not a narrator |

## Turning a promo guide into a narrated look
- **Scenes become sections.** The guide's "opening / steps / numbers / ending" beats map onto the narration's sections.
  Their length comes from the voice, never from fixed seconds.
- **Every reveal lands on an anchor.** "Captions build clause by clause", "the number counts up", "the stamp slams" all
  happen on the narrator's words, via `at: 'words'`.
- **Narration is already on screen, or doesn't need to be.** Caption-heavy styles (documentary, news, trailer) can draw
  `sec.words` directly. Others show key words only.
- **Music and sound.** The guide's score description becomes the Suno prompt for the user. Its sfx cues become `sfx`
  fields on blocks, or `project.json "sfx"`. The balance rules in `references/audio.md` still apply: the voice comes first.
- **The Signature is the checklist.** Before showing the user a clip, compare `qa` stills against every row of the
  guide's Signature table: palette, type, and the signature objects.
