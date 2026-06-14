import time
import subprocess
import os
import shutil
from pathlib import Path
import urllib.request
from audio_separator.separator import Separator
import logging

def download_test_audio():
    # Download a tiny royalty-free track for testing
    url = "https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg"
    test_file = "test_audio.ogg"
    if not os.path.exists(test_file):
        print(f"Downloading test audio from {url}...")
        urllib.request.urlretrieve(url, test_file)
    
    # Convert to standard wav for apples-to-apples comparison
    wav_file = "test_audio.wav"
    if not os.path.exists(wav_file):
        subprocess.run(["ffmpeg", "-y", "-i", test_file, "-ar", "44100", "-ac", "2", wav_file], 
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return wav_file

def benchmark_old_demucs(wav_file):
    print("\n--- Benchmarking OLD Method (htdemucs subprocess) ---")
    out_dir = Path("bench_out_old")
    if out_dir.exists():
        shutil.rmtree(out_dir)
        
    cmd = ["python", "-m", "demucs.separate", "-n", "htdemucs", "--two-stems", "vocals", "-j", "1", str(wav_file), "-o", str(out_dir)]
    
    start_time = time.time()
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    end_time = time.time()
    
    duration = end_time - start_time
    print(f"Old Method Time: {duration:.2f} seconds")
    return duration

def benchmark_new_mdx(wav_file):
    print("\n--- Benchmarking NEW Method (MDX-Net native) ---")
    out_dir = Path("bench_out_new")
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(exist_ok=True)
        
    start_time = time.time()
    # Simulate our new global lazy init
    sep = Separator(log_level=logging.WARNING)
    sep.output_dir = str(out_dir)
    sep.output_format = "WAV"
    sep.load_model(model_filename='UVR-MDX-NET-Voc_FT.onnx')
    
    out_files = sep.separate(str(wav_file))
    end_time = time.time()
    
    duration = end_time - start_time
    print(f"New Method Time: {duration:.2f} seconds")
    return duration

if __name__ == "__main__":
    print("Preparing test audio (approx 15 seconds long)...")
    try:
        wav_file = download_test_audio()
        
        # Warmup (optional)
        print("Running benchmarks...")
        old_time = benchmark_old_demucs(wav_file)
        new_time = benchmark_new_mdx(wav_file)
        
        speedup = old_time / new_time
        print(f"\n======================================")
        print(f"RESULTS:")
        print(f"HTDemucs Subprocess: {old_time:.2f}s")
        print(f"MDX-Net Cached API : {new_time:.2f}s")
        print(f"Speedup: {speedup:.2f}x faster!")
        print(f"======================================")
        
    except Exception as e:
        print(f"Benchmark failed to run: {e}")
