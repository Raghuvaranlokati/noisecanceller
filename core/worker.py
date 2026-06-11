import time
import threading
from core.state import job_queue, tasks_status, save_db, state
from core.tasks import run_audio_processing

def queue_worker():
    while True:
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
        
        tasks_status[task_id]["status"] = "processing"
        tasks_status[task_id]["start_time"] = time.time()
        save_db()
        
        if task_type == "audio":
            if isinstance(job, tuple):
                _, file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, stem_to_midi, de_reverb, lyric_sync, separate_speakers, user_email = job
            else:
                args = job.get("args")
                file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, stem_to_midi, de_reverb, lyric_sync, separate_speakers, user_email = args
            run_audio_processing(task_id, file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, stem_to_midi, de_reverb, lyric_sync, separate_speakers, user_email)
        
        state.active_task_id = None
        job_queue.task_done()

def cleanup_worker():
    """Background thread to delete temporary files older than 24 hours"""
    import os
    while True:
        try:
            now = time.time()
            for directory in ["downloads", "results"]:
                if not os.path.exists(directory):
                    continue
                for filename in os.listdir(directory):
                    filepath = os.path.join(directory, filename)
                    if os.path.isfile(filepath):
                        # Delete if older than 24 hours (86400 seconds)
                        if os.stat(filepath).st_mtime < now - 86400:
                            try:
                                os.remove(filepath)
                                print(f"Cleaned up old file: {filepath}")
                            except Exception as e:
                                print(f"Failed to clean {filepath}: {e}")
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
