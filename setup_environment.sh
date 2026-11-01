#!/usr/bin/env bash
# setup_environment.sh: prepare a Linux machine (Debian / Ubuntu, including cloud containers) to run story-video.
#
#   ./setup_environment.sh            install what's missing, then verify everything
#   ./setup_environment.sh --check    verify only, install nothing (exit 1 if something is missing)
#   ./setup_environment.sh --kokoro   also fetch the Kokoro voice model (~340 MB) and its Python packages
#   ./setup_environment.sh --smoke    finish with a real end-to-end run (template project, Kokoro, 2 stills)
#
# Installs: curl, Node.js 22 (if < 20), ffmpeg, uv, the npm packages, and a browser for rendering:
# Google Chrome on x86-64, Playwright's Chromium elsewhere (Chrome has no ARM Linux build).
# Safe to re-run: everything already present is left alone. Uses sudo when not root.
# ElevenLabs needs ELEVENLABS_API_KEY in the environment; this script only reports whether it is set.
set -euo pipefail
cd "$(dirname "$0")"

CHECK=0 KOKORO=0 SMOKE=0
for a in "$@"; do
  case "$a" in
    --check) CHECK=1 ;;
    --kokoro) KOKORO=1 ;;
    --smoke) SMOKE=1 KOKORO=1 ;;
    -h | --help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $a (try --help)"; exit 2 ;;
  esac
done

step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
ok() { printf '  \033[32mok\033[0m       %s\n' "$*"; }
miss() { printf '  \033[31mmissing\033[0m  %s\n' "$*"; FAILED=1; }
note() { printf '  \033[33mnote\033[0m     %s\n' "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }
FAILED=0

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if have sudo; then SUDO="sudo"; elif [ $CHECK = 0 ]; then note "not root and no sudo: system packages can't be installed"; fi
fi
APT_READY=0
apt_install() {
  [ $CHECK = 1 ] && return 0
  if ! have apt-get; then note "no apt-get here: install '$*' with this system's package manager"; return 0; fi
  if [ $APT_READY = 0 ]; then $SUDO apt-get update -qq; APT_READY=1; fi
  $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends "$@"
}
node_major() { local v; v="$(node -v 2>/dev/null | sed -nE 's/^v([0-9]+).*/\1/p')"; echo "${v:-0}"; }   # 0 if node is absent or broken
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"   # where the uv installer puts uv

# ---------------------------------------------------------------- install
if [ $CHECK = 0 ]; then
  step "Base tools"
  have curl && have update-ca-certificates || apt_install curl ca-certificates
  have xz || apt_install xz-utils

  step "Node.js (20 or newer)"
  if ! have node || [ "$(node_major)" -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO bash - >/dev/null
    apt_install nodejs
  fi

  step "ffmpeg"
  have ffmpeg || apt_install ffmpeg

  step "uv (runs the Python tools)"
  have uv || curl -LsSf https://astral.sh/uv/install.sh | sh

  step "npm packages"
  if [ -f package-lock.json ]; then npm ci --no-audit --no-fund --loglevel=error; else npm install --no-audit --no-fund --loglevel=error; fi

  step "Browser for rendering"
  if have google-chrome || have google-chrome-stable; then
    echo "  Google Chrome already installed"
  elif [ "$(uname -m)" = "x86_64" ] && have apt-get; then
    tmp="$(mktemp -d)"; curl -fsSL -o "$tmp/chrome.deb" https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
    apt_install "$tmp/chrome.deb"; rm -rf "$tmp"
  else
    echo "  no Chrome build for $(uname -m): installing Playwright's Chromium"
    if [ -n "$SUDO" ]; then $SUDO npx --yes playwright-core install-deps chromium; else npx --yes playwright-core install-deps chromium; fi
    npx --yes playwright-core install chromium
  fi

  step "Python packages (cached by uv for later runs)"
  uv run --quiet --with numpy --with scipy --with soundfile --with pyloudnorm --with pillow \
    python -c "import numpy, scipy, soundfile, pyloudnorm, PIL"

  if [ $KOKORO = 1 ]; then
    step "Kokoro voice (model + Python packages)"
    mkdir -p tools/models
    for f in kokoro-v1.0.onnx voices-v1.0.bin; do
      [ -s "tools/models/$f" ] || curl -fL --progress-bar -o "tools/models/$f" \
        "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"
    done
    uv run --quiet --python 3.12 --with kokoro-onnx --with soundfile python -c "import kokoro_onnx"
  fi
fi

# ---------------------------------------------------------------- verify
step "Verify"
if have node && [ "$(node_major)" -ge 20 ]; then ok "node $(node -v)"; else miss "Node.js 20+ ($(node -v 2>/dev/null || echo none))"; fi
if [ -d node_modules/playwright-core ] && [ -d node_modules/roughjs ]; then ok "npm packages"; else miss "npm packages: run 'npm ci'"; fi
if have ffmpeg; then
  # Capture first, then grep a here-string. Never `cmd | grep -q` under pipefail: grep exits on the first match,
  # cmd dies of SIGPIPE, and the pipeline reports a miss for something that is there (Ubuntu's libx264 did this).
  ver="$(ffmpeg -version 2>/dev/null)"; enc="$(ffmpeg -hide_banner -encoders 2>/dev/null)"; flt="$(ffmpeg -hide_banner -filters 2>/dev/null)"
  ok "$(sed -n '1s/^\(ffmpeg version [^ ]*\).*/\1/p' <<<"$ver")"
  grep -q libx264 <<<"$enc" && ok "ffmpeg libx264 encoder" || miss "ffmpeg built without libx264 (use your distro's ffmpeg or a 'full' static build)"
  for f in loudnorm ebur128 anullsrc; do grep -qw "$f" <<<"$flt" && ok "ffmpeg filter $f" || miss "ffmpeg filter $f"; done
  have ffprobe && ok "ffprobe" || miss "ffprobe (ships with ffmpeg)"
else
  miss "ffmpeg"
fi
if have uv; then ok "$(uv --version)"; else miss "uv (curl -LsSf https://astral.sh/uv/install.sh | sh)"; fi
if [ -d node_modules/playwright-core ]; then
  if br="$(node --input-type=module -e "
      import { chromium } from 'playwright-core';
      const args = ['--disable-dev-shm-usage'];
      let b, kind = 'Google Chrome';
      try { b = await chromium.launch({ channel: 'chrome', args }); } catch { b = await chromium.launch({ args }); kind = 'Playwright Chromium'; }
      const v = b.version(); await b.close(); console.log(kind + ' ' + v);" 2>/dev/null)"; then
    ok "browser: $br (headless launch works)"
  else
    miss "a browser that launches headless (Chrome, or: npx playwright-core install --with-deps chromium)"
  fi
fi
if [ -s tools/models/kokoro-v1.0.onnx ] && [ -s tools/models/voices-v1.0.bin ]; then ok "Kokoro model files"; else note "Kokoro model not downloaded yet (fetched on first Kokoro run, or use --kokoro)"; fi
if [ -n "${ELEVENLABS_API_KEY:-}" ]; then ok "ELEVENLABS_API_KEY is set"; else note "ELEVENLABS_API_KEY not set: fine for Kokoro; export it before an ElevenLabs voice run"; fi
have uv && [ "$(command -v uv)" = "$HOME/.local/bin/uv" ] && note "uv lives in ~/.local/bin: new shells pick it up via the profile the installer edited (or: export PATH=\"\$HOME/.local/bin:\$PATH\")"

# ---------------------------------------------------------------- smoke test
if [ $SMOKE = 1 ] && [ $FAILED = 0 ]; then
  step "Smoke test: template project, Kokoro voice, two stills"
  rm -rf projects/_smoke
  node story.mjs new _smoke >/dev/null
  VOICE=kokoro node story.mjs _smoke voice
  VOICE=kokoro node story.mjs _smoke layout
  VOICE=kokoro node story.mjs _smoke stills 2 12
  n="$(ls projects/_smoke/output/stills/*.png 2>/dev/null | wc -l)"
  rm -rf projects/_smoke
  if [ "$n" = 2 ]; then ok "rendered 2 stills end to end"; else miss "smoke test produced $n of 2 stills"; fi
fi

echo
if [ $FAILED = 0 ]; then
  printf '\033[32mReady.\033[0m  Try: node story.mjs help\n'
else
  printf '\033[31mSomething is missing (see above).\033[0m'
  [ $CHECK = 1 ] && printf '  Run ./setup_environment.sh without --check to install it.'
  echo; exit 1
fi
