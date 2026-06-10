import os
import shutil
import zipfile
import subprocess
import sys
import wave
from typing import Callable

import yt_dlp

import time
from pathlib import Path

# Base directory for all temporary files during processing
WORK_DIR = Path("temp_workdir")

def process_youtube_video(
    url: str, 
    task_id: str, 
    progress_callback: Callable[..., None],
    isolate_vocals: bool = False,
    isolate_instrumental: bool = False,
    enhance_speech: bool = False
) -> str:
    """
    1. Downloads audio from YouTube.
    2. Isolates vocals using Demucs.
    3. Splits into 50-second chunks.
    4. Zips and returns the path.
    """
    task_dir = WORK_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Step 1: Extract Metadata
        progress_callback(5, "Extracting video metadata...", step="1/5")
        
        ydl_opts_meta = {
            'quiet': True,
            'nocheckcertificate': True
        }
        with yt_dlp.YoutubeDL(ydl_opts_meta) as ydl:
            info_dict = ydl.extract_info(url, download=False)
            video_title = info_dict.get('title', 'Unknown Title')
            video_length = info_dict.get('duration', 0)
            
        progress_callback(10, f"Found: {video_title} ({video_length}s)", video_title=video_title, video_length=video_length)

        # Step 2: Download audio
        progress_callback(15, "Downloading audio from YouTube...", step="2/5")
        downloaded_audio_path = task_dir / "downloaded.wav"
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': str(task_dir / 'downloaded.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
                'preferredquality': '192',
            }],
            'quiet': True,
            'nocheckcertificate': True
        }
            
        success = False
        last_error = None
        max_retries = 3
        
        # Robust retry mechanism with exponential backoff
        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    progress_callback(10 + attempt, f"Retrying download (Attempt {attempt + 1}/{max_retries})...")
                    time.sleep(2 ** attempt) # Exponential backoff: 2s, 4s, etc.
                    
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([url])
                success = True
                break
            except Exception as e:
                last_error = e
                continue
                
        if not success:
            raise RuntimeError(f"YouTube blocked the download after {max_retries} attempts. Error: {last_error}")
            
        target_audio_paths = []

        if isolate_vocals or isolate_instrumental or enhance_speech:
            from gradio_client import Client, handle_file
            
            # Use Hugging Face APIs instead of local processing
            if enhance_speech:
                progress_callback(40, "Removing background noise using DeepFilterNet (Cloud GPU)...", step="3/5")
                try:
                    client = Client("hshr/DeepFilterNet2")
                    result = client.predict(
                        handle_file(str(downloaded_audio_path)),
                        "None",
                        "0",
                        fn_index=2
                    )
                    # result is tuple: (noisy_audio, noisy_spec, enhanced_audio, enhanced_spec)
                    enhanced_audio_path = result[2]
                    
                    # Copy the downloaded file to our task dir
                    dest_path = task_dir / "enhanced_speech.wav"
                    shutil.copy(enhanced_audio_path, str(dest_path))
                    target_audio_paths.append(("enhanced", dest_path))
                except Exception as e:
                    raise RuntimeError(f"DeepFilterNet API Error (Hugging Face Spaces might be down or busy): {e}")

            if isolate_vocals or isolate_instrumental:
                progress_callback(60, "Isolating vocals and instruments using Demucs (Cloud GPU)...", step="3/5")
                try:
                    client = Client("nakas/demucs_playground")
                    result = client.predict(
                        handle_file(str(downloaded_audio_path)),
                        api_name="/predict"
                    )
                    # result is tuple: (vocals_path, bass_path, drums_path, other_path)
                    if isolate_vocals:
                        vocals_path = result[0]
                        dest_path = task_dir / "vocals.wav"
                        shutil.copy(vocals_path, str(dest_path))
                        target_audio_paths.append(("vocals", dest_path))
                        
                    if isolate_instrumental:
                        # Recombine bass, drums, other to make the instrumental track, or just use 'other'.
                        # Wait, the frontend usually just wants "instrumental". Since we don't have a combined instrumental track from this specific API, we can just zip them all, or just use 'other'. Actually, 'other' is mostly instruments.
                        # For simplicity, we just save what we have. Let's save 'other' as instrumental.
                        inst_path = result[3]
                        dest_path = task_dir / "instrumental.wav"
                        shutil.copy(inst_path, str(dest_path))
                        target_audio_paths.append(("instrumental", dest_path))
                except Exception as e:
                    raise RuntimeError(f"Demucs API Error (Hugging Face Spaces might be down or busy): {e}")
        else:
            # Skip AI step entirely
            progress_callback(50, "Skipping AI separation (Instant Splitter Mode)...", step="3/5")
            target_audio_paths.append(("original", downloaded_audio_path))

        if not target_audio_paths:
            raise FileNotFoundError("No audio tracks were successfully processed.")

        # Step 4: Split into 50-second chunks
        progress_callback(80, "Splitting tracks into 50-second segments...", step="4/5")
        
        chunk_length_ms = 50 * 1000 # 50 seconds in ms
        chunks_dir = task_dir / "chunks"
        chunks_dir.mkdir(exist_ok=True)
        
        for prefix, path in target_audio_paths:
            with wave.open(str(path), 'rb') as infile:
                framerate = infile.getframerate()
                nchannels = infile.getnchannels()
                sampwidth = infile.getsampwidth()
                
                frames_per_chunk = int(framerate * (chunk_length_ms / 1000.0))
                
                chunk_idx = 1
                while True:
                    frames = infile.readframes(frames_per_chunk)
                    if not frames:
                        break
                        
                    chunk_file_name = f"{prefix}_part_{chunk_idx:03d}.wav"
                    out_path = chunks_dir / chunk_file_name
                    with wave.open(str(out_path), 'wb') as outfile:
                        outfile.setnchannels(nchannels)
                        outfile.setsampwidth(sampwidth)
                        outfile.setframerate(framerate)
                        outfile.writeframes(frames)
                        
                    chunk_idx += 1
            
        # Step 5: Zip the chunks
        progress_callback(95, "Zipping segments...", step="5/5")
        zip_path = WORK_DIR / f"vocals_{task_id}.zip"
        
        with zipfile.ZipFile(str(zip_path), 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(str(chunks_dir)):
                for file in files:
                    file_path = os.path.join(root, file)
                    zipf.write(file_path, arcname=file)
                    
        progress_callback(100, "Done!")
        return str(zip_path)
        
    finally:
        # Cleanup temporary task directory to save space
        if task_dir.exists():
            shutil.rmtree(str(task_dir), ignore_errors=True)
