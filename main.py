import sys
import os

# Fix Windows console unicode errors when printing emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.worker import start_worker
from routers import audio, status

app = FastAPI(title="Stemify AI API")

# Allow CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Start global worker thread
start_worker()

# Include Routers
app.include_router(audio.router)
app.include_router(status.router)
