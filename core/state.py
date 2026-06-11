import os
import json
import queue

DB_FILE = "tasks_db.json"

def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r") as f:
            return json.load(f)
    return {}

tasks_status = load_db()

def save_db():
    with open(DB_FILE, "w") as f:
        json.dump(tasks_status, f, indent=4)

job_queue = queue.Queue()

# We need a shared state object for active_task_id so it can be mutated
class State:
    active_task_id = None

state = State()
