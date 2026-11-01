"""ElevenLabs narration, generated a sentence at a time and cut into phrases on the character timestamps.

    uv run --with numpy --with soundfile python tools/eleven.py <script.json> <out_dir>

Why sentences, not phrases: a fresh request per short phrase ("Fever-Tree.") tends to start with a stutter, and
next-phrase context makes the model end each clip on an inhale. One request per sentence keeps the delivery natural;
the ' | ' beats are then cut out of that audio at the word boundaries (the in-between breath is dropped, edges faded)
and story.mjs puts its own pause there.

Tone: square-bracket audio tags in the script ("[deadpan] Humbling.") go to the model as written (eleven_v4 / v3);
they are stripped from the on-screen text and the word anchors. A '~' phrase is read slower: it gets its own request
at the "slow" speed. Consecutive sentences are stitched with previous_request_ids so the voice keeps its thread.

script.json (story.mjs writes it): { "eleven": { voice_id, model, stability, similarity_boost, style, speed, slow },
  "slides": [ { "key": "open", "sentences": ["Fair warning: | the highlight reel is a grocery receipt. //", ...] } ] }
Manifest (out_dir/manifest.json): [ { key, sentences: [ [ { wav, dur, chars } per phrase ] ] } ]; chars = start time of
every character of the phrase's display text, relative to the phrase clip. Cached per request: re-runs only bill
sentences whose text or settings changed. The API key comes from the ELEVENLABS_API_KEY environment variable only.
"""
import base64
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 48000
LEAD, LAST_TAIL = .05, .28                # seconds kept before a sentence's first / after its last character
FADE_IN, FADE_OUT = .012, .045
JOIN_RMS = .02                             # a cut louder than this lands mid-sound: keep the read continuous there

spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf8"))
out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
cfg = spec["eleven"]
def api_key():
    """only asked for when a sentence isn't cached, so a fully cached project builds without a key"""
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not key:
        raise SystemExit("ELEVENLABS_API_KEY is not set (needed for uncached sentences). Set it in this shell, "
                         "or use VOICE=kokoro for a free local voice, or VOICE=none for timing only.")
    return key
TAG = re.compile(r"\[[^\]]*\]")


def request(text, speed, prev_ids):
    settings = {k: cfg[k] for k in ("stability", "similarity_boost", "style") if k in cfg}
    body = {"text": text, "model_id": cfg["model"], "voice_settings": {**settings, "speed": speed}}
    if prev_ids:
        body["previous_request_ids"] = prev_ids[-3:]
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{cfg['voice_id']}/with-timestamps?output_format=mp3_44100_128",
                                 data=json.dumps(body).encode(), headers={"xi-api-key": api_key(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(r.read()), r.headers.get("request-id")
    except urllib.error.HTTPError as e:
        raise SystemExit(f"ElevenLabs {e.code}: {e.read()[:300]!r}")


def groups_of(raw):
    """sentence -> request groups: consecutive phrases at the same speed share one request"""
    parts = [p.strip() for p in re.sub(r"\s*/+\s*$", "", raw).split("|")]
    groups = []
    for p in parts:
        slow = p.startswith("~")
        text = p.replace("~", "", 1).strip()
        if groups and groups[-1]["slow"] == slow:
            groups[-1]["phrases"].append(text)
        else:
            groups.append({"slow": slow, "phrases": [text]})
    return groups


def quietest(audio, a, b, win=.01):
    """time of the quietest win-long stretch in [a, b] seconds"""
    i0, i1, w = int(max(0, a) * SR), int(min(len(audio) / SR, b) * SR), int(win * SR)
    if i1 - i0 <= w:
        return (i0 + i1) / 2 / SR
    e = np.convolve(audio[i0:i1] ** 2, np.ones(w), mode="valid")   # short window: this one is cheap
    return (i0 + int(np.argmin(e)) + w // 2) / SR


def onset(audio, before):
    """when the voice really starts: the first 10 ms above -50 dBFS, looking no later than `before`"""
    w = int(.01 * SR)
    for i in range(0, min(len(audio), int((before + .05) * SR)) - w, w):
        if np.sqrt(np.mean(audio[i:i + w] ** 2)) > 10 ** (-50 / 20):
            return i / SR
    return None


def cut(audio, a, phrases):
    """split one generation into phrase clips on the character timestamps; return [(clip, chars)] per phrase"""
    text = " ".join(phrases)
    starts, ends = list(a["character_start_times_seconds"]), a["character_end_times_seconds"]
    if len(starts) != len(text):
        raise SystemExit(f"alignment length {len(starts)} != text length {len(text)} for: {text[:60]}")
    tagged = np.zeros(len(text), bool)
    for m in TAG.finditer(text):               # a tag and the space after it, exactly like anchors.js stripTags()
        e = m.end()
        while e < len(text) and text[e].isspace():
            e += 1
        tagged[m.start():e] = True
    spoken = [k for k in range(len(text)) if not tagged[k] and not text[k].isspace()]
    # the timestamps can stretch a leading tag ("[epic] " over 0.34 s) while the voice starts at 0.08: cutting at the
    # first letter's timestamp then clips the first syllable. Trust the audio: pin the first letter to the real onset.
    if spoken:
        on = onset(audio, starts[spoken[0]])
        if on is not None and on < starts[spoken[0]] - .04:
            starts[spoken[0]] = on
    res, off = [], 0
    for j, ph in enumerate(phrases):
        rng = [k for k in spoken if off <= k < off + len(ph)]
        first, last = rng[0], rng[-1]
        nxt = [k for k in spoken if k >= off + len(ph) + 1]
        # start where the previous phrase was cut, else just before the first character
        t0 = res[-1][2] if res else max(0.0, starts[first] - LEAD)
        if nxt:   # cut at the quietest 10 ms between this phrase and the next: syllables decay past their end timestamp
            t1 = quietest(audio, ends[last] - .02, starts[nxt[0]] + .04)
        else:
            t1 = min(len(audio) / SR, ends[last] + LAST_TAIL)
        clip = audio[int(t0 * SR):int(min(len(audio) / SR, t1) * SR)].copy()
        # the narrator ran straight through this beat: no silence to cut in, so don't pause here (story.mjs joins the clips)
        c = int(t1 * SR); join = bool(nxt) and float(np.sqrt(np.mean(audio[max(0, c - 480):c + 480] ** 2))) > JOIN_RMS
        joined_in = bool(res) and res[-1][3]
        fi, fo = int(FADE_IN * SR), int(FADE_OUT * SR)
        if not joined_in:
            clip[:fi] *= np.linspace(0, 1, min(fi, len(clip)))[: len(clip[:fi])]
        if not join:
            clip[-fo:] *= np.linspace(1, 0, min(fo, len(clip)))[-len(clip[-fo:]):]
        # display text of the phrase (tags removed) with each character's time relative to the clip
        disp_idx = [k for k in range(off, off + len(ph)) if not tagged[k]]
        while disp_idx and text[disp_idx[0]].isspace():
            disp_idx.pop(0)
        while disp_idx and text[disp_idx[-1]].isspace():
            disp_idx.pop()
        chars = [round(max(0.0, starts[k] - t0), 3) for k in disp_idx]
        res.append((clip, chars, t1, join))
        off += len(ph) + 1
    return [(c, ch, j) for c, ch, _, j in res]


manifest, billed, prev_ids = [], 0, []
for slide in spec["slides"]:
    sentences = []
    for raw in slide["sentences"]:
        phrases_out = []
        for g in groups_of(raw):
            speed = cfg["slow"] if g["slow"] else cfg["speed"]
            text = " ".join(g["phrases"])
            h = hashlib.sha1(json.dumps([cfg["voice_id"], cfg["model"], cfg.get("stability"), cfg.get("similarity_boost"),
                                         cfg.get("style"), speed, text]).encode()).hexdigest()[:12]
            meta_f = out / f"{h}.json"
            if meta_f.exists():
                meta = json.loads(meta_f.read_text())
            else:
                res, rid = request(text, speed, prev_ids)
                mp3 = out / f"{h}.mp3"; mp3.write_bytes(base64.b64decode(res["audio_base64"]))
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp3), "-ar", str(SR), "-ac", "1", str(out / f"{h}.full.wav")], check=True)
                mp3.unlink()
                meta = {"text": text, "request_id": rid, "alignment": res["alignment"]}
                meta_f.write_text(json.dumps(meta))
                billed += len(text)
                print(f"  {slide['key']:10} {TAG.sub('', text)[:70]}", flush=True)
            if meta.get("request_id"):
                prev_ids.append(meta["request_id"])
            audio, _ = sf.read(out / f"{h}.full.wav")
            for j, (clip, chars, join) in enumerate(cut(audio, meta["alignment"], g["phrases"])):
                wav = out / f"{h}_{j}.wav"
                sf.write(wav, clip, SR)
                phrases_out.append({"wav": wav.as_posix(), "dur": round(len(clip) / SR, 3), "chars": chars, **({"join": True} if join else {})})
        sentences.append(phrases_out)
    manifest.append({"key": slide["key"], "sentences": sentences})
(out / "manifest.json").write_text(json.dumps(manifest))
total = sum(p["dur"] for s in manifest for sen in s["sentences"] for p in sen)
print(f"{billed} characters billed this run, {total:.1f} s of speech")
