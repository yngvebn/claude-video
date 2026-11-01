"""Kokoro narration: one cached wav per spoken phrase plus a duration manifest.

    uv run --python 3.12 --with kokoro-onnx --with soundfile python tools/speak.py <script.json> <out_dir>

script.json (written by story.mjs): { "kokoro": { "voice": "bm_george", "speed": 1.0, "slow": 0.9 },
  "say": {"Siobhan": "Shiv-awn", ...},
    "slides": [ { "key": "open", "sentences": ["Fair warning: | the highlight reel is a grocery receipt. //", ...] } ] }
Delivery marks: ' | ' splits phrases, a leading '~' reads a phrase at "slow" speed, trailing '/' marks are pauses
(handled by story.mjs), [tone tags] are for ElevenLabs and dropped here. "say" respells words for the English G2P only.
Writes out/<hash>.wav per phrase (reused when the text is unchanged) and out/manifest.json:
  [ { "key": "open", "sentences": [ [ {"wav": "ab12.wav", "dur": 1.23}, ... ], ... ] } ]
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

here = Path(__file__).parent
spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf8"))
out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
cfg = spec["kokoro"]
k = Kokoro(str(here / "models" / "kokoro-v1.0.onnx"), str(here / "models" / "voices-v1.0.bin"))
say = sorted(spec.get("say", {}).items(), key=lambda kv: -len(kv[0]))  # longest first: "Siobhan's" before "Siobhan"


def respell(s):
    for word, sub in say:
        s = re.sub(rf"(?<![\w-]){re.escape(word)}(?![\w'-])", sub, s, flags=re.IGNORECASE)
    return s


manifest, made = [], 0
for slide in spec["slides"]:
    sentences = []
    for raw in slide["sentences"]:
        phrases = []
        for part in raw.rstrip("/ ").split("|"):
            part = part.strip()
            slow = part.startswith("~")
            text = respell(re.sub(r"\[[^\]]*\]\s*", "", part.lstrip("~")).strip())
            speed = cfg["slow"] if slow else cfg["speed"]
            name = hashlib.sha1(f"{cfg['voice']}|{speed}|{text}".encode()).hexdigest()[:12] + ".wav"
            f = out / name
            if not f.exists():
                audio, sr = k.create(text, voice=cfg["voice"], speed=speed, lang="en-us")
                sf.write(f, audio, sr); made += 1
            info = sf.info(f)
            phrases.append({"wav": name, "dur": round(info.frames / info.samplerate, 3)})
        sentences.append(phrases)
    manifest.append({"key": slide["key"], "sentences": sentences})
(out / "manifest.json").write_text(json.dumps(manifest, indent=1))
total = sum(p["dur"] for s in manifest for sen in s["sentences"] for p in sen)
print(f"{made} phrases synthesized, {total:.1f} s of speech")
