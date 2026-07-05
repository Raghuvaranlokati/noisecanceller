import os
import queue

job_queue = queue.Queue()

# We need a shared state object for active_task_id so it can be mutated
class State:
    active_task_id = None
    active_processes = {} # { task_id: subprocess.Popen }
    cancelled_tasks = set() # { task_id }

state = State()
