from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import uuid
import os
import shutil
import time
from core.state import job_queue
from core.database import db_manager

router = APIRouter(prefix="/api")

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import uuid
import os
import shutil
import time
from core.state import job_queue
from core.database import db_manager

router = APIRouter(prefix="/api")

@router.post("/process")
async def start_processing(
    file: UploadFile = File(...),
    email: str = Form(""),
    isolate_vocals: str = Form("false"),
    stem_count: int = Form(2),
    de_reverb: str = Form("false"),
    enhance_speech: str = Form("false"),
    lyric_sync: str = Form("false"),
):
    if not file:
        raise HTTPException(status_code=400, detail="File is required")
        
    task_id = str(uuid.uuid4())
    
    os.makedirs("downloads", exist_ok=True)
    file_path = os.path.join("downloads", f"{task_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    db_manager.upsert_task(task_id, {
        "status": "queued",
        "progress": 0,
        "message": "Placed in queue...",
        "created_at": time.time(),
        "user_email": email,
        "metadata": {"filename": file.filename},
        "options": {
            "isolateVocals": isolate_vocals.lower() == "true",
            "stemCount": stem_count,
            "deReverb": de_reverb.lower() == "true",
            "enhance": enhance_speech.lower() == "true",
            "lyricSync": lyric_sync.lower() == "true"
        }
    })
    
    if email:
        db_manager.ensure_user(email)
    
    job_queue.put({
        "type": "audio",
        "task_id": task_id,
        "args": (
            file_path, 
            isolate_vocals.lower() == "true", 
            stem_count,
            de_reverb.lower() == "true",
            enhance_speech.lower() == "true", 
            lyric_sync.lower() == "true", 
            email
        )
    })
    
    return {"task_id": task_id}

@router.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="File is required")
        
    os.makedirs("temp_analysis", exist_ok=True)
    file_path = os.path.join("temp_analysis", f"analysis_{uuid.uuid4()}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        from services.analysis_service import analyze_audio_file
        import asyncio
        # Run in threadpool to avoid blocking
        result = await asyncio.to_thread(analyze_audio_file, file_path)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            os.remove(file_path)
        except:
            pass

@router.post("/render_pitch")
async def render_pitch(
    file: UploadFile = File(...),
    pitch_shift: float = Form(0.0),
    tempo_shift: float = Form(1.0)
):
    if not file:
        raise HTTPException(status_code=400, detail="File is required")
        
    os.makedirs("temp_pitch", exist_ok=True)
    uid = str(uuid.uuid4())
    in_path = os.path.join("temp_pitch", f"in_{uid}_{file.filename}")
    out_path = os.path.join("temp_pitch", f"out_{uid}.wav")
    
    with open(in_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        import subprocess
        # FFmpeg asetrate changes pitch AND speed. atempo fixes speed.
        # Ratio for pitch shift: 2 ** (semitones / 12)
        pitch_ratio = 2 ** (pitch_shift / 12)
        # New sample rate
        new_sr = int(44100 * pitch_ratio)
        
        # We need the final tempo to be tempo_shift (e.g. 1.2x)
        # But asetrate also changes tempo by pitch_ratio.
        # So we need to apply atempo to counteract the asetrate speed change AND apply the desired tempo shift.
        # Required atempo = tempo_shift / pitch_ratio
        required_atempo = tempo_shift / pitch_ratio
        
        # FFmpeg atempo only supports 0.5 to 100.0. If required_atempo is outside, we might need multiple atempos.
        # For simplicity, we assume it's within bounds for normal music pitching (e.g. 0.5 to 2.0)
        
        cmd = [
            "ffmpeg", "-y", "-i", in_path,
            "-af", f"asetrate={new_sr},aresample=44100,atempo={required_atempo}",
            "-ar", "44100", "-ac", "2", out_path
        ]
        
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        from fastapi.responses import FileResponse
        return FileResponse(out_path, media_type="audio/wav", filename=f"pitched_{file.filename}.wav")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
