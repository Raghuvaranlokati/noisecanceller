import os
import json
import queue

DB_FILE = "tasks_db.json"

def load_db():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r") as f:
                return json.load(f)
        except Exception:
            # If the JSON is corrupted, return empty dictionary
            return {}
    return {}

tasks_status = load_db()

def save_db():
    with open(DB_FILE, "w") as f:
        json.dump(tasks_status, f, indent=4)

job_queue = queue.Queue()

# We need a shared state object for active_task_id so it can be mutated
class State:
    active_task_id = None
    active_processes = {} # { task_id: subprocess.Popen }
    cancelled_tasks = set() # { task_id }

state = State()
