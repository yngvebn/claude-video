"""Build a music-led score: a quiet drone stretched so a separate orchestral drop lands exactly on a given time,
plus one-shot effects (risers, impacts) placed on that grid. Writes one wav that the mixer uses as the music.

    uv run python tools/score.py <spec.json> <out.wav>

spec (from project.json "score", resolved by story.mjs: paths absolute, times in seconds):
  { "drone": path, "drone_db": -11, "drop": path, "hit": 60.0, "len": 89.5,
    "fx": [ { "file": path, "at": 60.0, "align": "start" | "peak", "db": -8 } ] }
  or, for a finished music track: { "bed": path, "bed_db": 0, "len": 46.4, "cut": [[31.96, 37.96]],
    "duck": [ { "from": 31.9, "to": 37.96, "db": -40, "fade": .04 } ], "fx": [...] }
- bed: the track starts at 0:00 (start-aligned, unlike music.file, which ends on the last frame). duck cuts it for
  a stretch (a trailer drop-out), with short fades, and the fx land on the cuts the model didn't hit.
- The drone is stretched (or trimmed) so its own tail ends just before "hit": one equal-power crossfade between two
  windows chosen for the closest spectrum and level, so a static drone hides the join.
- The drop's first transient (detected) lands on "hit"; the drone sits drone_db under its native level so the
  reveal is a real jump.
- align "peak" puts an effect's loudest sample on "at" (a riser peaking into the hit), "start" its onset.
- The result is peak-normalised to -1 dBFS; the mixer sets the final level against the voice.
"""
import json
import sys
import warnings

import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly

warnings.filterwarnings("ignore", category=wavfile.WavFileWarning)
SR = 48000
XF = 4.0
DB = lambda v: 10 ** (v / 20)


def load(p):
    if not p.lower().endswith('.wav'):   # mp3 from ElevenLabs: decode with ffmpeg first
        import subprocess, tempfile
        tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', p, '-ar', str(SR), '-ac', '2', tmp], check=True)
        p = tmp
    sr, x = wavfile.read(p)
    x = x.astype(np.float64) / (32768 if x.dtype == np.int16 else 2147483648 if x.dtype == np.int32 else 1)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    if sr != SR:
        x = resample_poly(x, SR, sr, axis=0)
    return x


S = lambda t: int(round(t * SR))


def onset(x):
    """first 10 ms frame within 20 dB of the loudest: the drop's hit (skips a leading click)"""
    f = S(.01)
    e = np.array([np.sqrt((x[i:i + f] ** 2).mean()) for i in range(0, len(x) - f, f)])
    e = 20 * np.log10(e + 1e-9)
    above = np.where(e > e.max() - 20)[0]
    return (above[above > 0][0] if (above > 0).any() else 0) * .01


def spec(x):
    m = x.mean(1)
    f = np.abs(np.fft.rfft(m * np.hanning(len(m))))[:S(.5)]
    f = np.convolve(f, np.ones(32) / 32, "same")
    return f / (np.linalg.norm(f) + 1e-12)


def tail_end(x):
    """where the drone has faded into near-silence (60 dB under its loudest second)"""
    w = S(.1)
    e = np.array([np.sqrt((x[i:i + w] ** 2).mean()) for i in range(0, len(x) - w, w)])
    loud = e.max()
    last = np.where(e > loud * DB(-40))[0]
    return (last[-1] + 1) * .1 if len(last) else len(x) / SR


def stretch(a, end_at):
    """drone[0:h] crossfaded into drone[x:end], so the drone's own end (its natural fade) lands at end_at"""
    src_end = tail_end(a)
    if src_end >= end_at:   # long enough: just use its head, ending on its natural fade
        return a[:S(end_at)], f"drone trimmed to {end_at:.2f} s"
    best = None
    for h in np.arange(XF + 2, src_end - 1, .25):
        x = h - XF + src_end - end_at
        if x < 2 or x + XF > src_end - 2:
            continue
        wa, wb = a[S(h - XF):S(h)], a[S(x):S(x + XF)]
        lvl = abs(np.sqrt((wa ** 2).mean()) - np.sqrt((wb ** 2).mean()))
        score = spec(wa) @ spec(wb) - 2 * lvl
        if best is None or score > best[0]:
            best = (score, h, x)
    if best is None:
        raise SystemExit(f"the drone ({src_end:.1f} s) can't be stretched to {end_at:.1f} s with one crossfade; use a longer drone")
    _, h, x = best
    head, tail = a[S(.05):S(h)], a[S(x):S(src_end)]
    n = S(XF)
    g = np.linspace(0, np.pi / 2, n)[:, None]
    out = np.concatenate([head[:-n], head[-n:] * np.cos(g) + tail[:n] * np.sin(g), tail[n:]])
    fi = S(.02)
    out[:fi] *= np.linspace(0, 1, fi)[:, None]
    return out, f"drone stretched: 0-{h:.2f} s crossfaded into {x:.2f}-{src_end:.2f} s at {h - XF:.2f} s"


def bed(sp, total):
    """a finished track from 0:00, with drop-outs. bed can also be segments [{file, from}, ...] of tracks composed to
    the same timeline: each plays its own file (file time = video time) from its `from` to the next one's, so two
    takes can be joined at a drop (hide the switch in a duck before it)."""
    if isinstance(sp["bed"], list):
        mix = np.zeros((S(total) + SR, 2))
        segs = sorted(sp["bed"], key=lambda s: s["from"])
        for i, sg in enumerate(segs):
            b = load(sg["file"]) * DB(sp.get("bed_db", 0))
            # shift: video time minus file time (a lead-in pushes a track composed for the old cut later);
            # fade_out: let the segment ring on past the next one's start, fading out over that many seconds
            sh = S(sg.get("shift", 0))
            t1 = segs[i + 1]["from"] if i + 1 < len(segs) else total + 1
            fo = S(sg.get("fade_out", 0))
            i0, i1 = S(sg["from"]), min(S(t1) + fo, len(b) + sh, len(mix))
            seg = b[max(0, i0 - sh):i1 - sh].copy()
            if fo and i1 > S(t1):
                k = i1 - S(t1)
                seg[-k:] *= np.linspace(1, 0, k)[:, None]
            mix[i1 - len(seg):i1] += seg
            print(f"bed segment {sg['file'].split('/')[-1]}: {sg['from']:.2f}-{min(t1, total):.2f} s (shift {sg.get('shift', 0)} s)")
        sp = {**sp, "bed": None}
        return duck(sp, mix)
    b = load(sp["bed"]) * DB(sp.get("bed_db", 0))
    # cut: [[from, to], ...] in the bed's own seconds: remove a stretch (a cut section), joined with a 15 ms crossfade.
    # Cut bar to bar (measure the beat with tools/onsets.py) and the pulse runs on without a hiccup.
    for c0, c1 in sorted(sp.get("cut", []), reverse=True):
        i0, i1, xf = S(c0), S(c1), S(.015)
        g = np.linspace(0, 1, xf)[:, None]
        b = np.concatenate([b[:i0 - xf], b[i0 - xf:i0] * (1 - g) + b[i1 - xf:i1] * g, b[i1:]])
        print(f"bed: cut {c0:.2f}-{c1:.2f} s ({c1 - c0:.2f} s removed)")
    mix = np.zeros((S(total) + SR, 2))
    n = min(len(b), len(mix))
    mix[:n] += b[:n]
    print(f"bed: {len(b) / SR:.2f} s from 0:00")
    return duck(sp, mix)


def duck(sp, mix):
    g = np.ones(len(mix))
    for d in sp.get("duck", []):
        i0, i1, f = S(d["from"]), S(d["to"]), max(1, S(d.get("fade", .04)))
        lo = DB(d.get("db", -40))
        g[i0:i1] = np.minimum(g[i0:i1], lo)
        g[max(0, i0 - f):i0] = np.minimum(g[max(0, i0 - f):i0], np.linspace(1, lo, len(g[max(0, i0 - f):i0])))
        g[i1:i1 + f] = np.minimum(g[i1:i1 + f], np.linspace(lo, 1, len(g[i1:i1 + f])))
        print(f"bed ducked {d.get('db', -40)} dB from {d['from']:.2f} to {d['to']:.2f} s")
    return mix * g[:, None]


def main(spec_path, out_path):
    sp = json.load(open(spec_path))
    total = sp["len"]
    if sp.get("bed"):
        mix = bed(sp, total)
    else:
        mix = drone_drop(sp, total)
    for fx in sp.get("fx", []):
        x = load(fx["file"]) * DB(fx.get("db", 0))
        ref = np.argmax(np.abs(x).max(1)) / SR if fx.get("align") == "peak" else onset(x)
        i = S(fx["at"] - ref)
        if i < 0:
            x, i = x[-i:], 0
        mix[i:i + len(x)] += x[:len(mix) - i]
        print(f"fx {fx['file'].split('/')[-1]}: {fx.get('align', 'start')} at {fx['at']:.2f} s, {fx.get('db', 0):+.0f} dB")
    mix = mix[:S(total)]
    fo = S(.05)
    mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
    mix *= DB(-1) / np.abs(mix).max()
    wavfile.write(out_path, SR, (mix * 32767).astype(np.int16))
    print(f"{out_path}: {total:.2f} s")


def drone_drop(sp, total):
    hit = sp["hit"]
    drone, drop = load(sp["drone"]), load(sp["drop"])
    d0 = onset(drop)
    d, how = stretch(drone, hit - .05)
    print(how)
    mix = np.zeros((S(total) + SR, 2))
    mix[:len(d)] += d * DB(sp.get("drone_db", -11))
    dr = drop[S(max(0, d0 - .02)):]
    fi = S(.01)
    dr[:fi] *= np.linspace(0, 1, fi)[:, None]
    i0 = S(hit - .02)
    mix[i0:i0 + len(dr)] += dr[:len(mix) - i0]
    print(f"drop onset {d0:.2f} s in its file -> at {hit:.2f} s; the drop ends at {hit - .02 + len(dr) / SR:.2f} s")
    return mix


if __name__ == "__main__":
    main(*sys.argv[1:3])
