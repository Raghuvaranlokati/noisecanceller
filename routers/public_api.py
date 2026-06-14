from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
import uuid
import os
import shutil
import time
from core.database import db_manager
from core.state import job_queue

router = APIRouter(prefix="/v1")

def verify_api_key(api_key: str = None):
    # Stub: in a real application, check the DB for the API key to identify the user
    # user = db_manager.get_user_by_api_key(api_key)
    # if not user: raise HTTPException(401, "Invalid API Key")
    # return user
    if not api_key:
        raise HTTPException(status_code=401, detail="API Key is required in 'api_key' query parameter or header")
    return {"email": "api_user@example.com"}

@router.post("/process")
async def public_process(
    file: UploadFile = File(...),
    api_key: str = Form(...),
    isolate_vocals: bool = Form(True),
    isolate_instrumental: bool = Form(True),
):
    """
    Public API Endpoint to trigger audio processing.
    """
    user = verify_api_key(api_key)
    
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
        "message": "Placed in queue via API...",
        "created_at": time.time(),
        "metadata": {"filename": file.filename, "source": "public_api"}
    })
    
    job_queue.put({
        "type": "audio",
        "task_id": task_id,
        "args": (
            file_path, 
            isolate_vocals, 
            isolate_instrumental, 
            False, # four_stem
            False, # enhance_speech
            False, # stem_to_midi
            False, # de_reverb
            False, # lyric_sync
            False, # separate_speakers
            user["email"],
            None
        )
    })
    
    return {
        "task_id": task_id,
        "status": "queued",
        "status_url": f"/v1/status/{task_id}?api_key={api_key}"
    }

@router.get("/status/{task_id}")
async def public_status(task_id: str, api_key: str):
    """
    Public API Endpoint to check task status.
    """
    verify_api_key(api_key)
    task = db_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    return {
        "task_id": task_id,
        "status": task.get("status"),
        "progress": task.get("progress"),
        "message": task.get("message"),
        "result_url": f"/api/stream/{task_id}/result.zip" if task.get("status") == "completed" else None
    }
