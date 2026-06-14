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
    isolate_instrumental: str = Form("false"),
    four_stem: str = Form("false"),
    enhance_speech: str = Form("false"),
    stem_to_midi: str = Form("false"),
    de_reverb: str = Form("false"),
    lyric_sync: str = Form("false"),
    separate_speakers: str = Form("false"),
    metadata_csv: UploadFile = File(None)
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
        "metadata": {"filename": file.filename}
    })
    
    if email:
        db_manager.ensure_user(email)
    
    metadata_csv_path = None
    if metadata_csv and metadata_csv.filename:
        metadata_csv_path = os.path.join("downloads", f"{task_id}_{metadata_csv.filename}")
        with open(metadata_csv_path, "wb") as buffer:
            shutil.copyfileobj(metadata_csv.file, buffer)
    
    job_queue.put({
        "type": "audio",
        "task_id": task_id,
        "args": (
            file_path, 
            isolate_vocals.lower() == "true", 
            isolate_instrumental.lower() == "true", 
            four_stem.lower() == "true", 
            enhance_speech.lower() == "true", 
            stem_to_midi.lower() == "true", 
            de_reverb.lower() == "true", 
            lyric_sync.lower() == "true", 
            separate_speakers.lower() == "true", 
            email,
            metadata_csv_path
        )
    })
    
    from services.email_service import send_queued_email
    if email:
        send_queued_email(email, task_id)
        
    return {"task_id": task_id}

@router.post("/health")
async def check_audio_health(
    file: UploadFile = File(...)
):
    if not file:
        raise HTTPException(status_code=400, detail="File is required")
        
    task_id = str(uuid.uuid4())
    os.makedirs("downloads", exist_ok=True)
    file_path = os.path.join("downloads", f"health_{task_id}_{file.filename}")
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        from services.health_service import analyze_audio_health
        health_report = analyze_audio_health(file_path)
        
        # Clean up the temp file
        if os.path.exists(file_path):
            os.remove(file_path)
            
        return health_report
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))
