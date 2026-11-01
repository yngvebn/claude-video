'use strict';
// The look. Start from these palettes and replace them with the source's real colours (site CSS, brand page, deck).
// palettes: one per section background (scenes.js `bg`); tokens every palette needs: bg fg mute acc red green card cardInk.
// fonts: files in assets/fonts for D (display), M (mono), MB (mono bold).
// props: pixel sprites for fx: 'sprite' / 'row'; fx: this project's own set pieces (engine helpers are globals).
var THEME_STORY = {
  palettes: {
    paper: { bg: '#f3f1e6', fg: '#262b20', mute: '#6b7061', acc: '#b8842c', red: '#af4433', green: '#3f7d4a', card: '#e9e6d6', cardInk: '#262b20', fiber: '#7a6a4a', vignette: 'rgba(60,45,20,.18)' },
    dark: { bg: '#1d221b', fg: '#f3f1e6', mute: '#9aa08c', acc: '#e3ad57', red: '#e07a63', green: '#6fbd79', card: '#f3f1e6', cardInk: '#262b20', fiber: '#9aa3b5', vignette: 'rgba(0,0,0,.45)' },
    amber: { bg: '#b8842c', fg: '#1d221b', mute: '#4a3510', acc: '#f3f1e6', red: '#7a1f14', green: '#1f4a28', card: '#f3f1e6', cardInk: '#262b20', fiber: '#3a2a0d', vignette: 'rgba(40,25,0,.28)' },
  },
  fonts: { D: 'BigShoulders-ExtraBold.woff2', M: 'PlexMono-Regular.woff2', MB: 'PlexMono-SemiBold.woff2' },
  props: {},   // pixel sprites: { name: { rows: [...], pal: C => ({ char: colour }) } }
  fx: {},      // this project's own set pieces: name(b, t, C, alpha) { ... }
};
