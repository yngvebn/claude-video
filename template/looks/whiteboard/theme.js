'use strict';
// Whiteboard look (engine/looks/whiteboard.js). Ink palette from the style guide
// (.claude/skills/story-video/references/styles/whiteboard.md). Tokens: bg (the board) fg (black ink: headlines, labels)
// blue (new / updated values) red (strikes, alert circles) green (check) acc (orange: the one accent) gray (old bars)
// mute (citation) sleeve / skin (the hand). One palette: the whole video is one board.
var THEME_STORY = {
  palettes: {
    board: { bg: '#F7F7F5', fg: '#24262E', blue: '#1B4DC6', red: '#D5382B', green: '#158A45', acc: '#DE7426', gray: '#99A2AB',
             mute: '#8B9098', sleeve: '#2F4A77', skin: '#F0C3A2', card: '#ffffff', cardInk: '#24262E' },
  },
  fonts: { HAND: 'Kalam-Bold.woff2', HANDR: 'Kalam-Regular.woff2', SCRIPT: 'Caveat-Medium.woff2', MONO: 'PlexMono-Regular.woff2' },
};
