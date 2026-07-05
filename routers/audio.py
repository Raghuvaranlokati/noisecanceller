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

    enhance_speech: str = Form("false"),

    de_reverb: str = Form("false"),
    lyric_sync: str = Form("false"),


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
        "user_email": email,
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

            enhance_speech.lower() == "true", 

            de_reverb.lower() == "true", 
            lyric_sync.lower() == "true", 


            email,
            metadata_csv_path
        )
    })
    

    return {"task_id": task_id}

