'use strict';
// Incident post-mortem look (engine/looks/postmortem.js). Guide: .claude/skills/story-video/references/styles/postmortem.md.
// A dark monitoring-dashboard palette. Severity tokens for panels, pills and series: green yellow orange red, plus
// acc/blue and purple. bar: the top and transcript bars; panel / border: the panel surface.
var THEME_STORY = {
  palettes: {
    ops: { bg: '#111217', bar: '#0b0c0f', panel: '#181b1f', border: '#2c3235', fg: '#d8d9da', mute: '#8e8e8e',
           acc: '#5794f2', blue: '#5794f2', red: '#f2495c', green: '#73bf69', yellow: '#fade2a', orange: '#ff9830', purple: '#b877d9',
           card: '#181b1f', cardInk: '#d8d9da' },
  },
  fonts: { SANS: 'Inter-Regular.woff2', SANSB: 'Inter-SemiBold.woff2', MONO: 'JetBrainsMono-Regular.woff2', MONOB: 'JetBrainsMono-Bold.woff2' },
};
