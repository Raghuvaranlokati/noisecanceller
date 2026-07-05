import os
import shutil
import zipfile
import subprocess
import time
from pathlib import Path
from typing import Callable
from faster_whisper import WhisperModel

from audio_separator.separator import Separator

from pydub import AudioSegment
import torch
import logging

# Base directory for all temporary files during processing
WORK_DIR = Path("temp_workdir")

# Factory for Separator instances — create fresh to avoid stale model state
def create_separator(output_dir=None, output_format="WAV"):
    sep = Separator(log_level=logging.WARNING)
    if output_dir:
        sep.output_dir = str(output_dir)
    sep.output_format = output_format
    return sep

def process_audio_file(
    file_path: str, 
    task_id: str, 
    progress_callback: Callable[..., None],
    isolate_vocals: bool = False,

    enhance_speech: bool = False,

    de_reverb: bool = False,
    lyric_sync: bool = False,
    fast_mode: bool = True
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
        progress_callback(10, "Normalizing audio formats...")
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
        
        # Step 2: Stem Separation
        if isolate_vocals:
            progress_callback(30, "Analyzing audio and isolating core stems (takes a few minutes)...")
            from core.state import state
            
            # Check audio length for auto fallback
            audio_duration = 0
            try:
                audio_info = AudioSegment.from_wav(str(downloaded_audio_path))
                audio_duration = len(audio_info) / 1000.0  # in seconds
            except:
                pass
                
            sep = create_separator(output_dir=final_dir, output_format="WAV")
            
            # HIGH QUALITY MODE (MDX23C)
            progress_callback(40, "Running high-quality separation...")
            sep.load_model(model_filename='UVR-MDX-NET-Inst_HQ_3.onnx')
            
            if sep.model_instance is None:
                raise RuntimeError(f"Failed to load separation model. The model may not have downloaded correctly.")
            out_files = sep.separate(str(downloaded_audio_path))
            
            # audio-separator may return relative paths or just filenames.
            # Resolve them against the output directory to get the actual file path.
            for f in out_files:
                f_path = Path(f)
                if not f_path.is_absolute() or not f_path.exists():
                    f_path = final_dir / f_path.name
                if not f_path.exists():
                    print(f"WARNING: Separator output file not found: {f} (resolved: {f_path})")
                    continue
                f_name = f_path.name.lower()
                
                if "vocals" in f_name or "vocal" in f_name:
                    shutil.move(str(f_path), str(final_dir / "vocals.wav"))
                elif "instrumental" in f_name or "inst" in f_name:
                    shutil.move(str(f_path), str(final_dir / "instrumental.wav"))
                        
            import gc
            gc.collect()
        
        # Step 3: Enhance Speech (Optional)
        if enhance_speech:
            progress_callback(70, "Enhancing vocal clarity using Studio Denoise AI...")
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
                
            import gc
            gc.collect()
            
        # Step 4: AI De-Reverb (Optional)
        if de_reverb and (final_dir / "vocals.wav").exists():
            progress_callback(75, "Removing room echo using AI De-Reverb...")
            sep_dereverb = create_separator(output_dir=final_dir, output_format="WAV")
            # UVR-DeEcho-DeReverb is the standard model, but might take a minute to download on first run
            sep_dereverb.load_model(model_filename='UVR-DeEcho-DeReverb.pth')
            if sep_dereverb.model_instance is None:
                raise RuntimeError("Failed to load De-Reverb model. The model may not have downloaded correctly.")
            # Returns a list of strings [vocals_no_reverb.wav, reverb_only.wav]
            out_files = sep_dereverb.separate(str(final_dir / "vocals.wav"))
            # Assuming out_files[0] is the dry vocal, let's copy it over the original
            if len(out_files) > 0:
                f_path = Path(out_files[0])
                if not f_path.is_absolute() or not f_path.exists():
                    f_path = final_dir / f_path.name
                if f_path.exists():
                    shutil.copy(str(f_path), str(final_dir / "vocals_dry.wav"))

        # Step 5: Whisper Lyric Sync (Optional)
        target_audio_for_whisper = None
        if (final_dir / "vocals_dry.wav").exists():
            target_audio_for_whisper = final_dir / "vocals_dry.wav"
        elif (final_dir / "vocals.wav").exists():
            target_audio_for_whisper = final_dir / "vocals.wav"
        else:
            target_audio_for_whisper = final_dir / "original.wav"
            
        if lyric_sync and target_audio_for_whisper.exists():
            progress_callback(80, "Transcribing vocals and generating synced lyrics...")
            import json
            # Use large-v3-turbo model for significantly better Telugu accuracy
            model = WhisperModel("deepdml/faster-whisper-large-v3-turbo-ct2", device="cpu", compute_type="int8")
            segments, info = model.transcribe(
                str(target_audio_for_whisper), 
                word_timestamps=True,
                language="te",  # Hardcoded exactly to Telugu
                condition_on_previous_text=False
            )
            
            srt_path = final_dir / "lyrics.srt"
            json_path = final_dir / "transcript.json"
            word_list = []
            
            # Dataset Setup
            dataset_dir = final_dir / "dataset"
            dataset_audio_dir = dataset_dir / "audio"
            dataset_audio_dir.mkdir(parents=True, exist_ok=True)
            dataset_metadata_path = dataset_dir / "metadata.csv"
            
            # Load full audio for slicing
            full_audio = AudioSegment.from_wav(str(target_audio_for_whisper))
            
            timeline_markers = []
            prev_end = 0.0
            
            with open(srt_path, "w", encoding="utf-8") as f, open(dataset_metadata_path, "w", encoding="utf-8") as metadata_f:
                for i, segment in enumerate(segments, start=1):
                    def format_time(seconds):
                        hours = int(seconds // 3600)
                        minutes = int((seconds % 3600) // 60)
                        secs = int(seconds % 60)
                        millis = int((seconds - int(seconds)) * 1000)
                        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
                    
                    # SRT Writing
                    f.write(f"{i}\n")
                    f.write(f"{format_time(segment.start)} --> {format_time(segment.end)}\n")
                    text = segment.text.strip()
                    f.write(f"{text}\n\n")
                    
                    # Timeline markers
                    if segment.start - prev_end > 2.0 and prev_end > 0:
                        timeline_markers.append({
                            "type": "silence",
                            "start": prev_end,
                            "end": segment.start,
                            "duration": round(segment.start - prev_end, 2)
                        })
                    prev_end = segment.end
                    timeline_markers.append({
                        "type": "speech",
                        "start": segment.start,
                        "end": segment.end,
                        "text": text
                    })
                    
                    # Dataset Generation
                    start_ms = int(segment.start * 1000)
                    end_ms = int(segment.end * 1000)
                    chunk = full_audio[start_ms:end_ms]
                    wav_filename = f"{i:04d}.wav"
                    chunk.export(str(dataset_audio_dir / wav_filename), format="wav")
                    metadata_f.write(f"audio/{wav_filename}|{text}\n")
                    
                    if hasattr(segment, 'words') and segment.words:
                        for word_info in segment.words:
                            word_list.append({
                                "word": word_info.word.strip(),
                                "start": word_info.start,
                                "end": word_info.end
                            })
                            
            with open(json_path, "w", encoding="utf-8") as jf:
                json.dump({"words": word_list}, jf, indent=2)
                
            csv_path = final_dir / "transcript.csv"
            import csv
            with open(csv_path, "w", newline="", encoding="utf-8") as cf:
                writer = csv.writer(cf)
                writer.writerow(["word", "start", "end"])
                for w in word_list:
                    writer.writerow([w["word"], w["start"], w["end"]])
            
            # Write Timeline Intelligence (Silence Detection)
            timeline_path = final_dir / "timeline_markers.json"
            with open(timeline_path, "w", encoding="utf-8") as tf:
                json.dump({"markers": timeline_markers}, tf, indent=2)

        # Step 9: Zip the results
        progress_callback(90, "Finalizing and packaging your stems...")
        zip_path = WORK_DIR / f"vocals_{task_id}.zip"
        
        with zipfile.ZipFile(str(zip_path), 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(str(final_dir)):
                for file in files:
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, str(final_dir))
                    
                    # Determine target folder for architecture
                    arc_folder = ""
                    if rel_path.startswith("dataset"):
                        # Preserve dataset folder structure exactly
                        arcname = f"Stemify_Project/Transcripts/{rel_path.replace(os.sep, '/')}"
                        zipf.write(file_path, arcname=arcname)
                        continue
                        
                    if file in ["vocals.wav", "instrumental.wav", "bass.wav", "drums.wav", "original.wav"]:
                        arc_folder = "Audio_Stems"
                    elif file in ["vocals_enhanced.wav", "vocals_dry.wav"]:
                        arc_folder = "Enhanced_Audio"
                    elif file.startswith("speaker_") and file.endswith(".wav"):
                        arc_folder = "Speaker_Separation"
                    elif file.endswith(".mid"):
                        arc_folder = "MIDI_Notes"
                    elif file in ["lyrics.srt", "transcript.json", "transcript.csv", "aligned_timestamps.json", "aligned_timestamps.csv"]:
                        arc_folder = "Transcripts"
                    else:
                        arc_folder = "Misc"
                        
                    arcname = f"Stemify_Project/{arc_folder}/{file}"
                    zipf.write(file_path, arcname=arcname)
                    
        progress_callback(100, "Done!")
        return str(zip_path)
        
    finally:
        pass



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
                    
        # Handle subtitles and transcripts
        if chunked:
            import json
            import csv
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
            
            # Also copy the global .srt files to Transcripts folder just in case
            for text_file in ["lyrics.srt"]:
                src_file = final_stems_dir / text_file
                if src_file.exists():
                    shutil.copy(str(src_file), str(transcript_folder / text_file))
            
        else:
            # Copy subtitles and transcripts if they exist normally
            transcript_folder = base_dir / "Transcripts"
            transcript_folder.mkdir(exist_ok=True)
            for text_file in ["lyrics.srt", "transcript.json", "transcript.csv", "aligned_timestamps.json", "aligned_timestamps.csv"]:
                src_file = final_stems_dir / text_file
                if src_file.exists():
                    shutil.copy(str(src_file), str(transcript_folder / text_file))
                    
        # Also copy the dataset folder for ASR training if it exists (always included)
        transcript_folder = base_dir / "Transcripts"
        src_dataset = final_stems_dir / "dataset"
        if src_dataset.exists():
            shutil.copytree(str(src_dataset), str(transcript_folder / "dataset"), dirs_exist_ok=True)
                    
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
