import os
import sys
# Fix Windows console unicode errors when printing emojis (like gradio_client's checkmark)
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import shutil
import time

from services.audio_service import process_youtube_video

app = FastAPI()

# Allow CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory status tracker (for a production app, use Redis/DB)
tasks_status = {}

class YouTubeRequest(BaseModel):
    url: str
    isolate_vocals: bool = False
    isolate_instrumental: bool = False
    enhance_speech: bool = False

@app.post("/api/process")
async def start_processing(request: YouTubeRequest, background_tasks: BackgroundTasks):
    if not request.url:
        raise HTTPException(status_code=400, detail="YouTube URL is required")
        
    task_id = str(uuid.uuid4())
    tasks_status[task_id] = {
        "status": "pending",
        "progress": 0,
        "message": "Initializing...",
        "result_path": None,
        "step": "1/5",
        "start_time": time.time(),
        "video_title": "",
        "video_length": 0
    }
    
    background_tasks.add_task(
        run_audio_processing, 
        task_id, 
        request.url, 
        request.isolate_vocals, 
        request.isolate_instrumental,
        request.enhance_speech
    )
    
    return {"task_id": task_id}

def run_audio_processing(task_id: str, url: str, isolate_vocals: bool, isolate_instrumental: bool, enhance_speech: bool):
    try:
        def progress_callback(progress_percent, message, **kwargs):
            tasks_status[task_id]["progress"] = progress_percent
            tasks_status[task_id]["message"] = message
            for key, value in kwargs.items():
                tasks_status[task_id][key] = value
            
        zip_path = process_youtube_video(
            url, 
            task_id, 
            progress_callback,
            isolate_vocals=isolate_vocals,
            isolate_instrumental=isolate_instrumental,
            enhance_speech=enhance_speech
        )
        
        tasks_status[task_id]["status"] = "completed"
        tasks_status[task_id]["progress"] = 100
        tasks_status[task_id]["message"] = "Processing complete! Ready to download."
        tasks_status[task_id]["result_path"] = zip_path
    except Exception as e:
        tasks_status[task_id]["status"] = "failed"
        tasks_status[task_id]["message"] = str(e)
        print(f"Error processing {task_id}: {e}")

@app.get("/api/status/{task_id}")
async def get_status(task_id: str):
    if task_id not in tasks_status:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks_status[task_id]

@app.get("/api/download/{task_id}")
async def download_result(task_id: str):
    if task_id not in tasks_status:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task = tasks_status[task_id]
    if task["status"] != "completed" or not task["result_path"]:
        raise HTTPException(status_code=400, detail="Task not completed yet")
        
    return FileResponse(
        task["result_path"],
        media_type="application/zip",
        filename=f"vocals_{task_id}.zip"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
