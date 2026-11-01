# Style: incident post-mortem

*(story-video original · built-in look `postmortem`)*

The story told as an incident review on a dark monitoring dashboard, in the visual language every engineer knows from
Grafana and on-call. Each chapter is one dashboard: panels appear as the narrator gets to them, graphs advance live with
the telling, alerts fire and resolve, and the root cause gets its own highlighted card. It's deadpan and technical,
which makes it very funny when the "incident" is a sauce shortage.

## Signature
| Item | On screen |
|---|---|
| Canvas | Near-black dashboard (`#111217`), panels `#181b1f` with 1 px `#2c3235` borders and small radii, on a 24-column grid |
| Top bar | Product mark, breadcrumb "Incidents / INC-…", the incident title, a **status pill** (MONITORING, FIRING, INVESTIGATING, MITIGATING, DEGRADED, RESOLVED) coloured by severity, the dashboard clock, a pulsing LIVE dot |
| Palette | Severity colours only: green `#73bf69`, yellow `#fade2a`, orange `#ff9830`, red `#f2495c`, blue `#5794f2`, purple `#b877d9`; text `#d8d9da`, muted `#8e8e8e` |
| Type | Inter for UI text; JetBrains Mono for numbers, timestamps, logs and labels |
| Graphs | Time series whose line advances in real time, with a gradient fill under it, a live head dot, a dashed red threshold, gridlines, clock ticks and a legend with current values |
| Stats | Big single numbers coloured by severity, counting up; can change value (8 → 16) |
| Alert | A banner with a pulsing dot: red FIRING, then green RESOLVED |
| Timeline | Events with coloured dots on a vertical line, each with a timestamp |
| Logs | Monospace lines with timestamps and coloured levels (ERROR, WARN, INFO), streaming in |
| Root cause | A highlighted card with an orange (or red, for "lesson") edge and glow |
| Action items | Checkboxes that tick green one by one |
| Narration | A transcript bar at the bottom, typed in mono with a blinking cursor |

## Direction
Open each chapter on a dashboard that starts nearly empty, and let panels appear as the story reaches them, like an
engineer pulling up evidence. The status pill changes on the decisive words ("flagged… as a violation" → FIRING). Graphs
tell the shape of the incident: a step up across the threshold when things break, a slide down when a resource runs
out, a step back to baseline when it's fixed. Use one callout per chapter for the root cause, in plain words. End on
action items ticking off and the pill going green. Keep it dry and precise; the humour comes from treating the story
with full incident-review seriousness. For sound, soft UI blips on alerts and a single pager tone at the first FIRING,
over a low ambient bed.

## Narration
Everything is anchored: panel entrances, status changes, graph points (`points: [{ at, v }]`), log lines, timeline
events, check-offs. The transcript bar shows the narration as it's spoken, so panel text can be terse and technical.
