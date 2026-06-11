import os
import shutil
import zipfile
import subprocess
import time
from pathlib import Path
from typing import Callable
from faster_whisper import WhisperModel
from basic_pitch.inference import predict_and_save
from audio_separator.separator import Separator
from pyannote.audio import Pipeline
from pydub import AudioSegment
import torch

# Base directory for all temporary files during processing
WORK_DIR = Path("temp_workdir")

def process_audio_file(
    file_path: str, 
    task_id: str, 
    progress_callback: Callable[..., None],
    isolate_vocals: bool = False,
    isolate_instrumental: bool = False,
    four_stem: bool = False,
    enhance_speech: bool = False,
    stem_to_midi: bool = False,
    de_reverb: bool = False,
    lyric_sync: bool = False,
    separate_speakers: bool = False
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
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    raise RuntimeError(f"Native Demucs processing failed. STDOUT: {result.stdout}\nSTDERR: {result.stderr}")
            except Exception as e:
                raise RuntimeError(f"Native Demucs processing crashed. Error: {e}")
                
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
            progress_callback(70, "Enhancing speech quality (Native DeepFilterNet3)...", step="2/3")
            try:
                from df.enhance import enhance, init_df, load_audio, save_audio
                
                target_for_enhance = final_dir / "vocals.wav"
                if not target_for_enhance.exists():
                    target_for_enhance = downloaded_audio_path
                    
                model, df_state, _ = init_df()  # Load default DeepFilterNet3 model
                audio, _ = load_audio(str(target_for_enhance), sr=df_state.sr())
                enhanced = enhance(model, df_state, audio)
                
                out_path = final_dir / "enhanced.wav"
                save_audio(str(out_path), enhanced, df_state.sr())
                
                # Replace the vocals file with the enhanced version if it exists
                if target_for_enhance.name == "vocals.wav":
                    shutil.copy(str(out_path), str(final_dir / "vocals.wav"))
            except Exception as e:
                print(f"Warning: Enhance speech failed: {e}")
                
        # Step 4: AI De-Reverb (Optional)
        if de_reverb and (final_dir / "vocals.wav").exists():
            progress_callback(75, "Running AI De-Reverb...", step="2/3")
            try:
                sep = Separator()
                # UVR-DeEcho-DeReverb is the standard model, but might take a minute to download on first run
                sep.load_model(model_filename='UVR-DeEcho-DeReverb.pth')
                # Returns a list of strings [vocals_no_reverb.wav, reverb_only.wav]
                out_files = sep.separate(str(final_dir / "vocals.wav"))
                # Assuming out_files[0] is the dry vocal, let's copy it over the original
                if len(out_files) > 0:
                    shutil.copy(out_files[0], str(final_dir / "vocals_dry.wav"))
            except Exception as e:
                print(f"Warning: De-Reverb failed: {e}")

        # Step 5: Whisper Lyric Sync (Optional)
        if lyric_sync and (final_dir / "vocals.wav").exists():
            progress_callback(80, "Transcribing lyrics...", step="2/3")
            try:
                # Use tiny model for speed on CPU
                model = WhisperModel("tiny", device="cpu", compute_type="int8")
                segments, info = model.transcribe(str(final_dir / "vocals.wav"), word_timestamps=False)
                
                srt_path = final_dir / "lyrics.srt"
                with open(srt_path, "w", encoding="utf-8") as f:
                    for i, segment in enumerate(segments, start=1):
                        def format_time(seconds):
                            hours = int(seconds // 3600)
                            minutes = int((seconds % 3600) // 60)
                            secs = int(seconds % 60)
                            millis = int((seconds - int(seconds)) * 1000)
                            return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
                        
                        f.write(f"{i}\n")
                        f.write(f"{format_time(segment.start)} --> {format_time(segment.end)}\n")
                        f.write(f"{segment.text.strip()}\n\n")
            except Exception as e:
                print(f"Warning: Lyric sync failed: {e}")

        # Step 6: Stem-to-MIDI (Optional)
        if stem_to_midi:
            progress_callback(85, "Converting to MIDI...", step="2/3")
            try:
                if (final_dir / "bass.wav").exists():
                    predict_and_save(
                        [str(final_dir / "bass.wav")],
                        str(final_dir),
                        True, False, False, False # save_midi=True
                    )
                if (final_dir / "instrumental.wav").exists():
                    predict_and_save(
                        [str(final_dir / "instrumental.wav")],
                        str(final_dir),
                        True, False, False, False
                    )
            except Exception as e:
                print(f"Warning: Stem-to-MIDI failed: {e}")
                
        # Step 7: Separate Speakers (Optional)
        target_audio_for_separation = None
        if (final_dir / "vocals.wav").exists():
            target_audio_for_separation = final_dir / "vocals.wav"
        elif (final_dir / "original.wav").exists():
            target_audio_for_separation = final_dir / "original.wav"
            
        if separate_speakers and target_audio_for_separation:
            progress_callback(88, "Detecting different speakers...", step="2/3")
            try:
                hf_token = os.environ.get("HF_TOKEN")
                if not hf_token:
                    raise Exception("HF_TOKEN not found in environment. Pyannote requires it.")
                    
                pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    use_auth_token=hf_token
                )
                
                # Use CPU for now to prevent VRAM crashes, or GPU if available
                device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
                pipeline.to(device)

                audio_path_str = str(target_audio_for_separation)
                diarization = pipeline(audio_path_str)
                
                full_audio = AudioSegment.from_wav(audio_path_str)
                speaker_segments = {}
                
                # Group segments by speaker
                for turn, _, speaker in diarization.itertracks(yield_label=True):
                    start_ms = int(turn.start * 1000)
                    end_ms = int(turn.end * 1000)
                    segment = full_audio[start_ms:end_ms]
                    
                    if speaker not in speaker_segments:
                        speaker_segments[speaker] = segment
                    else:
                        speaker_segments[speaker] += segment
                        
                # Export distinct speaker files
                for speaker, audio in speaker_segments.items():
                    # Exporting as e.g., SPEAKER_00.wav, SPEAKER_01.wav
                    audio.export(str(final_dir / f"{speaker}.wav"), format="wav")
                    
            except Exception as e:
                print(f"Warning: Speaker Separation failed: {e}")

        # Step 8: Zip the results
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

def create_custom_zip(task_id: str, requested_stems: list[str], format: str = "wav", chunked: bool = False, folder_name: str = "custom_stems") -> str:
    import zipfile
    import os
    base_dir = os.path.join("temp_workdir", task_id)
    zip_path = os.path.join(base_dir, f"{folder_name}_{task_id}.zip")
    
    stems_dir = os.path.join(base_dir, "final_stems")
    if chunked:
        stems_dir = os.path.join(base_dir, "chunked")
        
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        if os.path.exists(stems_dir):
            for root, _, files in os.walk(stems_dir):
                for file in files:
                    if file.endswith(f".{format}"):
                        # Check if this file is one of the requested stems
                        if any(stem.lower() in file.lower() for stem in requested_stems):
                            zipf.write(os.path.join(root, file), file)
    return zip_path

def package_custom_download(
    task_id: str, 
    stems: list[str], 
    output_format: str = "wav", 
    chunked: bool = False,
    folder_name: str = "custom_stems"
) -> str:
    """
    Packages a custom download based on the UI selections.
    Supports on-the-fly format conversion (mp3/wav) and chunking into 50s segments.
    """
    task_dir = WORK_DIR / task_id
    final_stems_dir = task_dir / "final_stems"
    
    if not final_stems_dir.exists():
        raise FileNotFoundError("Processing not complete or files missing.")
        
    # Create a unique staging directory for this specific download configuration
    timestamp = int(time.time())
    staging_dir = task_dir / f"custom_pkg_{timestamp}"
    
    # Nest inside the custom folder name so the ZIP extracts cleanly into a single folder
    base_dir = staging_dir / folder_name
    base_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        for stem in stems:
            stem_file = final_stems_dir / f"{stem.lower()}.wav"
            if not stem_file.exists():
                continue
                
            # Create subfolder for this stem e.g., "Vocals/"
            stem_folder = base_dir / stem.capitalize()
            stem_folder.mkdir(exist_ok=True)
            
            if chunked:
                # Use FFmpeg to split into 50 second chunks ad0001, ad0002...
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
                # No chunking, just convert/copy
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
                    
        # Zip everything up
        zip_path = task_dir / f"custom_download_{timestamp}.zip"
        with zipfile.ZipFile(str(zip_path), 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(str(staging_dir)):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, str(staging_dir))
                    zipf.write(file_path, arcname=arcname)
                    
        return str(zip_path)
    finally:
        # Clean up the staging directory to save space
        if staging_dir.exists():
            shutil.rmtree(str(staging_dir), ignore_errors=True)
