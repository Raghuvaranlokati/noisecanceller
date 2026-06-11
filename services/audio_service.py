import os
import shutil
import zipfile
import subprocess
import time
from pathlib import Path
from typing import Callable
from gradio_client import Client

# Base directory for all temporary files during processing
WORK_DIR = Path("temp_workdir")

# Global dictionary to cache Gradio Clients and prevent rapid WebSocket connections/disconnections
_CLIENTS = {}

def get_client(model_id: str):
    if model_id not in _CLIENTS:
        _CLIENTS[model_id] = Client(model_id, hf_token=os.environ.get("HF_TOKEN"))
    return _CLIENTS[model_id]

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
    2. Isolates stems natively using Demucs (no API limits).
    3. Merges files and returns the zip path.
    """
    task_dir = WORK_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Step 1: Convert audio to standard WAV format
        progress_callback(10, "Converting audio to standard format...", step="1/3")
        downloaded_audio_path = task_dir / "converted.wav"
        
        try:
            subprocess.run([
                "ffmpeg", "-y", "-i", str(file_path),
                "-ar", "44100", "-ac", "2", str(downloaded_audio_path)
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"FFmpeg failed to convert the file. Is it a valid audio/video file? {e}")

        final_dir = task_dir / "final_stems"
        final_dir.mkdir(exist_ok=True)
        shutil.copy(str(downloaded_audio_path), str(final_dir / "original.wav"))
        
        # Step 2: Native Demucs Separation
        if isolate_vocals or isolate_instrumental or four_stem:
            progress_callback(30, "Isolating stems natively (this guarantees NO rate limits, please wait 3-5 mins)...", step="2/3")
            demucs_out = task_dir / "demucs_out"
            
            cmd = ["python", "-m", "demucs.separate", "-n", "htdemucs", str(downloaded_audio_path), "-o", str(demucs_out)]
            if not four_stem:
                cmd.insert(5, "--two-stems")
                cmd.insert(6, "vocals")
                
            try:
                subprocess.run(cmd, check=True)
            except subprocess.CalledProcessError as e:
                raise RuntimeError(f"Native Demucs processing failed. Please ensure your file is valid. Error: {e}")
                
            # Demucs outputs to: {demucs_out}/htdemucs/converted/{stem}.wav
            demucs_converted_dir = demucs_out / "htdemucs" / "converted"
            
            if four_stem:
                if (demucs_converted_dir / "vocals.wav").exists():
                    shutil.copy(str(demucs_converted_dir / "vocals.wav"), str(final_dir / "vocals.wav"))
                if (demucs_converted_dir / "bass.wav").exists():
                    shutil.copy(str(demucs_converted_dir / "bass.wav"), str(final_dir / "bass.wav"))
                if (demucs_converted_dir / "drums.wav").exists():
                    shutil.copy(str(demucs_converted_dir / "drums.wav"), str(final_dir / "drums.wav"))
                if (demucs_converted_dir / "other.wav").exists():
                    shutil.copy(str(demucs_converted_dir / "other.wav"), str(final_dir / "instrumental.wav"))
            else:
                if (demucs_converted_dir / "vocals.wav").exists():
                    shutil.copy(str(demucs_converted_dir / "vocals.wav"), str(final_dir / "vocals.wav"))
                if (demucs_converted_dir / "no_vocals.wav").exists():
                    shutil.copy(str(demucs_converted_dir / "no_vocals.wav"), str(final_dir / "instrumental.wav"))
        
        # Step 3: Enhance Speech (Optional)
        if enhance_speech:
            progress_callback(70, "Enhancing speech quality (API)...", step="2/3")
            try:
                client = get_client("hshr/DeepFilterNet2")
                # process the full file at once if possible, it might timeout, but we only have 1 call so we shouldn't get 429
                result = client.predict(str(downloaded_audio_path), "None", "0", str(downloaded_audio_path), api_name="/denoise")
                shutil.copy(result[2], str(final_dir / "enhanced.wav"))
            except Exception as e:
                print(f"Warning: Enhance speech failed: {e}")
                
        # Step 4: Zip the results
        progress_callback(90, "Zipping stems...", step="3/3")
        zip_path = WORK_DIR / f"vocals_{task_id}.zip"
        
        with zipfile.ZipFile(str(zip_path), 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(str(final_dir)):
                for file in files:
                    file_path = os.path.join(root, file)
                    zipf.write(file_path, arcname=file)
                    
        progress_callback(100, "Done!")
        return str(zip_path)
        
    finally:
        pass
