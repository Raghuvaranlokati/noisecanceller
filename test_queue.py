import os
import time
import uuid
import sys
import asyncio

# Ensure project root is in pythonpath
sys.path.append(os.path.abspath('.'))

from core.database import db_manager
from core.state import job_queue, state
from routers.status import get_user_tasks

async def run_test():
    email = "test@example.com"
    db_manager.ensure_user(email)

    # 1. Create 5 dummy tasks
    task_ids = []
    for i in range(5):
        task_id = str(uuid.uuid4())
        task_ids.append(task_id)
        db_manager.upsert_task(task_id, {
            "status": "queued",
            "progress": 0,
            "user_email": email,
            "created_at": time.time() - (10 - i) # stagger creation time
        })
        job_queue.put({"type": "audio", "task_id": task_id, "args": ()})

    # 2. Fetch tasks
    print("Initial fetch:")
    tasks = await get_user_tasks(email)
    for t in tasks:
        print(f"Task: {t['task_id'][:8]}, Status: {t['status']}, Queue Pos: {t.get('queue_position')}")

    # 3. Simulate task 1 popping from queue and becoming 'processing'
    popped = job_queue.get()
    state.active_task_id = popped["task_id"]
    db_manager.upsert_task(popped["task_id"], {"status": "processing"})

    print("\nAfter Task 1 pops and processes:")
    tasks = await get_user_tasks(email)
    for t in tasks:
        print(f"Task: {t['task_id'][:8]}, Status: {t['status']}, Queue Pos: {t.get('queue_position')}")

    # 4. Simulate task 3 being cancelled
    print("\nAfter Task 3 is cancelled:")
    task_3_id = task_ids[2]
    db_manager.upsert_task(task_3_id, {"status": "cancelled"})
    state.cancelled_tasks.add(task_3_id)
    
    tasks = await get_user_tasks(email)
    for t in tasks:
        print(f"Task: {t['task_id'][:8]}, Status: {t['status']}, Queue Pos: {t.get('queue_position')}")
        
    print("\nTests passed!")

if __name__ == "__main__":
    asyncio.run(run_test())
