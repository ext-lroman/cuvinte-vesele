#!/usr/bin/env python3
"""Roata piper-tts pentru macOS are compilată în espeakbridge.so o cale către espeak-ng-data care nu
există pe mașina noastră (/Users/runner/...). Înlocuim șirul cu calea reală (sau cu cea dată ca argument),
completată cu NUL ca să păstreze lungimea, apoi re-semnăm biblioteca (ad-hoc)."""
import pathlib, subprocess, sys, importlib.util

spec = importlib.util.find_spec("piper")
pkg = pathlib.Path(spec.origin).parent
so = pkg / "espeakbridge.so"
data = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pkg / "espeak-ng-data"
blob = so.read_bytes()
marker = b"espeak-ng-data"
idx = blob.find(b"/Users/runner/")
if idx < 0:
    print("nimic de reparat (calea nu apare în espeakbridge.so)")
    sys.exit(0)
end = blob.index(b"\0", idx)
old = blob[idx:end]
new = str(data).encode()
if len(new) > len(old):
    sys.exit(f"calea nouă e prea lungă ({len(new)} > {len(old)}); mută proiectul într-un folder cu cale mai scurtă")
blob = blob[:idx] + new + b"\0" * (len(old) - len(new)) + blob[end:]
so.write_bytes(blob)
subprocess.run(["codesign", "-s", "-", "-f", str(so)], check=False, capture_output=True)
print(f"reparat: {old.decode()} → {data}")
