from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os
import time
from core.state import job_queue, tasks_status, state

router = APIRouter(prefix="/api")

@router.get("/status/{task_id}")
async def get_status(task_id: str):
    if task_id not in tasks_status:
        # Check if it exists on disk (rehydration after server restart)
        final_stems_dir = os.path.join("temp_workdir", task_id, "final_stems")
        if os.path.exists(final_stems_dir):
            tasks_status[task_id] = {
                "status": "completed",
                "progress": 100,
                "message": "Recovered from disk",
                "result_path": os.path.join("temp_workdir", task_id, f"custom_stems_{task_id}.zip"), # Might not exist, but custom_download recreates anyway
                "start_time": time.time(),
                "completed_time": time.time()
            }
        else:
            raise HTTPException(status_code=404, detail="Task not found")
        
    status_data = tasks_status[task_id].copy()
    
    if status_data["status"] == "queued":
        # Calculate queue position
        pos = 1
        for job in list(job_queue.queue):
            if isinstance(job, dict):
                job_id = job.get("task_id")
            else:
                job_id = job[0]
                
            if job_id == task_id:
                break
            pos += 1
        
        status_data["queue_position"] = pos
        status_data["eta_seconds"] = pos * 180 + (180 if state.active_task_id else 0)
        status_data["message"] = f"Waiting in queue... Position: {pos}"
        
    return status_data

@router.get("/download/{task_id}")
async def download_result(task_id: str):
    if task_id not in tasks_status:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task = tasks_status[task_id]
    if task["status"] != "completed" or not task["result_path"]:
        raise HTTPException(status_code=400, detail="Task not completed yet")
        
    file_path = task["result_path"]
    filename = os.path.basename(file_path)
    
    media_type = "application/zip"
    if filename.endswith(".mp3"):
        media_type = "audio/mpeg"
    elif filename.endswith(".wav"):
        media_type = "audio/wav"
        
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=filename
    )

from services.audio_service import package_custom_download
@router.get("/custom_download/{task_id}")
async def custom_download(
    task_id: str, 
    stems: str = "vocals", # comma separated
    format: str = "wav",
    chunked: str = "false",
    folder_name: str = "custom_stems"
):
    if task_id not in tasks_status:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task = tasks_status[task_id]
    if task["status"] != "completed":
        raise HTTPException(status_code=400, detail="Task not completed yet")
        
    requested_stems = [s.strip() for s in stems.split(",") if s.strip()]
    if not requested_stems:
        raise HTTPException(status_code=400, detail="No stems requested")
        
    try:
        zip_path = package_custom_download(
            task_id, 
            requested_stems, 
            output_format=format, 
            chunked=(chunked.lower() == "true"), 
            folder_name=folder_name
        )
        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename=f"{folder_name}_{task_id}.zip"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stream/{task_id}/{filename}")
async def stream_audio(task_id: str, filename: str):
    if task_id not in tasks_status:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task = tasks_status[task_id]
    if task["status"] != "completed":
        raise HTTPException(status_code=400, detail="Task not completed yet")
        
    file_path = os.path.join("temp_workdir", task_id, "final_stems", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    media_type = "application/octet-stream"
    if filename.endswith(".wav"):
        media_type = "audio/wav"
    elif filename.endswith(".mp3"):
        media_type = "audio/mpeg"
    elif filename.endswith(".json"):
        media_type = "application/json"
    elif filename.endswith(".srt") or filename.endswith(".txt") or filename.endswith(".csv"):
        media_type = "text/plain"
        
    return FileResponse(file_path, media_type=media_type)
