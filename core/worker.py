import time
import threading
from core.state import job_queue, state
from core.database import db_manager
from core.tasks import run_audio_processing

def queue_worker():
    while True:
        try:
            job = job_queue.get()
            if job is None:
                break
            
            if isinstance(job, dict):
                task_type = job.get("type")
                task_id = job.get("task_id")
            else:
                # Legacy tuple fallback
                task_type = "audio"
                task_id = job[0]
                
            state.active_task_id = task_id
            
            # Check if the task was cancelled while sitting in the queue
            if task_id in state.cancelled_tasks:
                state.active_task_id = None
                job_queue.task_done()
                continue
                
            db_manager.upsert_task(task_id, {
                "status": "processing",
                "start_time": time.time()
            })
            
            if task_type == "audio":
                if isinstance(job, tuple):
                    # Fallback for very old legacy tuple format
                    metadata_csv_path = None
                    _, file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, de_reverb, lyric_sync, user_email = job[:9]
                else:
                    args = job.get("args")
                    # Should be exactly 9 arguments now
                    if len(args) == 9:
                        file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, de_reverb, lyric_sync, user_email, metadata_csv_path = args
                    else:
                        raise ValueError(f"Unexpected number of arguments in job: {len(args)}")
                        
                run_audio_processing(task_id, file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, de_reverb, lyric_sync, user_email, metadata_csv_path)
            
            state.active_task_id = None
            job_queue.task_done()
            
        except Exception as e:
            print(f"CRITICAL ERROR IN WORKER THREAD: {e}")
            try:
                state.active_task_id = None
                job_queue.task_done()
            except:
                pass

def start_worker():
    worker_thread = threading.Thread(target=queue_worker, daemon=True)
    worker_thread.start()
    return worker_thread
