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
                    _, file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, stem_to_midi, de_reverb, lyric_sync, separate_speakers, user_email = job[:11]
                else:
                    args = job.get("args")
                    if len(args) == 10:
                        file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, stem_to_midi, de_reverb, lyric_sync, separate_speakers, user_email = args
                        metadata_csv_path = None
                    else:
                        file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, stem_to_midi, de_reverb, lyric_sync, separate_speakers, user_email, metadata_csv_path = args
                        
                run_audio_processing(task_id, file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, stem_to_midi, de_reverb, lyric_sync, separate_speakers, user_email, metadata_csv_path)
            
            state.active_task_id = None
            job_queue.task_done()
            
        except Exception as e:
            print(f"CRITICAL ERROR IN WORKER THREAD: {e}")
            try:
                state.active_task_id = None
                job_queue.task_done()
            except:
                pass

def cleanup_worker():
    """Background thread to delete temporary files older than 24 hours"""
    import os
    while True:
        try:
            now = time.time()
            for directory in ["temp_workdir", "downloads", "results"]:
                if not os.path.exists(directory):
                    continue
                for item in os.listdir(directory):
                    item_path = os.path.join(directory, item)
                    if os.path.isfile(item_path) or os.path.isdir(item_path):
                        # Delete if older than 24 hours (86400 seconds)
                        if os.stat(item_path).st_mtime < now - 86400:
                            try:
                                if os.path.isfile(item_path):
                                    os.remove(item_path)
                                else:
                                    import shutil
                                    shutil.rmtree(item_path)
                                print(f"Cleaned up old file/folder: {item_path}")
                            except Exception as e:
                                print(f"Failed to clean {item_path}: {e}")
        except Exception as e:
            print(f"Cleanup error: {e}")
        
        # Sleep for 15 minutes
        time.sleep(900)

def start_worker():
    worker_thread = threading.Thread(target=queue_worker, daemon=True)
    worker_thread.start()
    
    cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
    cleanup_thread.start()
    
    return worker_thread
