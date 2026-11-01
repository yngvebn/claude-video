"""Compose music with ElevenLabs from a composition plan, cached by plan, so a re-run costs nothing.

    uv run python tools/eleven_music.py <plan.json> <out.mp3> <cache_dir>

plan.json: { "model_id": "music_v2_5", "chunks": [ { "text": "[Cold Open]", "duration_ms": 3100,
  "positive_styles": [...], "negative_styles": [...], "context_adherence": "high" }, ... ] }
story.mjs `musicgen` writes it from project.json "musicgen", with each chunk's duration taken from the sections it
covers, so the music fits the cut exactly (music_v2 and v2_5 always enforce chunk durations). The paid result is kept
in .cache/music/<hash>.mp3. Key: ELEVENLABS_API_KEY (needs music access), from the environment only.
"""
import hashlib
import json
import os
import shutil
import sys
import urllib.error
import urllib.request
from pathlib import Path


def main(plan_path, out, cache):
    plan = json.load(open(plan_path, encoding='utf8'))
    body = {"composition_plan": {"chunks": plan["chunks"]}, "model_id": plan.get("model_id", "music_v2_5")}
    if plan.get("seed") is not None:
        body["seed"] = plan["seed"]
    cache, out = Path(cache), Path(out)
    cache.mkdir(parents=True, exist_ok=True)
    hit = cache / (hashlib.sha1(json.dumps(body, sort_keys=True).encode()).hexdigest()[:12] + ".mp3")
    if hit.exists():
        print(f"{out}: cached ({hit.name}), nothing billed")
    else:
        key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
        if not key:
            raise SystemExit("ELEVENLABS_API_KEY is not set (needed for uncached music).")
        req = urllib.request.Request("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192",
                                     data=json.dumps(body).encode(),
                                     headers={"xi-api-key": key, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                data, headers = r.read(), r.headers
        except urllib.error.HTTPError as e:
            raise SystemExit(f"ElevenLabs {e.code} on music: {e.read()[:400]!r}")
        hit.write_bytes(data)
        cost = {k: v for k, v in headers.items() if 'cost' in k.lower() or 'credit' in k.lower()}
        print(f"{out}: generated ({hit.name}, {len(data) // 1024} KB){', ' + json.dumps(cost) if cost else ''}")
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(hit, out)


if __name__ == "__main__":
    main(*sys.argv[1:4])
