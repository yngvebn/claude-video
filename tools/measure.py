"""Balance report: how far the music and sound effects sit below the narration, while it speaks and in the gaps.

    uv run --with numpy --with soundfile --with pyloudnorm python tools/measure.py <audio.wav> <placement.json>

Reads the stems tools/mix.py writes next to audio.wav. Targets that worked on a 5-minute narrated video:
music 20-25 LU under the voice while it speaks (loudest 3 s window at least 12 LU under), sfx about 14 LU under.
"""
import os
import json
import sys
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf

mix_path, place_path = Path(sys.argv[1]), Path(sys.argv[2])
place = json.loads(place_path.read_text())
voice, sr = sf.read(mix_path.with_name("stem_voice.wav"))
music, _ = sf.read(mix_path.with_name("stem_music.wav"))
fx, _ = sf.read(mix_path.with_name("stem_fx.wav"))
n = len(voice)
active = np.zeros(n, bool)
for t, wav in place["clips"]:
    i = int(t * sr); d = int(sf.info(wav).duration * sr)
    active[i:i + d] = True
m = pyln.Meter(sr)
v = m.integrated_loudness(voice[active])
w = 3 * sr


def report(name, x, target):
    under = v - m.integrated_loudness(x[active]) if x[active].any() else float("inf")
    wins = [m.integrated_loudness(x[i:i + w]) for i in range(0, n - w, w) if active[i:i + w].mean() > .6 and x[i:i + w].any()]
    worst = v - max(wins) if wins else float("inf")
    gaps = m.integrated_loudness(x[~active]) if x[~active].any() else float("-inf")
    flag = "ok" if under >= target else f"TOO LOUD (want >= {target} LU under)"
    print(f"  {name:6} {under:5.1f} LU under the voice while it speaks, loudest 3 s {worst:5.1f} LU under, gaps {gaps:6.1f} LUFS  [{flag}]")


print(f"balance: voice {v:.1f} LUFS while speaking")
report("music", music, float(os.environ.get("MUSIC_MIN_LU", 18)))   # a trailer wants the orchestra up: project mix.music_min_lu
report("sfx", fx, 12)
