"""Generate a sound effect with ElevenLabs (text to sound effects), cached by prompt, so a re-run costs nothing.

    uv run python tools/eleven_sfx.py "<prompt>" <out.wav> <cache_dir> [--dur 3.0] [--influence 0.5]

Normally run through story.mjs:  node story.mjs <project> sfxgen "<prompt>" --as <name> [--dur 3] [--influence 0.5]
which writes projects/<p>/assets/sfx/<name>.wav. The paid result is kept in .cache/sfx/<hash>.mp3; the wav is
decoded from it. Key: ELEVENLABS_API_KEY (needs "Sound effects"), from the environment only.
"""
import hashlib
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path


def opt(args, name, default=None):
    return args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else default


def main(argv):
    if len(argv) < 3:
        raise SystemExit(__doc__)
    prompt, out, cache = argv[0], Path(argv[1]), Path(argv[2])
    body = {"text": prompt, "model_id": "eleven_text_to_sound_v2",
            "prompt_influence": float(opt(argv, "--influence", "0.5"))}
    if opt(argv, "--dur"):
        body["duration_seconds"] = float(opt(argv, "--dur"))
    cache.mkdir(parents=True, exist_ok=True)
    hit = cache / (hashlib.sha1(json.dumps(body, sort_keys=True).encode()).hexdigest()[:12] + ".mp3")
    if hit.exists():
        print(f"{out}: cached ({hit.name}), 0 characters")
    else:
        key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
        if not key:
            raise SystemExit("ELEVENLABS_API_KEY is not set (needed for uncached sound effects).")
        req = urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192",
                                     data=json.dumps(body).encode(),
                                     headers={"xi-api-key": key, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                data, cost = r.read(), r.headers.get("character-cost")
        except urllib.error.HTTPError as e:
            raise SystemExit(f"ElevenLabs {e.code} on sound-generation: {e.read()[:300]!r}")
        hit.write_bytes(data)
        print(f"{out}: generated ({hit.name}){', billed ' + cost if cost else ''}")
    out.parent.mkdir(parents=True, exist_ok=True)
    # decode to 48 kHz wav; mp3's encoder delay is trimmed by ffmpeg's decoder (LAME gapless info)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(hit), "-ar", "48000", "-ac", "2", str(out)], check=True)


if __name__ == "__main__":
    main(sys.argv[1:])
