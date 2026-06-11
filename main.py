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
import json
import threading
import queue

from services.audio_service import process_audio_file

app = FastAPI()

# Allow CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "tasks_db.json"

def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r") as f:
            return json.load(f)
    return {}

tasks_status = load_db()

def save_db():
    with open(DB_FILE, "w") as f:
        json.dump(tasks_status, f, indent=4)

job_queue = queue.Queue()
active_task_id = None

def queue_worker():
    global active_task_id
    while True:
        job = job_queue.get()
        if job is None:
            break
        
        task_id, file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, user_email = job
        active_task_id = task_id
        
        tasks_status[task_id]["status"] = "processing"
        tasks_status[task_id]["start_time"] = time.time()
        save_db()
        
        run_audio_processing(task_id, file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, user_email)
        
        active_task_id = None
        job_queue.task_done()

# Start global worker thread
worker_thread = threading.Thread(target=queue_worker, daemon=True)
worker_thread.start()

def send_simulated_email(email: str, task_id: str):
    print("\n" + "="*50)
    print(f"📧 SIMULATED EMAIL SENT TO: {email}")
    print(f"Subject: Your audio extraction is complete!")
    print(f"Task ID: {task_id}")
    print(f"You can now return to the website and enter this ID in the top navbar to download your stems.")
    print("="*50 + "\n")

@app.post("/api/process")
async def start_processing(
    file: UploadFile = File(...),
    email: str = Form(""),
    isolate_vocals: str = Form("false"),
    isolate_instrumental: str = Form("false"),
    four_stem: str = Form("false"),
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
        "status": "queued",
        "progress": 0,
        "message": "Placed in queue...",
        "result_path": None,
        "step": "1/4",
        "start_time": None,
        "video_title": file.filename,
        "video_length": 0,
        "user_email": email
    }
    save_db()
    
    isolate_vocals_bool = isolate_vocals.lower() == "true"
    isolate_instrumental_bool = isolate_instrumental.lower() == "true"
    four_stem_bool = four_stem.lower() == "true"
    enhance_speech_bool = enhance_speech.lower() == "true"
    
    # Send to background worker queue instead of BackgroundTasks
    job_queue.put((task_id, file_path, isolate_vocals_bool, isolate_instrumental_bool, four_stem_bool, enhance_speech_bool, email))
    
    return {"task_id": task_id}

def run_audio_processing(task_id: str, file_path: str, isolate_vocals: bool, isolate_instrumental: bool, four_stem: bool, enhance_speech: bool, user_email: str):
    try:
        def progress_callback(progress_percent, message, **kwargs):
            tasks_status[task_id]["progress"] = progress_percent
            tasks_status[task_id]["message"] = message
            for key, value in kwargs.items():
                tasks_status[task_id][key] = value
            save_db()
            
        zip_path = process_audio_file(
            file_path, 
            task_id, 
            progress_callback,
            isolate_vocals=isolate_vocals,
            isolate_instrumental=isolate_instrumental,
            four_stem=four_stem,
            enhance_speech=enhance_speech
        )
        
        tasks_status[task_id]["status"] = "completed"
        tasks_status[task_id]["progress"] = 100
        tasks_status[task_id]["message"] = "Processing complete! Ready to download."
        tasks_status[task_id]["result_path"] = zip_path
        tasks_status[task_id]["completed_time"] = time.time()
        save_db()
        
        if user_email:
            send_simulated_email(user_email, task_id)
            
    except Exception as e:
        tasks_status[task_id]["status"] = "failed"
        tasks_status[task_id]["message"] = str(e)
        print(f"Error processing {task_id}: {e}")

@app.get("/api/status/{task_id}")
async def get_status(task_id: str):
    if task_id not in tasks_status:
        raise HTTPException(status_code=404, detail="Task not found")
        
    status_data = tasks_status[task_id].copy()
    
    if status_data["status"] == "queued":
        # Calculate queue position
        pos = 1
        for job in list(job_queue.queue):
            if job[0] == task_id:
                break
            pos += 1
        
        # If there is currently an active task, we are essentially at pos + 1 from the perspective of tasks running.
        # But for users, "Queue Position: 1" means you are next. 
        status_data["queue_position"] = pos
        status_data["message"] = f"Waiting in queue... Position: {pos}"
        
    return status_data

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

@app.get("/api/custom_download/{task_id}")
async def custom_download(
    task_id: str, 
    stems: str = "vocals", # comma separated
    format: str = "wav",
    chunked: str = "false"
):
    if task_id not in tasks_status:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task = tasks_status[task_id]
    if task["status"] != "completed":
        raise HTTPException(status_code=400, detail="Task not completed yet")
        
    stems_list = [s.strip() for s in stems.split(",")]
    is_chunked = chunked.lower() == "true"
    
    from services.audio_service import package_custom_download
    try:
        zip_path = package_custom_download(
            task_id, 
            stems=stems_list, 
            output_format=format, 
            chunked=is_chunked
        )
        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename=f"custom_stems_{task_id}.zip"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stream/{task_id}/{filename}")
async def stream_audio(task_id: str, filename: str):
    if task_id not in tasks_status:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task = tasks_status[task_id]
    if task["status"] != "completed" or not task["result_path"]:
        raise HTTPException(status_code=400, detail="Task not completed yet")
        
    file_path = os.path.join("temp_workdir", task_id, "final_stems", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(file_path, media_type="audio/wav")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
