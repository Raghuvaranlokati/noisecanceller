from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os
import time
import json
import asyncio
from fastapi.responses import FileResponse, StreamingResponse
from core.state import job_queue, state
from core.database import db_manager

router = APIRouter(prefix="/api")

@router.get("/events/status/{task_id}")
async def events_status(task_id: str):
    async def event_generator():
        last_data = None
        while True:
            task = db_manager.get_task(task_id)
            if not task:
                yield f"data: {json.dumps({'error': 'Task not found'})}\n\n"
                break
                
            if task["status"] == "queued":
                # Calculate queue position
                pos = 1
                for job in list(job_queue.queue):
                    if isinstance(job, dict):
                        job_id = job.get("task_id")
                    else:
                        job_id = job[0]
                        
                    if job_id in state.cancelled_tasks:
                        continue
                        
                    if job_id == task_id:
                        break
                    pos += 1
                
                task["queue_position"] = pos
                task["eta_seconds"] = pos * 180 + (180 if state.active_task_id else 0)
                task["message"] = f"Waiting in queue... Position: {pos}"
            else:
                # Ensure processing/completed tasks don't have queue_position
                task.pop("queue_position", None)
                
            # Only send if changed to reduce bandwidth
            if str(task) != str(last_data):
                yield f"data: {json.dumps(task)}\n\n"
                last_data = task
                
            if task["status"] in ["completed", "failed", "cancelled"]:
                break
                
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/cancel/{task_id}")
async def cancel_task(task_id: str):
    task = db_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task["status"] == "completed":
        raise HTTPException(status_code=400, detail="Task already completed")
        
    state.cancelled_tasks.add(task_id)
    
    # If the task is currently processing via a tracked subprocess, kill it
    if task_id in state.active_processes:
        process = state.active_processes[task_id]
        if process and process.poll() is None:
            try:
                process.terminate() # Or kill()
            except Exception:
                pass
                
    if task["status"] == "queued":
        db_manager.upsert_task(task_id, {
            "status": "cancelled",
            "message": "Task cancelled by user"
        })
        
    return {"status": "cancelled"}

@router.get("/status/{task_id}")
async def get_status(task_id: str):
    task = db_manager.get_task(task_id)
    if not task:
        # Check if it exists on disk (rehydration after server restart)
        final_stems_dir = os.path.join("temp_workdir", task_id, "final_stems")
        if os.path.exists(final_stems_dir):
            task = {
                "status": "completed",
                "progress": 100,
                "message": "Recovered from disk",
                "result_path": os.path.join("temp_workdir", task_id, f"custom_stems_{task_id}.zip"),
                "start_time": time.time(),
                "completed_time": time.time()
            }
            db_manager.upsert_task(task_id, task)
        else:
            raise HTTPException(status_code=404, detail="Task not found")
            
    if task["status"] == "queued":
        # Calculate queue position
        pos = 1
        for job in list(job_queue.queue):
            if isinstance(job, dict):
                job_id = job.get("task_id")
            else:
                job_id = job[0]
                
            if job_id in state.cancelled_tasks:
                continue
                
            if job_id == task_id:
                break
            pos += 1
        
        task["queue_position"] = pos
        task["eta_seconds"] = pos * 180 + (180 if state.active_task_id else 0)
        task["message"] = f"Waiting in queue... Position: {pos}"
    else:
        task.pop("queue_position", None)
        
    return task

@router.get("/download/{task_id}")
async def download_result(task_id: str):
    task = db_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task["status"] != "completed" or not task.get("result_path"):
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
    task = db_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
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
            filename=f"{folder_name}.zip"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stream/{task_id}/{filename}")
async def stream_audio(task_id: str, filename: str):
    task = db_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
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

