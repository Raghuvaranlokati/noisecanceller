import os
import sys
# Fix Windows console unicode errors when printing emojis (like gradio_client's checkmark)
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from fastapi import FastAPI, BackgroundTasks, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
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

@app.post("/api/process")
async def start_processing(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    isolate_vocals: str = Form("false"),
    isolate_instrumental: str = Form("false"),
    enhance_speech: str = Form("false")
):
    if not file:
        raise HTTPException(status_code=400, detail="File is required")
        
    task_id = str(uuid.uuid4())
    
    os.makedirs("downloads", exist_ok=True)
    file_path = os.path.join("downloads", f"{task_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    tasks_status[task_id] = {
        "status": "pending",
        "progress": 0,
        "message": "File received. Initializing...",
        "result_path": None,
        "step": "1/4",
        "start_time": time.time(),
        "video_title": file.filename,
        "video_length": 0
    }
    
    isolate_vocals_bool = isolate_vocals.lower() == "true"
    isolate_instrumental_bool = isolate_instrumental.lower() == "true"
    enhance_speech_bool = enhance_speech.lower() == "true"
    
    background_tasks.add_task(
        run_audio_processing, 
        task_id, 
        file_path, 
        isolate_vocals_bool, 
        isolate_instrumental_bool,
        enhance_speech_bool
    )
    
    return {"task_id": task_id}

def run_audio_processing(task_id: str, file_path: str, isolate_vocals: bool, isolate_instrumental: bool, enhance_speech: bool):
    try:
        def progress_callback(progress_percent, message, **kwargs):
            tasks_status[task_id]["progress"] = progress_percent
            tasks_status[task_id]["message"] = message
            for key, value in kwargs.items():
                tasks_status[task_id][key] = value
            
        zip_path = process_youtube_video(
            file_path, 
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
