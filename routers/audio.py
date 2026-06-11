from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import uuid
import os
import shutil
from core.state import job_queue, tasks_status, save_db

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
    separate_speakers: str = Form("false")
):
    if not file:
        raise HTTPException(status_code=400, detail="File is required")
        
    task_id = str(uuid.uuid4())
    
    os.makedirs("downloads", exist_ok=True)
    file_path = os.path.join("downloads", f"{task_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    tasks_status[task_id] = {
        "status": "queued",
        "progress": 0,
        "message": "Placed in queue...",
        "start_time": None,
        "filename": file.filename
    }
    save_db()
    
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
            email
        )
    })
    
    return {"task_id": task_id}
