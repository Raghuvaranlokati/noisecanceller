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
                        fast_mode = True
                    elif len(args) == 11:
                        file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, stem_to_midi, de_reverb, lyric_sync, separate_speakers, user_email, metadata_csv_path = args
                        fast_mode = True
                    else:
                        file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, stem_to_midi, de_reverb, lyric_sync, separate_speakers, fast_mode, user_email, metadata_csv_path = args
                        
                run_audio_processing(task_id, file_path, isolate_vocals, isolate_instrumental, four_stem, enhance_speech, stem_to_midi, de_reverb, lyric_sync, separate_speakers, user_email, metadata_csv_path, fast_mode)
            
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
