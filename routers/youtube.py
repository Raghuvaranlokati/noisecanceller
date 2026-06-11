from fastapi import APIRouter, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.concurrency import run_in_threadpool
import uuid
import os
from services.youtube_service import download_youtube_audio

router = APIRouter(prefix="/api")

@router.post("/youtube")
async def convert_youtube_to_audio(
    url: str = Form(...),
    format: str = Form("mp3")
):
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    task_id = str(uuid.uuid4())
    
    def dummy_progress(percent, message, step):
        # No progress updates needed for direct file download
        pass

    try:
        # Run the synchronous yt-dlp download in a background thread so it doesn't block the server
        downloaded_file = await run_in_threadpool(
            download_youtube_audio, 
            url, 
            format, 
            task_id, 
            dummy_progress
        )
        
        # Determine correct MIME type
        media_type = "audio/mpeg" if format == "mp3" else "audio/wav"
        
        # Return the file directly back to the user
        return FileResponse(
            path=downloaded_file, 
            filename=os.path.basename(downloaded_file),
            media_type=media_type
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process YouTube video: {str(e)}")
