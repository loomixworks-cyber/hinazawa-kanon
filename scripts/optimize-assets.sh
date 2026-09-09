#!/usr/bin/env bash
set -euo pipefail

convert_webp() {
  local src="$1"
  local dst="${src%.*}.webp"
  local q="${2:-90}"
  [ -f "$src" ] || return 0
  cwebp -quiet -q "$q" -m 6 -alpha_q 100 -metadata none "$src" -o "$dst"
  local old new
  old=$(stat -c%s "$src")
  new=$(stat -c%s "$dst")
  if [ "$new" -ge "$old" ]; then
    rm -f "$dst"
    echo "KEEP PNG: $src ($old <= $new)"
  else
    echo "WEBP: $src $old -> $new"
  fi
}

# Card thumbnails: high quality, no resize. These are the biggest bandwidth win.
for src in assets/images/thumbs/*.png; do
  convert_webp "$src" 90
done

# Large presentation images. Slightly higher quality because they are visually prominent.
for src in   assets/images/key-visual-main.png   assets/images/hero-bg.png   assets/images/hero-bg-mobile.png   assets/images/logo.png   assets/images/game-pickup-slide-01.png   assets/images/game-pickup-slide-02.png   assets/images/game-pickup-slide-03.png   assets/images/game-pickup-slide-04.png   assets/images/game-tv-frame.png
do
  convert_webp "$src" 92
done

# QR stays PNG for maximum scanner reliability, but cap needless source resolution.
if [ -f assets/images/kanon-qr.png ]; then
  magick assets/images/kanon-qr.png -resize '960x960>' -strip -define png:compression-level=9 assets/images/kanon-qr.optimized.png
  if [ "$(stat -c%s assets/images/kanon-qr.optimized.png)" -lt "$(stat -c%s assets/images/kanon-qr.png)" ]; then
    mv assets/images/kanon-qr.optimized.png assets/images/kanon-qr.png
  else
    rm -f assets/images/kanon-qr.optimized.png
  fi
fi

# Favicon is displayed tiny. Preserve PNG compatibility while removing oversized pixels/metadata.
if [ -f assets/images/favicon.png ]; then
  magick assets/images/favicon.png -resize '512x512>' -strip -define png:compression-level=9 assets/images/favicon.optimized.png
  if [ "$(stat -c%s assets/images/favicon.optimized.png)" -lt "$(stat -c%s assets/images/favicon.png)" ]; then
    mv assets/images/favicon.optimized.png assets/images/favicon.png
  else
    rm -f assets/images/favicon.optimized.png
  fi
fi

python3 - <<'PY'
from pathlib import Path
import re

html_path = Path("index.html")
html = html_path.read_text(encoding="utf-8")

# Switch only when the generated WebP exists.
candidates = [
    "assets/images/key-visual-main.png",
    "assets/images/logo.png",
    "assets/images/game-pickup-slide-01.png",
    "assets/images/game-pickup-slide-02.png",
    "assets/images/game-pickup-slide-03.png",
    "assets/images/game-pickup-slide-04.png",
    "assets/images/game-tv-frame.png",
]
for old in candidates:
    new = old.rsplit(".", 1)[0] + ".webp"
    if Path(new).exists():
        html = html.replace(old, new)

# All referenced thumbnail PNGs that successfully converted.
for src in Path("assets/images/thumbs").glob("*.webp"):
    old = str(src.with_suffix(".png"))
    html = html.replace(old, str(src))

# Lazy-load below-the-fold thumbnails without changing visual layout.
html = re.sub(
    r'<img(?![^>]*\bloading=)([^>]*\bsrc="assets/images/thumbs/[^"]+"[^>]*)>',
    r'<img loading="lazy" decoding="async"\1>',
    html,
)
# Contact QR is far below the fold.
html = re.sub(
    r'<img(?![^>]*\bloading=)([^>]*\bsrc="assets/images/kanon-qr\.png"[^>]*)>',
    r'<img loading="lazy" decoding="async"\1>',
    html,
)

html_path.write_text(html, encoding="utf-8")

css_path = Path("styles.css")
css = css_path.read_text(encoding="utf-8")
for old in ["hero-bg.png", "hero-bg-mobile.png"]:
    webp = Path("assets/images") / old.replace(".png", ".webp")
    if webp.exists():
        css = css.replace(old, old.replace(".png", ".webp"))
css_path.write_text(css, encoding="utf-8")
PY

# Basic safety checks.
node --check script.js
node --check intro.js
grep -q 'assets/images/thumbs/.*\.webp' index.html
echo "Asset optimization complete."
