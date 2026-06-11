import time
from core.state import tasks_status, save_db
from services.audio_service import process_audio_file
from services.youtube_service import download_youtube_audio

def send_simulated_email(email: str, task_id: str):
    print("\n" + "="*50)
    print(f"📧 SIMULATED EMAIL SENT TO: {email}")
    print(f"Subject: Your extraction is complete!")
    print(f"Task ID: {task_id}")
    print(f"You can now return to the website and enter this ID in the top navbar to download your stems.")
    print("="*50 + "\n")

def run_audio_processing(task_id: str, file_path: str, isolate_vocals: bool, isolate_instrumental: bool, four_stem: bool, enhance_speech: bool, stem_to_midi: bool, de_reverb: bool, lyric_sync: bool, separate_speakers: bool, user_email: str):
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
            separate_speakers=separate_speakers
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

def run_youtube_download(task_id: str, youtube_url: str, format_choice: str, user_email: str):
    try:
        def progress_callback(progress_percent, message, **kwargs):
            tasks_status[task_id]["progress"] = progress_percent
            tasks_status[task_id]["message"] = message
            for key, value in kwargs.items():
                tasks_status[task_id][key] = value
            save_db()
            
        downloaded_file = download_youtube_audio(
            youtube_url, 
            format_choice, 
            task_id, 
            progress_callback
        )
        
        tasks_status[task_id]["status"] = "completed"
        tasks_status[task_id]["progress"] = 100
        tasks_status[task_id]["message"] = "Download complete! Ready to save."
        tasks_status[task_id]["result_path"] = downloaded_file
        tasks_status[task_id]["completed_time"] = time.time()
        save_db()
        
        if user_email:
            send_simulated_email(user_email, task_id)
            
    except Exception as e:
        tasks_status[task_id]["status"] = "failed"
        tasks_status[task_id]["message"] = str(e)
        print(f"Error processing youtube {task_id}: {e}")
