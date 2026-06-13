import os
import sys
import zipfile

sys.path.append(os.path.abspath("."))
from services.audio_service import process_audio_file, package_custom_download

def dummy_progress(progress, message):
    print(f"[{progress}%] {message}")

if not os.path.exists("dummy.wav"):
    os.system("ffmpeg -y -f lavfi -i sine=frequency=1000:duration=5 -ar 44100 -ac 2 dummy.wav")

task_id = "test_task_123"

print("Running process_audio_file...")
try:
    process_audio_file("dummy.wav", task_id, dummy_progress, isolate_vocals=True, lyric_sync=True)
except Exception as e:
    print("Error:", e)

final_dir = f"temp_workdir/{task_id}/final_stems"
print("Final stems dir contents:", os.listdir(final_dir) if os.path.exists(final_dir) else "Not found")

print("\n--- Testing chunked=False ---")
try:
    z1 = package_custom_download(task_id, ["vocals"], output_format="wav", chunked=False)
    with zipfile.ZipFile(z1, 'r') as z:
        for f in z.namelist():
            print("  ", f)
except Exception as e:
    print("Error:", e)

print("\n--- Testing chunked=True ---")
try:
    z2 = package_custom_download(task_id, ["vocals"], output_format="wav", chunked=True)
    with zipfile.ZipFile(z2, 'r') as z:
        for f in z.namelist():
            print("  ", f)
except Exception as e:
    print("Error:", e)
