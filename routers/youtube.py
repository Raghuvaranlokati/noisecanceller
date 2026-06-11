from fastapi import APIRouter, Form, HTTPException
import uuid
from core.state import job_queue, tasks_status, save_db

router = APIRouter(prefix="/api")

@router.post("/youtube")
async def start_youtube_download(
    url: str = Form(...),
    format: str = Form("mp3"),
    email: str = Form("")
):
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    task_id = str(uuid.uuid4())
    
    tasks_status[task_id] = {
        "status": "queued",
        "progress": 0,
        "message": "Placed in queue...",
        "start_time": None,
        "filename": f"YouTube_{format.upper()}"
    }
    save_db()
    
    job_queue.put({
        "type": "youtube",
        "task_id": task_id,
        "url": url,
        "format": format,
        "email": email
    })
    
    return {"task_id": task_id}
