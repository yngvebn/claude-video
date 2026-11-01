"""Find an ElevenLabs voice: list your voices, search the shared library, render a short sample.

    uv run python tools/voices.py mine
    uv run python tools/voices.py library "calm british narrator" [--language en] [--accent british] [--gender male]
                                         [--age middle_aged] [--use-case narrative_story] [--n 15]
    uv run python tools/voices.py sample <voice_id> "<text>" <out.mp3> [--model eleven_v4] [--settings '<json>']

Normally run through story.mjs:  node story.mjs <project> voices mine | library "..." | sample <voice_id> ["text"]
Key: ELEVENLABS_API_KEY (needs "Voices: read"; a sample also needs "Text to Speech" and costs its characters).

Printed per voice: id, name, labels (accent, age, gender, descriptive, use case, language), and for library voices the
owner id and any custom rate: library voices can cost more than the normal 1 credit per character. Stock ("premade")
voices from `mine` never do. Library voices may have to be added to "My voices" in the ElevenLabs app before use.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.elevenlabs.io"


def key():
    k = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not k:
        raise SystemExit("ELEVENLABS_API_KEY is not set.")
    return k


def call(path, params=None, body=None):
    url = API + path + ("?" + urllib.parse.urlencode({k: v for k, v in (params or {}).items() if v not in (None, "")}) if params else "")
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"xi-api-key": key(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read(), r.headers
    except urllib.error.HTTPError as e:
        raise SystemExit(f"ElevenLabs {e.code} on {path}: {e.read()[:300]!r}")


def opt(args, name, default=None):
    return args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else default


def show(v, library=False):
    lab = v.get("labels") or {}
    get = lambda k: v.get(k) or lab.get(k) or ""
    desc = ", ".join(x for x in [get("accent"), get("age"), get("gender"), get("descriptive") or get("description"),
                                 get("use_case"), get("language")] if x)
    extra = ""
    if library:
        rate = v.get("fiat_rate") or v.get("rate")
        extra = f" | owner {v.get('public_owner_id', '?')}" + (f" | custom rate {rate}" if rate not in (None, 0, 1, "1") else "")
    print(f"{v.get('voice_id', '?')} | {v.get('name', '?')} | {v.get('category', 'library' if library else '')} | {desc}{extra}")


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    cmd, args = argv[0], argv[1:]
    if cmd == "mine":
        data, _ = call("/v1/voices")
        for v in json.loads(data).get("voices", []):
            show(v)
    elif cmd == "library":
        params = {"search": args[0] if args and not args[0].startswith("--") else None, "page_size": opt(args, "--n", 15),
                  "language": opt(args, "--language"), "accent": opt(args, "--accent"), "gender": opt(args, "--gender"),
                  "age": opt(args, "--age"), "use_cases": opt(args, "--use-case"), "include_custom_rates": "true"}
        data, _ = call("/v1/shared-voices", params)
        voices = json.loads(data).get("voices", [])
        if not voices:
            print("no library voices matched; loosen the filters")
        for v in voices:
            show(v, library=True)
    elif cmd == "sample":
        if len(args) < 3:
            raise SystemExit('usage: sample <voice_id> "<text>" <out.mp3> [--model eleven_v4] [--settings <json>]')
        vid, text, out = args[0], args[1], args[2]
        body = {"text": text, "model_id": opt(args, "--model", "eleven_v4")}
        if opt(args, "--settings"):     # the narration's voice_settings, so a sample sounds like the real read
            body["voice_settings"] = json.loads(opt(args, "--settings"))
        data, headers = call(f"/v1/text-to-speech/{vid}", {"output_format": "mp3_44100_128"}, body)
        open(out, "wb").write(data)
        print(f"{out}: {len(text)} characters{' (billed ' + headers.get('character-cost') + ')' if headers.get('character-cost') else ''}")
    else:
        raise SystemExit(f"unknown command {cmd!r} (mine | library | sample)")


if __name__ == "__main__":
    main(sys.argv[1:])
