#!/usr/bin/env bash
# Renders the raster icons and logo files in public/ from the two SVG sources:
#   public/logo.svg     the mark at its true weight, for large sizes
#   public/favicon.svg  the mark with heavier strokes, for small sizes
# Needs librsvg (rsvg-convert) and ImageMagick 7 (magick). Run after editing either SVG.
set -euo pipefail
cd "$(dirname "$0")/.."

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Small-size variant without rounded corners; iOS and Android apply their own masks.
sed 's/ rx="18"//' public/favicon.svg > "$tmp/bold.svg"

for size in 16 32 48; do
	rsvg-convert -w "$size" -h "$size" public/favicon.svg -o "$tmp/$size.png"
done
magick "$tmp/16.png" "$tmp/32.png" "$tmp/48.png" public/favicon.ico

rsvg-convert -w 180 -h 180 "$tmp/bold.svg" -o public/apple-touch-icon.png
rsvg-convert -w 192 -h 192 "$tmp/bold.svg" -o public/icon-192.png
rsvg-convert -w 512 -h 512 public/logo.svg -o public/icon-512.png
rsvg-convert -w 1024 -h 1024 public/logo.svg -o public/logo.png
magick public/logo.png -quality 90 public/logo.webp

ls -la public/favicon.ico public/apple-touch-icon.png public/icon-192.png public/icon-512.png public/logo.png public/logo.webp
