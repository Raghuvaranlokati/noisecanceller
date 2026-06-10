import urllib.request
import zipfile
import io
import os
import shutil

print("Downloading FFmpeg...")
url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
resp = urllib.request.urlopen(url)

print("Extracting...")
with zipfile.ZipFile(io.BytesIO(resp.read())) as z:
    z.extract("ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe", ".")
    z.extract("ffmpeg-master-latest-win64-gpl/bin/ffprobe.exe", ".")

print("Moving binaries...")
shutil.move("ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe", "ffmpeg.exe")
shutil.move("ffmpeg-master-latest-win64-gpl/bin/ffprobe.exe", "ffprobe.exe")

print("Cleaning up...")
shutil.rmtree("ffmpeg-master-latest-win64-gpl")
print("Done!")
