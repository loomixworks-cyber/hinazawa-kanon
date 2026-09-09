#!/usr/bin/env bash
set -euo pipefail

SRC="assets/video/kanon-intro-scroll.mp4"
MOBILE_OUT="assets/video/kanon-intro-mobile-scrub.mp4"
DESKTOP_OUT="assets/video/kanon-intro-desktop-scrub.mp4"

if [ ! -f "$SRC" ]; then
  echo "Missing high-quality source: $SRC" >&2
  exit 1
fi

encode_all_i() {
  local out="$1"
  local width="$2"
  local height="$3"
  local bitrate="$4"
  local tag="$5"
  local passlog=".tmp/ffmpeg-${tag}"
  mkdir -p .tmp

  ffmpeg -hide_banner -loglevel error -y -i "$SRC" -an     -vf "scale=${width}:${height}:flags=lanczos"     -r 24 -frames:v 144     -c:v libx264 -preset slow -profile:v high -level:v 4.1     -pix_fmt yuv420p -b:v "$bitrate"     -g 1 -keyint_min 1 -sc_threshold 0 -bf 0     -pass 1 -passlogfile "$passlog" -f mp4 /dev/null

  ffmpeg -hide_banner -loglevel error -y -i "$SRC" -an     -vf "scale=${width}:${height}:flags=lanczos"     -r 24 -frames:v 144     -c:v libx264 -preset slow -profile:v high -level:v 4.1     -pix_fmt yuv420p -b:v "$bitrate"     -g 1 -keyint_min 1 -sc_threshold 0 -bf 0     -pass 2 -passlogfile "$passlog"     -movflags +faststart "$out"

  rm -f "$passlog"* 2>/dev/null || true
}

# Real resolution upgrade from the 1080x1920 / ~20.7 Mbps source.
# Keep every frame as a keyframe because intro.js seeks while the video is paused.
encode_all_i "$MOBILE_OUT" 720 1280 5300k mobile
encode_all_i "$DESKTOP_OUT" 900 1600 7800k desktop

python3 - <<'PY'
import json, os, subprocess

targets = [
    ("assets/video/kanon-intro-mobile-scrub.mp4", 720, 1280, 3_300_000, 4_600_000),
    ("assets/video/kanon-intro-desktop-scrub.mp4", 900, 1600, 4_800_000, 6_700_000),
]
for path, w, h, min_size, max_size in targets:
    raw = subprocess.check_output([
        "ffprobe","-v","error","-select_streams","v:0",
        "-show_entries","stream=width,height,avg_frame_rate,nb_frames:format=duration,size",
        "-of","json",path
    ])
    data=json.loads(raw)
    s=data["streams"][0]
    f=data["format"]
    size=int(f.get("size") or os.path.getsize(path))
    duration=float(f["duration"])
    frames=int(s.get("nb_frames") or 0)
    keyframes=len([
        x for x in subprocess.check_output([
            "ffprobe","-v","error","-select_streams","v:0","-skip_frame","nokey",
            "-show_entries","frame=pts_time","-of","csv=p=0",path
        ], text=True).splitlines() if x.strip()
    ])
    assert (s["width"],s["height"]) == (w,h), (path,s["width"],s["height"])
    assert abs(duration-6.0) < 0.08, (path,duration)
    assert frames == 144, (path,frames)
    assert keyframes == 144, (path,keyframes)
    assert min_size <= size <= max_size, (path,size)
    print(f"OK {path}: {w}x{h}, {size/1_000_000:.2f} MB, {keyframes} keyframes")
PY

# Keep dist consistent with the root static site copy.
mkdir -p dist/assets/video
cp "$MOBILE_OUT" dist/assets/video/kanon-intro-mobile-scrub.mp4
cp "$DESKTOP_OUT" dist/assets/video/kanon-intro-desktop-scrub.mp4
