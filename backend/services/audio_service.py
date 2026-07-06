import os
import shutil
import zipfile
import subprocess
import time
from pathlib import Path
from typing import Callable
from faster_whisper import WhisperModel

from audio_separator.separator import Separator

import wave
import soundfile as sf
import torch
import logging
import threading

class ProgressSimulator:
    def __init__(self, callback, start_pct, end_pct, duration_sec, message):
        self.callback = callback
        self.start_pct = start_pct
        self.end_pct = end_pct
        self.duration_sec = duration_sec if duration_sec > 0 else 60
        self.message = message
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._run, daemon=True)
        
    def start(self):
        self.thread.start()
        
    def stop(self):
        self.stop_event.set()
        if self.thread.is_alive():
            self.thread.join(timeout=1.0)
        
    def _run(self):
        start_time = time.time()
        while not self.stop_event.is_set():
            elapsed = time.time() - start_time
            if elapsed >= self.duration_sec:
                current_pct = self.end_pct - 1
            else:
                progress = elapsed / self.duration_sec
                # Linear progress
                current_pct = int(self.start_pct + (self.end_pct - self.start_pct) * progress)
                current_pct = min(current_pct, self.end_pct - 1)
                
            self.callback(current_pct, self.message)
            self.stop_event.wait(3.0)

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
        
        # Determine audio duration for progress simulators
        audio_duration = 0
        try:
            with wave.open(str(downloaded_audio_path), "rb") as wav_f:
                frames = wav_f.getnframes()
                rate = wav_f.getframerate()
                audio_duration = frames / float(rate)
        except:
            pass
        
        # Step 2: Stem Separation
        if isolate_vocals:
            progress_callback(30, "Analyzing audio and isolating core stems (takes a few minutes)...")
            from core.state import state
                
            sep = create_separator(output_dir=final_dir, output_format="WAV")
            
            # HIGH QUALITY MODE (MDX23C)
            progress_callback(40, "Running high-quality separation...")
            sep.load_model(model_filename='UVR-MDX-NET-Inst_HQ_3.onnx')
            
            if sep.model_instance is None:
                raise RuntimeError(f"Failed to load separation model. The model may not have downloaded correctly.")
            
            sim = ProgressSimulator(progress_callback, 40, 69, audio_duration * 1.5, "Running high-quality separation (this will take a while)...")
            sim.start()
            try:
                out_files = sep.separate(str(downloaded_audio_path))
            finally:
                sim.stop()
            
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
                        
            # Free memory explicitly to prevent Hugging Face OOM crashes
            del sep
            import gc
            gc.collect()
        
        # Step 3: Enhance Speech (Optional)
        if enhance_speech:
            progress_callback(70, "Enhancing vocal clarity using Studio Denoise AI...")
            from df.enhance import enhance, init_df, load_audio, save_audio
            
            target_for_enhance = final_dir / "vocals.wav"
            if not target_for_enhance.exists():
                target_for_enhance = downloaded_audio_path
                
            # Segment target_for_enhance WAV file into 5-minute chunks using FFmpeg's copy/segment
            chunk_pattern = str(final_dir / "chunk_%03d.wav")
            try:
                subprocess.run([
                    "ffmpeg", "-y", "-i", str(target_for_enhance),
                    "-f", "segment", "-segment_time", "300",
                    "-c", "copy", chunk_pattern
                ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except subprocess.CalledProcessError as e:
                raise RuntimeError(f"FFmpeg segmenting failed: {e}")
                
            chunk_files = sorted(list(final_dir.glob("chunk_*.wav")))
            enhanced_chunks = []
            
            if not chunk_files:
                raise RuntimeError("No audio chunks generated for speech enhancement.")
                
            model, df_state, _ = init_df()  # Load default DeepFilterNet3 model
            
            sim = ProgressSimulator(progress_callback, 70, 79, audio_duration * 0.2, "Enhancing vocal clarity using Studio Denoise AI...")
            sim.start()
            try:
                for idx, chunk_file in enumerate(chunk_files):
                    # Load only the chunk's audio into memory
                    audio, _ = load_audio(str(chunk_file), sr=df_state.sr())
                    
                    # Run DeepFilterNet vocal enhancement on it
                    enhanced_chunk = enhance(model, df_state, audio)
                    
                    # Save result
                    enhanced_chunk_path = final_dir / f"enhanced_chunk_{idx:03d}.wav"
                    save_audio(str(enhanced_chunk_path), enhanced_chunk, df_state.sr())
                    enhanced_chunks.append(enhanced_chunk_path)
                    
                    # Delete variables, run gc.collect() to clear PyTorch/Python tensors
                    del audio
                    del enhanced_chunk
                    import gc
                    gc.collect()
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
            finally:
                sim.stop()
                
            # Free model variables
            del model
            del df_state
            import gc
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                
            # Concatenate the enhanced chunk WAV files back using FFmpeg's zero-copy copy concat demuxer
            concat_list_path = final_dir / "concat_list.txt"
            with open(concat_list_path, "w", encoding="utf-8") as f:
                for chunk_path in enhanced_chunks:
                    f.write(f"file '{Path(chunk_path).absolute().as_posix()}'\n")
                    
            out_path = final_dir / "enhanced.wav"
            try:
                subprocess.run([
                    "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                    "-i", str(concat_list_path),
                    "-c", "copy", str(out_path)
                ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except subprocess.CalledProcessError as e:
                raise RuntimeError(f"FFmpeg concatenation failed: {e}")
            finally:
                # Clean up temporary chunk files
                for chunk_file in chunk_files:
                    try:
                        os.remove(chunk_file)
                    except:
                        pass
                for chunk_path in enhanced_chunks:
                    try:
                        os.remove(chunk_path)
                    except:
                        pass
                try:
                    os.remove(concat_list_path)
                except:
                    pass
            
            # Replace the vocals file with the enhanced version if it exists
            if target_for_enhance.name == "vocals.wav":
                shutil.copy(str(out_path), str(final_dir / "vocals.wav"))
            
        # Step 5: Whisper Lyric Sync (Optional)
        target_audio_for_whisper = None
        if (final_dir / "vocals.wav").exists():
            target_audio_for_whisper = final_dir / "vocals.wav"
        else:
            target_audio_for_whisper = final_dir / "original.wav"
            
        if lyric_sync and target_audio_for_whisper.exists():
            progress_callback(80, "Transcribing vocals and generating synced lyrics...")
            import json
            
            # Auto-detect GPU for massive speed boosts if upgraded on Hugging Face
            device = "cuda" if torch.cuda.is_available() else "cpu"
            compute_type = "float16" if device == "cuda" else "int8"
            
            # Use large-v3-turbo model for significantly better Telugu accuracy
            model = WhisperModel("deepdml/faster-whisper-large-v3-turbo-ct2", device=device, compute_type=compute_type)
            segments, info = model.transcribe(
                str(target_audio_for_whisper), 
                word_timestamps=True,
                language="te",  # Hardcoded exactly to Telugu
                condition_on_previous_text=False
            )
            
            srt_path = final_dir / "lyrics.srt"
            json_path = final_dir / "transcript.json"
            word_list = []
            
            # Convert audio to XTTS standard (Mono, 24000Hz)
            progress_callback(80, "Converting audio to 24kHz Mono for XTTS dataset...")
            target_xtts = final_dir / "target_xtts.wav"
            try:
                subprocess.run([
                    "ffmpeg", "-y", "-i", str(target_audio_for_whisper),
                    "-ar", "24000", "-ac", "1", str(target_xtts)
                ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except subprocess.CalledProcessError as e:
                raise RuntimeError(f"FFmpeg XTTS conversion failed: {e}")

            # Dataset Setup
            dataset_dir = final_dir / "final_dataset"
            dataset_audio_dir = dataset_dir / "wavs"
            dataset_audio_dir.mkdir(parents=True, exist_ok=True)
            
            dataset_metadata = []
            
            # SoundFile-based Seek-and-Slice for Dataset Generation
            timeline_markers = []
            prev_end = 0.0
            
            with open(srt_path, "w", encoding="utf-8") as f, \
                 sf.SoundFile(str(target_xtts), 'r') as sf_in:
                
                sr = sf_in.samplerate
                subtype = sf_in.subtype
                total_frames = sf_in.frames
                
                for i, segment in enumerate(segments, start=1):
                    # Native progress reporting based on timestamp
                    if audio_duration > 0:
                        pct = 80 + int(15 * (segment.end / audio_duration))
                        progress_callback(min(pct, 95), "Transcribing vocals and generating synced lyrics...")
                        
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
                    
                    # Dataset Generation (SoundFile-based seek and slice)
                    start_frame = int(segment.start * sr)
                    end_frame = int(segment.end * sr)
                    start_frame = max(0, min(start_frame, total_frames))
                    end_frame = max(0, min(end_frame, total_frames))
                    num_frames = end_frame - start_frame
                    
                    if num_frames > 0:
                        sf_in.seek(start_frame)
                        chunk_data = sf_in.read(num_frames)
                        wav_filename = f"{i:04d}.wav"
                        wav_id = f"{i:04d}"
                        sf.write(str(dataset_audio_dir / wav_filename), chunk_data, sr, format="WAV", subtype=subtype)
                        dataset_metadata.append(f"{wav_id}|{text}|{text}\n")
                    
                    if hasattr(segment, 'words') and segment.words:
                        for word_info in segment.words:
                            word_list.append({
                                "word": word_info.word.strip(),
                                "start": word_info.start,
                                "end": word_info.end
                            })
                            
            with open(json_path, "w", encoding="utf-8") as jf:
                json.dump({"words": word_list}, jf, indent=2)
                
            # Finalize Dataset Splits (Train/Eval/Metadata)
            import random
            # Make a copy for consistent original order in metadata, shuffle for splits
            dataset_metadata_shuffled = dataset_metadata.copy()
            random.shuffle(dataset_metadata_shuffled)
            
            split_idx = int(len(dataset_metadata_shuffled) * 0.9)
            train_data = dataset_metadata_shuffled[:split_idx]
            eval_data = dataset_metadata_shuffled[split_idx:]
            
            with open(dataset_dir / "metadata.csv", "w", encoding="utf-8") as mf:
                mf.writelines(dataset_metadata)
            with open(dataset_dir / "train.csv", "w", encoding="utf-8") as tr_f:
                tr_f.writelines(train_data)
            with open(dataset_dir / "eval.csv", "w", encoding="utf-8") as ev_f:
                ev_f.writelines(eval_data)
                
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
                
            # Free memory explicitly
            del model
            import gc
            gc.collect()
            
            try:
                os.remove(str(target_xtts))
            except:
                pass

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
                    if rel_path.startswith("final_dataset"):
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
