import os
import yt_dlp
from pathlib import Path

def download_youtube_audio(youtube_url: str, format_choice: str, task_id: str, progress_callback):
    """
    Downloads audio from a YouTube video using yt-dlp and converts it to MP3 or WAV.
    """
    WORK_DIR = Path("temp_workdir") / task_id
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    
    # Send initial progress
    progress_callback(10, "Starting download...", step="1/2")

    # This hook will be called by yt-dlp to give us progress updates
    def yt_dlp_progress_hook(d):
        if d['status'] == 'downloading':
            # Try to calculate percentage
            try:
                total_bytes = d.get('total_bytes') or d.get('total_bytes_estimate')
                downloaded_bytes = d.get('downloaded_bytes', 0)
                if total_bytes and total_bytes > 0:
                    percent = int((downloaded_bytes / total_bytes) * 100)
                    # Map 0-100% of download to 10-60% of overall progress
                    mapped_percent = 10 + int(percent * 0.5)
                    progress_callback(mapped_percent, f"Downloading: {percent}%", step="1/2")
            except Exception:
                pass
        elif d['status'] == 'finished':
            progress_callback(60, "Download complete. Converting audio...", step="2/2")

    # Configure yt-dlp options
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': str(WORK_DIR / '%(title)s.%(ext)s'),
        'progress_hooks': [yt_dlp_progress_hook],
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': format_choice, # 'mp3' or 'wav'
            'preferredquality': '192', # Ignored for wav, used for mp3
        }],
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            # The actual downloaded filename might be sanitized by yt-dlp. 
            # We can find it by looking for the file in WORK_DIR ending with our chosen format.
            
            # Find the generated file
            downloaded_file = None
            for file in os.listdir(WORK_DIR):
                if file.endswith(f".{format_choice}"):
                    downloaded_file = str(WORK_DIR / file)
                    break
            
            if not downloaded_file:
                raise Exception(f"Failed to locate the converted {format_choice} file.")

            progress_callback(100, "Conversion complete!", step="Done")
            return downloaded_file

    except Exception as e:
        print(f"Error downloading YouTube audio: {e}")
        raise e
