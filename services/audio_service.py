import os
import shutil
import zipfile
import subprocess
import sys
import wave
from typing import Callable

import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Base directory for all temporary files during processing
WORK_DIR = Path("temp_workdir")

def process_chunk(chunk_path: Path, dest_dir: Path, isolate_vocals: bool, isolate_instrumental: bool, enhance_speech: bool, chunk_idx: int) -> list[Path]:
    """Worker function to process a single audio chunk through AI."""
    from gradio_client import Client
    
    generated_files = []
    
    if enhance_speech:
        try:
            client = Client("hshr/DeepFilterNet2")
            result = client.predict(
                str(chunk_path),
                "None",
                "0",
                str(chunk_path),
                api_name="/denoise"
            )
            enhanced_audio_path = result[2]
            dest_path = dest_dir / f"enhanced_part_{chunk_idx:03d}.wav"
            shutil.copy(enhanced_audio_path, str(dest_path))
            generated_files.append(dest_path)
        except Exception as e:
            raise RuntimeError(f"DeepFilterNet API Error on chunk {chunk_idx}: {e}")

    if isolate_vocals or isolate_instrumental:
        try:
            client = Client("nakas/demucs_playground")
            result = client.predict(
                str(chunk_path),
                api_name="/predict"
            )
            if isolate_vocals:
                vocals_path = result[0]
                dest_path = dest_dir / f"vocals_part_{chunk_idx:03d}.wav"
                shutil.copy(vocals_path, str(dest_path))
                generated_files.append(dest_path)
                
            if isolate_instrumental:
                inst_path = result[3]
                dest_path = dest_dir / f"instrumental_part_{chunk_idx:03d}.wav"
                shutil.copy(inst_path, str(dest_path))
                generated_files.append(dest_path)
        except Exception as e:
            raise RuntimeError(f"Demucs API Error on chunk {chunk_idx}: {e}")
            
    return generated_files

def process_audio_file(
    file_path: str, 
    task_id: str, 
    progress_callback: Callable[..., None],
    isolate_vocals: bool = False,
    isolate_instrumental: bool = False,
    enhance_speech: bool = False
) -> str:
    """
    1. Converts uploaded file to WAV format.
    2. Isolates vocals using Demucs.
    3. Splits into 50-second chunks.
    4. Zips and returns the path.
    """
    task_dir = WORK_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Step 1: Convert audio to standard WAV format
        progress_callback(10, "Converting audio to standard format...", step="1/4")
        downloaded_audio_path = task_dir / "converted.wav"
        
        try:
            subprocess.run([
                "ffmpeg", "-y", "-i", str(file_path),
                "-ar", "44100", "-ac", "2", str(downloaded_audio_path)
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"FFmpeg failed to convert the file. Is it a valid audio/video file? {e}")

        # Step 2: Split into 50-second chunks FIRST
        progress_callback(30, "Splitting tracks into 50-second segments...", step="2/4")
        
        chunk_length_ms = 50 * 1000 # 50 seconds in ms
        raw_chunks_dir = task_dir / "raw_chunks"
        raw_chunks_dir.mkdir(exist_ok=True)
        
        raw_chunk_paths = []
        with wave.open(str(downloaded_audio_path), 'rb') as infile:
            framerate = infile.getframerate()
            nchannels = infile.getnchannels()
            sampwidth = infile.getsampwidth()
            
            frames_per_chunk = int(framerate * (chunk_length_ms / 1000.0))
            
            chunk_idx = 1
            while True:
                frames = infile.readframes(frames_per_chunk)
                if not frames:
                    break
                    
                chunk_file_name = f"raw_part_{chunk_idx:03d}.wav"
                out_path = raw_chunks_dir / chunk_file_name
                with wave.open(str(out_path), 'wb') as outfile:
                    outfile.setnchannels(nchannels)
                    outfile.setsampwidth(sampwidth)
                    outfile.setframerate(framerate)
                    outfile.writeframes(frames)
                    
                raw_chunk_paths.append((chunk_idx, out_path))
                chunk_idx += 1

        # Step 4: AI Processing in Parallel
        processed_chunks_dir = task_dir / "processed_chunks"
        processed_chunks_dir.mkdir(exist_ok=True)
        
        if isolate_vocals or isolate_instrumental or enhance_speech:
            progress_callback(50, f"Processing {len(raw_chunk_paths)} chunks in parallel (Cloud GPU)...", step="3/4")
            
            # Limit to 5 concurrent workers to respect API rate limits from a single IP address
            max_workers = min(5, len(raw_chunk_paths))
            completed = 0
            
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_to_chunk = {
                    executor.submit(process_chunk, path, processed_chunks_dir, isolate_vocals, isolate_instrumental, enhance_speech, idx): idx
                    for idx, path in raw_chunk_paths
                }
                
                for future in as_completed(future_to_chunk):
                    idx = future_to_chunk[future]
                    try:
                        generated = future.result()
                        completed += 1
                        progress_callback(50 + int((completed / len(raw_chunk_paths)) * 40), 
                                       f"Processed {completed}/{len(raw_chunk_paths)} chunks...", step="3/4")
                    except Exception as exc:
                        raise RuntimeError(f"Chunk {idx} generated an exception: {exc}")
                        
            final_dir_to_zip = processed_chunks_dir
        else:
            # Skip AI step entirely
            progress_callback(80, "Skipping AI separation (Instant Splitter Mode)...", step="3/4")
            final_dir_to_zip = raw_chunks_dir

        # Step 4: Zip the chunks
        progress_callback(95, "Zipping segments...", step="4/4")
        zip_path = WORK_DIR / f"vocals_{task_id}.zip"
        
        with zipfile.ZipFile(str(zip_path), 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(str(final_dir_to_zip)):
                for file in files:
                    file_path = os.path.join(root, file)
                    zipf.write(file_path, arcname=file)
                    
        progress_callback(100, "Done!")
        return str(zip_path)
        
    finally:
        # Cleanup temporary task directory to save space
        if task_dir.exists():
            shutil.rmtree(str(task_dir), ignore_errors=True)
