import time
from core.state import tasks_status, save_db
from services.audio_service import process_audio_file

from services.email_service import send_completed_email

def run_audio_processing(task_id: str, file_path: str, isolate_vocals: bool, isolate_instrumental: bool, four_stem: bool, enhance_speech: bool, stem_to_midi: bool, de_reverb: bool, lyric_sync: bool, separate_speakers: bool, user_email: str, metadata_csv_path: str = None):
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
            enhance_speech=enhance_speech,
            stem_to_midi=stem_to_midi,
            de_reverb=de_reverb,
            lyric_sync=lyric_sync,
            separate_speakers=separate_speakers,
            metadata_csv_path=metadata_csv_path
        )
        
        tasks_status[task_id]["status"] = "completed"
        tasks_status[task_id]["progress"] = 100
        tasks_status[task_id]["message"] = "Processing complete! Ready to download."
        tasks_status[task_id]["result_path"] = zip_path
        tasks_status[task_id]["completed_time"] = time.time()
        save_db()
        
        if user_email:
            send_completed_email(user_email, task_id)
            
    except Exception as e:
        if str(e) == "Task cancelled by user":
            tasks_status[task_id]["status"] = "cancelled"
            tasks_status[task_id]["message"] = "Task cancelled by user"
        else:
            tasks_status[task_id]["status"] = "failed"
            tasks_status[task_id]["message"] = str(e)
        print(f"Error processing {task_id}: {e}")
