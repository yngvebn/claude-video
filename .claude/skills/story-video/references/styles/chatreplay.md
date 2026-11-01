# Style: chat replay

*(story-video original · no built-in look yet: author as a custom look)*

The story replayed as a team chat thread: messages, reactions, threads and typing indicators appear as the narrator
tells what happened. It's ideal for team stories, where half the comedy is in who said what, and a shared shopping-cart saga
would suit it perfectly. It reads like Slack or Teams without copying either: generic chrome, the team's own names.

## Signature
| Item | On screen |
|---|---|
| Window | A chat client: a narrow channel list on the left (`# general`, `# lunch`, `# shopping-cart`), a channel header with its topic, a message list, a composer at the bottom |
| Messages | Avatar (initials in a coloured circle, or a pixel mini for bots), name in bold, timestamp in muted grey, message text; consecutive messages from the same person group together |
| Motion | Each message slides up from the composer and the list scrolls; "Name is typing…" with three bouncing dots before messages that land on an anchor |
| Reactions | Emoji-like reaction chips (drawn as simple glyph icons, since emoji fonts vary) popping in under a message with counts ticking up |
| Threads | "3 replies" link expanding into a side panel |
| Bot | A distinct bot badge (APP) for automated messages: "🛒 Cart updated" drawn as an icon |
| Emphasis | A message gets a yellow highlight band or a pinned banner when it's the punchline |
| Palette | Light or dark client theme; one accent colour for links and the active channel |

## Direction
Pick the channel the story happened in. Let the narration be the commentary on top of the replay: the narrator says
"so naturally, I flagged it", and the bot's red flag message lands. Keep messages short and in character, using the
team's real names only with their consent. Reactions carry the audience's reaction. Pin the lesson at the end. The
camera stays put; the list scrolls and a new thread slides in to change chapter.

## Narration
Anchor each message and reaction to the narrator's words. "Typing…" starts about 0.8 s before the anchor so the
message lands on it. No captions: messages are the text on screen.

## Block ideas for a look
`channel { name, topic }`, `msg { from, text, at, bot }`, `react { to, icon, n, at }`, `typing { from, at }`,
`thread { to, replies[] }`, `pin { to, at }`.
