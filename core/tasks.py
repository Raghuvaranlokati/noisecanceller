import time
from core.state import state
from core.database import db_manager
from services.audio_service import process_audio_file


def run_audio_processing(task_id: str, file_path: str, isolate_vocals: bool, isolate_instrumental: bool, four_stem: bool, enhance_speech: bool, stem_to_midi: bool, de_reverb: bool, lyric_sync: bool, separate_speakers: bool, user_email: str, metadata_csv_path: str = None):
    try:
        def progress_callback(progress_percent, message, **kwargs):
            update_data = {
                "progress": progress_percent,
                "message": message
            }
            update_data.update(kwargs)
            db_manager.upsert_task(task_id, update_data)
            
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
        
        db_manager.upsert_task(task_id, {
            "status": "completed",
            "progress": 100,
            "message": "Processing complete! Ready to download.",
            "result_path": zip_path,
            "completed_time": time.time()
        })
        

    except Exception as e:
        if str(e) == "Task cancelled by user":
            db_manager.upsert_task(task_id, {
                "status": "cancelled",
                "message": "Task cancelled by user"
            })
        else:
            db_manager.upsert_task(task_id, {
                "status": "failed",
                "message": str(e)
            })
        print(f"Error processing {task_id}: {e}")
