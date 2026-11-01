'use strict';
// The narration: one entry per section, read phrase by phrase by the voice engine (project.json voice.engine).
// Delivery marks: ' | ' a breath between phrases, a leading '~' reads a phrase slower,
// a trailing ' //' or ' ///' holds a longer pause after the sentence, [tags] set the ElevenLabs v4 delivery
// (e.g. [deadpan], [warmly]; dropped for Kokoro, the screen and the anchors). keep: true holds the last frame at the end.
// Guide: .claude/skills/story-video/references/script.md
var SECTIONS = [
  { key: 'intro', say: [
    "[warmly] Hello there. //",
    "This is a brand new story, | told one word at a time. ///"] },
  { key: 'point', keep: true, say: [
    "Every section gets its own scene. //",
    "~[dry] Until you write one, | you get this placeholder. ///"] },
];

// words the English G2P mangles, respelled for Kokoro only (on-screen text is unaffected)
var SAY = {};

if (typeof module !== 'undefined') module.exports = { SECTIONS, SAY };
