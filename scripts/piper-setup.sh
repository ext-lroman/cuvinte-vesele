#!/bin/sh
# Instalează Piper (voce neurală locală, gratuită, open-source) într-un venv și descarcă vocile ro + en.
# Apoi: node scripts/generate-audio.js piper
set -e
cd "$(dirname "$0")/.."
python3 -m venv .venv
.venv/bin/pip install -q piper-tts
mkdir -p voices
( cd voices && ../.venv/bin/python -m piper.download_voices ro_RO-mihai-medium en_US-amy-medium )
# Pachetul pentru macOS are compilată o cale greșită către datele espeak-ng; o corectăm în loc.
.venv/bin/python scripts/piper-fix-espeak.py
echo "Piper e gata. Rulează: node scripts/generate-audio.js piper"
