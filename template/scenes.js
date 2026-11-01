'use strict';
// What appears on screen, and when. Every block is anchored to the narrator's words (engine/anchors.js).
// Schema, set pieces and layout rules: .claude/skills/story-video/references/scenes.md
// A section without an entry here gets an automatic word-by-word placeholder.
var STORY = {};

STORY.intro = {
  bg: 'dark', kicker: 'A NEW STORY',
  frames: [
    { at: 0, x: 960, y: 540, r: 0, z: 1 },
    { at: 'this is a brand new story', x: 3000, y: 1300, r: -.03, z: 1 },
  ],
  blocks: [
    { f: 0, at: 'hello', txt: 'HELLO', size: 360, y: -60, in: 'slam', col: 'acc' },
    { f: 0, at: 'there', txt: 'THERE.', size: 200, y: 200, in: 'slam' },
    { f: 1, at: 'this is a brand new story', txt: 'A BRAND NEW STORY,', size: 200, y: -100, in: 'words' },
    { f: 1, at: 'told one word at a time', txt: 'ONE WORD AT A TIME.', font: 'M', size: 64, y: 110, in: 'words', col: 'mute' },
  ],
};

if (typeof module !== 'undefined') module.exports = { STORY };
