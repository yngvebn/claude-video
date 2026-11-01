'use strict';
// Cinematic film-essay look (engine/looks/cinematic.js). Guide: .claude/skills/story-video/references/styles/cinematic.md.
// The picture is graded by each scene's `scape.time` (dusk, night, dawn, day); the palette only colours type and accents.
var THEME_STORY = {
  palettes: {
    film: { bg: '#000000', fg: '#efe6d8', mute: '#9a917f', acc: '#d9a066', red: '#c0563f', green: '#8fae8b', card: '#1a1a1a', cardInk: '#efe6d8' },
  },
  fonts: { CINE: 'Cormorant-Medium.woff2', CINEL: 'Cormorant-Light.woff2', CINEI: 'Cormorant-MediumItalic.woff2', SANS: 'WorkSans-Medium.woff2' },
};
