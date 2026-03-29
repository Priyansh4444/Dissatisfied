#!/usr/bin/env python3
"""
One-off: load website/public/logo-store.png, detect the bright zigzag (vs gray tile),
set those pixels to black. Keeps the gray background unchanged.

Requires: pillow (pip install pillow)
"""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from PIL import Image

# Repo root: tmp/ is sibling of website/
ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / "website" / "public" / "logo-store.png"
OUTPUT = ROOT / "website" / "public" / "logo-brand.png"

# Pixels brighter than this (avg RGB) are treated as the zigzag / anti-aliased line.
# Store asset uses ~221 gray and ~247–255 line + edges.
ZIGZAG_MIN_LUMA = 235


def analyze_colors(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    px = im.load()
    w, h = im.size
    counter: Counter[tuple[int, int, int, int]] = Counter()
    for y in range(h):
        for x in range(w):
            counter[px[x, y]] += 1
    print(f"{path.name} size={w}x{h} — top colors (count, RGBA):")
    for c, n in counter.most_common(12):
        print(f"  {n:5d}  {c}")


def recolor_zigzag_to_black(
    path: Path,
    out: Path,
    min_luma: float = ZIGZAG_MIN_LUMA,
) -> tuple[int, int]:
    im = Image.open(path).convert("RGBA")
    px = im.load()
    w, h = im.size
    changed = 0
    total = w * h
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            luma = (r + g + b) / 3.0
            if luma >= min_luma:
                px[x, y] = (0, 0, 0, a)
                changed += 1
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, "PNG")
    return changed, total


def main() -> int:
    if not INPUT.exists():
        print(f"Missing input: {INPUT}", file=sys.stderr)
        return 1

    print("--- Color sample (input) ---")
    analyze_colors(INPUT)

    changed, total = recolor_zigzag_to_black(INPUT, OUTPUT)
    print()
    print(f"Threshold: avg RGB >= {ZIGZAG_MIN_LUMA} → black (alpha preserved)")
    print(f"Pixels changed: {changed} / {total}")
    print(f"Wrote: {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
