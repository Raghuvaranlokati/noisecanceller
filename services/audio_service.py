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

def process_chunk(chunk_path: Path, dest_dir: Path, isolate_vocals: bool, isolate_instrumental: bool, four_stem: bool, enhance_speech: bool, chunk_idx: int) -> list[Path]:
    """Worker function to process a single audio chunk through AI."""
    from gradio_client import Client
    
    generated_files = []
    
    if enhance_speech:
        client = Client("hshr/DeepFilterNet2", hf_token=os.environ.get("HF_TOKEN"))
        for attempt in range(4):
            try:
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
                break
            except Exception as e:
                if attempt < 3:
                    time.sleep(10)
                else:
                    raise RuntimeError(f"DeepFilterNet API Error on chunk {chunk_idx}: {e}")

    if isolate_vocals or isolate_instrumental or four_stem:
        client = Client("nakas/demucs_playground", hf_token=os.environ.get("HF_TOKEN"))
        for attempt in range(4):
            try:
                result = client.predict(
                    str(chunk_path),
                    api_name="/predict"
                )
                
                # result[0] = Vocals, result[1] = Bass, result[2] = Drums, result[3] = Other
                if isolate_vocals:
                    vocals_path = result[0]
                    dest_path = dest_dir / f"vocals_part_{chunk_idx:03d}.wav"
                    shutil.copy(vocals_path, str(dest_path))
                    if dest_path not in generated_files: generated_files.append(dest_path)
                    
                if isolate_instrumental and not four_stem:
                    inst_path = result[3]
                    dest_path = dest_dir / f"instrumental_part_{chunk_idx:03d}.wav"
                    shutil.copy(inst_path, str(dest_path))
                    if dest_path not in generated_files: generated_files.append(dest_path)
                    
                if four_stem:
                    bass_path = result[1]
                    dest_path_bass = dest_dir / f"bass_part_{chunk_idx:03d}.wav"
                    shutil.copy(bass_path, str(dest_path_bass))
                    if dest_path_bass not in generated_files: generated_files.append(dest_path_bass)
                    
                    drums_path = result[2]
                    dest_path_drums = dest_dir / f"drums_part_{chunk_idx:03d}.wav"
                    shutil.copy(drums_path, str(dest_path_drums))
                    if dest_path_drums not in generated_files: generated_files.append(dest_path_drums)
                    
                    other_path = result[3]
                    dest_path_other = dest_dir / f"instrumental_part_{chunk_idx:03d}.wav"
                    shutil.copy(other_path, str(dest_path_other))
                    if dest_path_other not in generated_files: generated_files.append(dest_path_other)
                
                break # Success! Break the retry loop
            except Exception as e:
                if attempt < 3:
                    time.sleep(10)
                else:
                    raise RuntimeError(f"Demucs API Error on chunk {chunk_idx}: {e}")
            
    return generated_files

def process_audio_file(
    file_path: str, 
    task_id: str, 
    progress_callback: Callable[..., None],
    isolate_vocals: bool = False,
    isolate_instrumental: bool = False,
    four_stem: bool = False,
    enhance_speech: bool = False
) -> str:
    """
    1. Converts uploaded file to WAV format.
    2. Isolates vocals using Demucs.
    3. Splits into 50-second chunks.
    4. Merges chunks and returns the zip path.
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

        # Step 3: AI Processing in Parallel
        processed_chunks_dir = task_dir / "processed_chunks"
        processed_chunks_dir.mkdir(exist_ok=True)
        
        if isolate_vocals or isolate_instrumental or four_stem or enhance_speech:
            progress_callback(50, f"Processing {len(raw_chunk_paths)} chunks sequentially (Cloud GPU)...", step="3/4", 
                              chunks_total=len(raw_chunk_paths), chunks_completed=0, chunks_pending=len(raw_chunk_paths))
            
            # Limit to 1 worker to strictly respect Hugging Face API rate limits
            max_workers = 1
            completed = 0
            
            start_processing_time = time.time()
            
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_to_chunk = {
                    executor.submit(process_chunk, path, processed_chunks_dir, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, idx): idx
                    for idx, path in raw_chunk_paths
                }
                
                for future in as_completed(future_to_chunk):
                    idx = future_to_chunk[future]
                    try:
                        generated = future.result()
                        completed += 1
                        
                        elapsed = time.time() - start_processing_time
                        avg_time_per_chunk = elapsed / completed
                        eta_seconds = int((len(raw_chunk_paths) - completed) * avg_time_per_chunk)
                        
                        progress_callback(50 + int((completed / len(raw_chunk_paths)) * 40), 
                                       f"Processing chunk {completed} of {len(raw_chunk_paths)}...", 
                                       step="3/4",
                                       chunks_total=len(raw_chunk_paths),
                                       chunks_completed=completed,
                                       chunks_pending=len(raw_chunk_paths) - completed,
                                       eta_seconds=eta_seconds)
                    except Exception as exc:
                        raise RuntimeError(f"Chunk {idx} generated an exception: {exc}")
                        
            final_dir_to_zip = processed_chunks_dir
        else:
            # Skip AI step entirely
            progress_callback(80, "Skipping AI separation (Instant Splitter Mode)...", step="3/4")
            final_dir_to_zip = raw_chunks_dir

        # Helper to merge chunks into full files
        def merge_wavs(prefix, out_filename):
            files = sorted([f for f in os.listdir(final_dir_to_zip) if f.startswith(prefix) and f.endswith(".wav")])
            if not files: return
            
            out_path = final_dir_to_zip / out_filename
            with wave.open(str(final_dir_to_zip / files[0]), 'rb') as first_wav:
                params = first_wav.getparams()
                
            with wave.open(str(out_path), 'wb') as out_wav:
                out_wav.setparams(params)
                for f in files:
                    with wave.open(str(final_dir_to_zip / f), 'rb') as w:
                        out_wav.writeframes(w.readframes(w.getnframes()))
                        
            # Remove chunk files after merging
            for f in files:
                os.remove(str(final_dir_to_zip / f))

        # Merge chunks
        progress_callback(90, "Merging audio stems...", step="4/4")
        merge_wavs("vocals_part_", "vocals.wav")
        merge_wavs("instrumental_part_", "instrumental.wav")
        merge_wavs("bass_part_", "bass.wav")
        merge_wavs("drums_part_", "drums.wav")
        merge_wavs("enhanced_part_", "enhanced.wav")
        merge_wavs("raw_part_", "original.wav")

        # Step 4: Zip the chunks
        progress_callback(95, "Zipping stems...", step="4/4")
        zip_path = WORK_DIR / f"vocals_{task_id}.zip"
        
        with zipfile.ZipFile(str(zip_path), 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(str(final_dir_to_zip)):
                for file in files:
                    file_path = os.path.join(root, file)
                    zipf.write(file_path, arcname=file)
                    
        progress_callback(100, "Done!")
        return str(zip_path)
        
    finally:
        # Keep the directory temporarily for streaming, it will be cleaned up via CRON or let's not delete it yet!
        # If we delete it, the audio player won't work!
        # Wait, if we delete task_dir, the audio player throws a 404. We shouldn't delete task_dir immediately.
        pass
