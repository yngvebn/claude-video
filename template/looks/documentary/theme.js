'use strict';
// Documentary case-file look (engine/looks/documentary.js). Palette from the style guide
// (.claude/skills/story-video/references/styles/documentary.md); replace with the source's colours if it has a brand.
// Tokens: bg fg mute acc (coral: the current data point) red (brick: corrections only) card cardInk (evidence paper)
// charcoal (inactive bars) bronze (the network sphere). One palette is enough: every chapter sits on the same black.
var THEME_STORY = {
  palettes: {
    case: { bg: '#050505', fg: '#E8DED2', mute: '#8C857A', acc: '#D07152', red: '#96473C', green: '#7F9C74',
            card: '#D5CAB4', cardInk: '#2B2621', charcoal: '#403D38', bronze: '#B08A5A' },
  },
  fonts: { SERIF: 'PlayfairDisplay-Bold.woff2', SERIFI: 'PlayfairDisplay-BoldItalic.woff2', SANS: 'WorkSans-Medium.woff2',
           MONO: 'PlexMono-Regular.woff2', MONOB: 'PlexMono-SemiBold.woff2' },
};
