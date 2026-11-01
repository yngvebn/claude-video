# Style: architecture sketch

*(story-video original · no built-in look yet: author as a custom look, closest built-in: whiteboard)*

A system explained as a living diagram: boxes, databases and queues draw on as they're named, connections draw between
them, packets travel along the connections to show a request flowing through, and a failing component turns red and
cracks. It works for "how our system works" and "what happened when it broke".

## Signature
| Item | On screen |
|---|---|
| Canvas | Blueprint-dark (`#0f1a2b`) or clean white with a faint dot grid |
| Nodes | Rounded boxes for services, cylinders for databases, stacked sheets for queues, a cloud for third parties, a person icon for users; each with a mono label and a small role caption |
| Edges | Orthogonal or gently curved connectors that **draw on** from source to target, with arrowheads and protocol labels (HTTP, gRPC, events) |
| Traffic | Small glowing packets travelling along edges at request time; colour by type; a queue fills up visibly |
| Failure | A node flashes red, gets a crack or X, its edges go dashed and grey; retries bounce back along an edge |
| Zones | Dashed group rectangles for boundaries (VPC, team, cloud region), labelled in the corner |
| Camera | Starts wide, eases in on the part being discussed, pulls back to the whole system at chapter ends |
| Legend | A small key bottom-right for node shapes and packet colours |

## Direction
Build the diagram up in the order the narrator explains it, left to right along the request path. Never show the whole
system before it's been introduced. Animate one request end to end early on, so the audience learns the flow; later
chapters change it (a slow dependency, a failing database) and show the consequence in the traffic. Keep labels
short, in the system's real names. Colours carry meaning only: healthy, degraded, failing, and one accent for the
request being followed.

## Narration
Nodes appear on the words that name them, edges on "calls" and "talks to", packets on "a request comes in", and
failures on the failure words. A small caption strip is optional, since the diagram labels carry most of the text.

## Block ideas for a look
`node { id, kind, label, x, y, at }`, `edge { from, to, label, at }`, `flow { path: [ids], at, color }`,
`fail { id, at }`, `zone { ids, label, at }`, `focus { ids, at }`.
