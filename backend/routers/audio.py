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
