import os
import shutil
import zipfile
import subprocess
import time
import json
import csv
from pathlib import Path

WORK_DIR = Path("temp_workdir")

def package_custom_download(
    task_id: str, 
    stems: list[str], 
    output_format: str = "wav", 
    chunked: bool = False,
    folder_name: str = "custom_stems"
) -> str:
    task_dir = WORK_DIR / task_id
    final_stems_dir = task_dir / "final_stems"
    
    if not final_stems_dir.exists():
        raise FileNotFoundError("Processing not complete or files missing.")
        
    timestamp = int(time.time())
    staging_dir = task_dir / f"custom_pkg_{timestamp}"
    
    base_dir = staging_dir / folder_name
    base_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        for stem in stems:
            stem_file = final_stems_dir / f"{stem.lower()}.wav"
            if not stem_file.exists():
                continue
                
            stem_folder = base_dir / stem.capitalize()
            stem_folder.mkdir(exist_ok=True)
            
            if chunked:
                ext = output_format.lower()
                out_pattern = str(stem_folder / f"ad%04d.{ext}")
                
                cmd = [
                    "ffmpeg", "-y", "-i", str(stem_file),
                    "-f", "segment", "-segment_time", "50",
                    "-segment_start_number", "1"
                ]
                if ext == "mp3":
                    cmd.extend(["-c:a", "libmp3lame", "-b:a", "320k"])
                cmd.append(out_pattern)
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                ext = output_format.lower()
                out_file = stem_folder / f"{stem.lower()}.{ext}"
                if ext == "wav":
                    shutil.copy(str(stem_file), str(out_file))
                else:
                    cmd = [
                        "ffmpeg", "-y", "-i", str(stem_file),
                        "-c:a", "libmp3lame", "-b:a", "320k",
                        str(out_file)
                    ]
                    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    
        if chunked:
            transcript_folder = base_dir / "Transcripts"
            transcript_folder.mkdir(exist_ok=True)
            
            def chunk_transcript(src_json, prefix):
                if not src_json.exists():
                    return
                with open(src_json, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                words = data.get("words", data.get("alignment", []))
                if not words:
                    return
                
                chunks = {}
                for w in words:
                    chunk_idx = int(w["start"] // 50) + 1
                    if chunk_idx not in chunks:
                        chunks[chunk_idx] = []
                    
                    offset = (chunk_idx - 1) * 50
                    chunks[chunk_idx].append({
                        "word": w["word"],
                        "start": round(max(0, w["start"] - offset), 3),
                        "end": round(w["end"] - offset, 3)
                    })
                    
                for idx, chunk_words in chunks.items():
                    out_json = transcript_folder / f"{prefix}_ad{idx:04d}.json"
                    with open(out_json, "w", encoding="utf-8") as f:
                        json.dump({"words": chunk_words}, f, indent=2)
                        
                    out_csv = transcript_folder / f"{prefix}_ad{idx:04d}.csv"
                    with open(out_csv, "w", newline="", encoding="utf-8") as f:
                        writer = csv.writer(f)
                        writer.writerow(["word", "start", "end"])
                        for cw in chunk_words:
                            writer.writerow([cw["word"], cw["start"], cw["end"]])

            chunk_transcript(final_stems_dir / "transcript.json", "whisper")
            chunk_transcript(final_stems_dir / "aligned_timestamps.json", "aligned")
            
        else:
            for text_file in ["lyrics.srt", "transcript.json", "transcript.csv", "aligned_timestamps.json", "aligned_timestamps.csv"]:
                src_file = final_stems_dir / text_file
                if src_file.exists():
                    shutil.copy(str(src_file), str(base_dir / text_file))
                    
        zip_path = task_dir / f"custom_download_{timestamp}.zip"
        with zipfile.ZipFile(str(zip_path), 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(str(staging_dir)):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, str(staging_dir))
                    zipf.write(file_path, arcname=arcname)
                    
        return str(zip_path)
    finally:
        if staging_dir.exists():
            shutil.rmtree(str(staging_dir), ignore_errors=True)

# 1. Setup mock directories
task_id = "test_chunk"
final_dir = WORK_DIR / task_id / "final_stems"
final_dir.mkdir(parents=True, exist_ok=True)

# 2. Create mock audio (120 seconds long so it spans 3 chunks)
audio_path = final_dir / "vocals.wav"
if not audio_path.exists():
    os.system(f"ffmpeg -y -f lavfi -i sine=frequency=1000:duration=120 -ar 44100 -ac 2 {audio_path}")

# 3. Create mock transcript.json spanning 120s
mock_words = []
for i in range(1, 12):
    mock_words.append({
        "word": f"word{i}",
        "start": i * 10.0,
        "end": i * 10.0 + 1.0
    })

with open(final_dir / "transcript.json", "w") as f:
    json.dump({"words": mock_words}, f)

with open(final_dir / "lyrics.srt", "w") as f:
    f.write("1\n00:00:10,000 --> 00:00:11,000\nword1\n\n")

print("--- Testing chunked=False ---")
z1 = package_custom_download(task_id, ["vocals"], chunked=False)
with zipfile.ZipFile(z1, 'r') as z:
    for f in z.namelist():
        print("  ", f)

print("\n--- Testing chunked=True ---")
z2 = package_custom_download(task_id, ["vocals"], chunked=True)
with zipfile.ZipFile(z2, 'r') as z:
    for f in z.namelist():
        print("  ", f)
        
    print("\n[VERIFYING whisper_ad0001.json]")
    with z.open("custom_stems/Transcripts/whisper_ad0001.json") as jf:
        print(" ", json.loads(jf.read().decode('utf-8')))
    
    print("\n[VERIFYING whisper_ad0002.json]")
    with z.open("custom_stems/Transcripts/whisper_ad0002.json") as jf:
        print(" ", json.loads(jf.read().decode('utf-8')))
