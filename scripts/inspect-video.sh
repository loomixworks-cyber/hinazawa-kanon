#!/usr/bin/env bash
set -euo pipefail
mkdir -p .tmp
python3 - <<'PY'
import json, subprocess, glob, os
files = sorted(glob.glob("assets/video/*.mp4"))
out = []
for path in files:
    cmd = [
        "ffprobe","-v","error","-select_streams","v:0",
        "-show_entries","stream=codec_name,width,height,r_frame_rate,avg_frame_rate,bit_rate,nb_frames:format=duration,bit_rate,size",
        "-of","json",path
    ]
    data=json.loads(subprocess.check_output(cmd))
    s=(data.get("streams") or [{}])[0]
    f=data.get("format") or {}
    # Count keyframes, useful because the intro relies on seeking while paused.
    kcmd=["ffprobe","-v","error","-select_streams","v:0","-skip_frame","nokey","-show_entries","frame=pts_time","-of","csv=p=0",path]
    keys=[x for x in subprocess.check_output(kcmd,text=True).splitlines() if x.strip()]
    out.append({
        "file":path,
        "size":int(f.get("size") or os.path.getsize(path)),
        "duration":float(f.get("duration") or 0),
        "format_bitrate":int(f.get("bit_rate") or 0),
        "codec":s.get("codec_name"),
        "width":int(s.get("width") or 0),
        "height":int(s.get("height") or 0),
        "fps":s.get("avg_frame_rate") or s.get("r_frame_rate"),
        "stream_bitrate":int(s.get("bit_rate") or 0),
        "frames":int(s.get("nb_frames") or 0) if str(s.get("nb_frames") or "").isdigit() else None,
        "keyframes":len(keys),
    })
with open(".tmp/video-metadata.json","w") as fp:
    json.dump(out,fp,indent=2)
print(json.dumps(out,indent=2))
PY
