import sys
import os

# Fix Windows console unicode errors when printing emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.worker import start_worker
from core.database import db_manager
from routers import audio, status, admin, public_api

app = FastAPI(title="Stemify AI API")

# Allow CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fail any tasks that were stuck in memory during a server restart
db_manager.fail_stuck_tasks()

# Start global worker thread
start_worker()

# Include Routers
app.include_router(audio.router)
app.include_router(status.router)
app.include_router(admin.router)
app.include_router(public_api.router)
