"""Lay the narration phrases on the timeline and duck the music/effects bed under the voice.

    uv run --with numpy --with scipy --with soundfile --with pyloudnorm python tools/mix.py fx.wav placement.json audio.wav [music.mp3]

fx.wav comes from tools/sfx.py (slams, stamps, whooshes); placement.json from story.mjs.
Balance comes from the project's mix settings via env: MUSIC_LU, DUCK_DB, FX_LU (story.mjs sets them).
music (optional) is level-matched by measurement: MUSIC_LU below the narration's integrated loudness,
then ducked another DUCK_DB while the narrator talks. render.mjs normalises the final mix to -14 LUFS.
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.signal import resample_poly

MUSIC_LU = float(os.environ.get("MUSIC_LU", -7))    # music bed vs. narration, in pauses and between slips
VOICE_CREST = float(os.environ.get("VOICE_CREST") or 0)   # 0: off
MUSIC_CREST = float(os.environ.get("MUSIC_CREST") or 0)   # 0: off
DUCK_DB = float(os.environ.get("DUCK_DB", 12))      # extra cut under speech -> bed sits ~22 LU below the voice
FX_LU = float(os.environ.get("FX_LU", -13.5))       # sfx (slams, stamps, pops) land on words: set relative to the voice (~14 LU under it while it speaks)
fx_path, place_path, out_path = sys.argv[1:4]
music_path = sys.argv[4] if len(sys.argv) > 4 else None
fx, sr = sf.read(fx_path, always_2d=True)
place = json.loads(Path(place_path).read_text())
n = max(len(fx), int(place["dur"] * sr))
fx = np.pad(fx, ((0, n - len(fx)), (0, 0)))

voice = np.zeros(n)
active = np.zeros(n)
for t, wav in place["clips"]:
    a, vsr = sf.read(wav if "/" in wav else Path(place_path).parent / "out" / wav)
    if a.ndim > 1:
        a = a.mean(axis=1)
    if vsr != sr:
        a = resample_poly(a, sr, vsr)
    i = int(t * sr)
    a = a[: n - i]
    voice[i:i + len(a)] += a
    active[i:i + len(a)] = 1

# ducking: 0.3 s attack and 0.8 s release so the bed breathes back up in the pauses
def smooth(x, w):
    """centred moving average in O(n) via a cumulative sum"""
    c = np.concatenate(([0.0], np.cumsum(x)))
    lo = np.clip(np.arange(len(x)) - w // 2, 0, len(x)); hi = np.clip(lo + w, 0, len(x))
    return (c[hi] - c[lo]) / w


att, rel = int(.3 * sr), int(.8 * sr)
env = np.maximum(smooth(active, att), smooth(active, rel))
duck = 10 ** (-DUCK_DB / 20)
gain = 1 - (1 - duck) * np.clip(env, 0, 1)

meter = pyln.Meter(sr)
v_lufs = meter.integrated_loudness(voice[active > 0]) if active.any() else -21.0  # speech only; no voice (engine none): a nominal narrator level


def limit(x, ceiling):
    """peak limiter: 5 ms lookahead, 80 ms release, so only the consonant peaks above `ceiling` come down"""
    blk = int(sr * .001)
    nb = -(-len(x) // blk)
    ax = np.abs(x) if x.ndim == 1 else np.abs(x).max(1)   # mono voice or a stereo bed
    pk = np.pad(ax, (0, nb * blk - len(ax))).reshape(nb, blk).max(1)
    want = np.minimum(1, ceiling / np.maximum(pk, 1e-9))
    look = 5
    want = np.array([want[max(0, i - 1):i + look].min() for i in range(nb)])   # start reducing just before a peak
    g, rel = np.empty(nb), np.exp(-1 / 80)
    cur = 1.0
    for i, w in enumerate(want):
        cur = w if w < cur else w - (w - cur) * rel
        g[i] = cur
    gg = np.interp(np.arange(len(x)), np.arange(nb) * blk + blk // 2, g)
    return x * (gg if x.ndim == 1 else gg[:, None])


if VOICE_CREST and active.any():   # mix.voice_crest_db: voice peaks at most this far above its loudness
    before = 20 * np.log10(np.abs(voice).max())
    voice = limit(voice, 10 ** ((v_lufs + VOICE_CREST) / 20))
    v_lufs = meter.integrated_loudness(voice[active > 0])
    print(f"voice limiter: peak {before:.1f} -> {20 * np.log10(np.abs(voice).max()):.1f} dBFS (crest {VOICE_CREST:.0f} dB)")
bed = np.zeros((n, 2))
if music_path:
    m, msr = sf.read(music_path, always_2d=True)
    if msr != sr:
        m = resample_poly(m, sr, msr, axis=0)
    if len(m) > n:   # longer than the video: skip into the track so its own ending lands on the last frame
        print(f"music is {(len(m) - n) / sr:.1f} s longer than the video: starting it that far in")
        m = m[len(m) - n:]
    m = np.pad(m, ((0, n - len(m)), (0, 0)))
    fade = int(.6 * sr); m[:fade] *= np.linspace(0, 1, fade)[:, None]
    m_lufs = meter.integrated_loudness(m[m.any(axis=1)])
    m *= 10 ** ((v_lufs + MUSIC_LU - m_lufs) / 20)
    bed = m * gain[:, None]
    print(f"voice {v_lufs:.1f} LUFS, music {m_lufs:.1f} LUFS -> set to {v_lufs + MUSIC_LU:.1f}, ducked {DUCK_DB:.0f} dB under speech")
    if MUSIC_CREST:   # mix.music_crest_db: a loud trailer bed's hits otherwise cap the final gain (see voice_crest_db)
        before = 20 * np.log10(np.abs(bed).max())
        bed = limit(bed, 10 ** ((v_lufs + MUSIC_LU + MUSIC_CREST) / 20))
        print(f"music limiter: peak {before:.1f} -> {20 * np.log10(np.abs(bed).max()):.1f} dBFS (crest {MUSIC_CREST:.0f} dB)")

if fx.any(axis=1).sum() > sr:   # at least a second of effects to measure; "sfx": false leaves none
    f_lufs = meter.integrated_loudness(fx[fx.any(axis=1)])
    fx = fx * 10 ** ((v_lufs + FX_LU - f_lufs) / 20)
    print(f"sfx {f_lufs:.1f} LUFS -> set to {v_lufs + FX_LU:.1f}")
mix = fx + bed + voice[:, None] * 1.0
peak = np.abs(mix).max()
if os.environ.get("LOUDNESS") == "linear":   # one plain gain to -14 LUFS, capped so the oversampled peak stays at -1.5 dBFS
    lufs = meter.integrated_loudness(mix)
    tp = np.abs(resample_poly(mix, 4, 1, axis=0)).max()
    if os.environ.get("MASTER_LIMIT") == "1":   # render.limit: gain to -14, then a brickwall at -2 dBFS for the few peaks over
        g = 10 ** ((-14 - lufs) / 20)
        mix *= g
        over = 20 * np.log10(np.abs(mix).max() / 10 ** (-2 / 20))
        mix = limit(mix, 10 ** (-2 / 20))
        print(f"linear loudness: {lufs:.1f} LUFS -> -14.0 LUFS ({20 * np.log10(g):+.1f} dB), master limiter took {max(0, over):.1f} dB off the peaks")
    else:
        g = min(10 ** ((-14 - lufs) / 20), 10 ** (-1.5 / 20) / tp)
        mix *= g
        print(f"linear loudness: {lufs:.1f} LUFS -> {lufs + 20 * np.log10(g):.1f} LUFS ({20 * np.log10(g):+.1f} dB), no compression")
    peak = np.abs(mix).max()
elif peak > .98:
    mix *= .98 / peak
sf.write(out_path, mix, sr)
# stems for tools/measure.py: exactly what went into the mix
sf.write(Path(out_path).with_name('stem_music.wav'), bed.mean(axis=1), sr)
sf.write(Path(out_path).with_name('stem_fx.wav'), fx.mean(axis=1), sr)
sf.write(Path(out_path).with_name('stem_voice.wav'), voice, sr)
print(f"{out_path}: {n / sr:.1f} s, voice {active.sum() / sr:.1f} s, peak {peak:.2f}")
