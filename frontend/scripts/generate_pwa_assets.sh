#!/bin/bash
set -e

LOGO="/Users/barakael0/ScanPos/frontend/public/teralogo.png"
PUB="/Users/barakael0/ScanPos/frontend/public"
NAVY="#002583"

make_icon() {
  local size=$1 out=$2
  local logo_size=$(( size * 70 / 100 ))
  convert -size "${size}x${size}" "xc:${NAVY}" \
    \( "${LOGO}" -fuzz 8% -transparent white -resize "${logo_size}x${logo_size}" \) \
    -gravity Center -composite "${out}"
  echo "done: ${out}"
}

make_splash() {
  local w=$1 h=$2 out=$3
  local short=$(( w < h ? w : h ))
  local logo_w=$(( short * 38 / 100 ))
  convert -size "${w}x${h}" "xc:${NAVY}" \
    \( "${LOGO}" -fuzz 8% -transparent white -resize "${logo_w}x${logo_w}" \) \
    -gravity Center -composite "${out}"
  echo "done: ${out}"
}

mkdir -p "${PUB}/splash"

# Icons
make_icon 512 "${PUB}/icon-512x512.png"
make_icon 180 "${PUB}/apple-touch-icon.png"

# Splash screens
make_splash  640  1136 "${PUB}/splash/apple-splash-640-1136.png"
make_splash  750  1334 "${PUB}/splash/apple-splash-750-1334.png"
make_splash 1242  2208 "${PUB}/splash/apple-splash-1242-2208.png"
make_splash 1125  2436 "${PUB}/splash/apple-splash-1125-2436.png"
make_splash  828  1792 "${PUB}/splash/apple-splash-828-1792.png"
make_splash 1242  2688 "${PUB}/splash/apple-splash-1242-2688.png"
make_splash 1170  2532 "${PUB}/splash/apple-splash-1170-2532.png"
make_splash 1284  2778 "${PUB}/splash/apple-splash-1284-2778.png"
make_splash 1179  2556 "${PUB}/splash/apple-splash-1179-2556.png"
make_splash 1290  2796 "${PUB}/splash/apple-splash-1290-2796.png"
make_splash 1536  2048 "${PUB}/splash/apple-splash-1536-2048.png"
make_splash 1640  2360 "${PUB}/splash/apple-splash-1640-2360.png"
make_splash 2048  2732 "${PUB}/splash/apple-splash-2048-2732.png"

echo "All PWA assets generated."
