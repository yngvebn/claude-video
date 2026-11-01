"""Find the beats to cut on: accents, onset runs and tempo in a stretch of audio.

    uv run --with numpy --with scipy --with soundfile python tools/onsets.py <audio> [from_s] [to_s]

Prints, in seconds of the file (add the file's offset in the video yourself):
- accents: smoothed low-band onsets (30-200 Hz: timpani, low strings, drums). The strongest are the big moments.
- pulses: smoothed mid-band onsets (200-3000 Hz). Evenly spaced runs of these are a heartbeat or a beat.
- hits: raw, unsmoothed transients, exact enough to cut on (a drop's downbeats).
- the beat period from the spacing between hits (113 bpm on one trailer's drop).
- loudness per 0.5 s, to see swells, breaths and where a track dies away.
Used for a music-led trailer: the drop's downbeats placed the montage words and the end card, the drone's
accents and pulses drove the waking city lights. Re-run it whenever a track or its stretch changes.
"""
import sys

import numpy as np
import soundfile as sf
from scipy.signal import find_peaks

path = sys.argv[1]
x, sr = sf.read(path, always_2d=True)
t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 0
t1 = float(sys.argv[3]) if len(sys.argv) > 3 else len(x) / sr
m = x[int(t0 * sr):int(t1 * sr)].mean(1)
hop, n = int(sr * .01), 4096
win = np.hanning(n)
fr = np.fft.rfftfreq(n, 1 / sr)
F = np.log1p(np.array([np.abs(np.fft.rfft(m[i:i + n] * win)) for i in range(0, len(m) - n, hop)]) * 30)
band = lambda lo, hi: np.maximum(0, np.diff(F[:, (fr > lo) & (fr < hi)], axis=0)).sum(1)
smooth = lambda v, k=25: np.convolve(v, np.ones(k) / k, 'same')   # short kernel on a 100 Hz envelope: cheap


def peaks(v, height=.35):
    s = smooth(v)
    s = (s - np.median(s)) / (np.percentile(s, 99.5) - np.median(s) + 1e-9)
    p, _ = find_peaks(s, height=height, distance=40)
    return '  '.join(f'{t0 + (i + 1) * .01:.2f}:{s[i]:.2f}' for i in p)


low = band(30, 200)
print(f'{path}  {t0:.1f}-{t1:.1f} s')
print('accents, low band smoothed (s:strength):', peaks(low))
print('pulses, mid band smoothed (s:strength):', peaks(band(200, 3000)))
# hits: the raw all-band transients, unsmoothed, so the times are exact enough to cut on (a drop's downbeats)
hit = band(30, 8000)
hit = (hit - np.median(hit)) / (np.percentile(hit, 99) - np.median(hit) + 1e-9)
p, _ = find_peaks(hit, height=.45, distance=18)
print('hits, raw transients (s:strength):', '  '.join(f'{t0 + (i + 1) * .01:.2f}:{hit[i]:.1f}' for i in p))
# tempo: the most common spacing between hits (all pairs within 1.2 s). Autocorrelating the band energy was tried
# and locked onto sub-patterns (194 and 68 bpm for a 113 bpm drop); the hits themselves are the reliable signal.
ht = (p + 1) * .01
d = np.concatenate([ht[j + 1:] - ht[j] for j in range(len(ht))]) if len(ht) > 2 else np.array([])
d = d[(d > .35) & (d < 1.2)]
if len(d) > 4:
    h, edges = np.histogram(d, bins=np.arange(.35, 1.21, .01))
    k = np.argmax(np.convolve(h, np.ones(3), 'same'))
    per = d[np.abs(d - edges[k]) < .02].mean()
    print(f'beat period ~{per:.2f} s ({60 / per:.0f} bpm), from the spacing between hits')
w = sr // 2
rms = [20 * np.log10(np.sqrt((m[i:i + w] ** 2).mean()) + 1e-9) for i in range(0, len(m), w)]
print('loudness per 0.5 s (dBFS):')
for i in range(0, len(rms), 12):
    print(f'  {t0 + i / 2:6.1f}s', ' '.join(f'{v:4.0f}' for v in rms[i:i + 12]))
