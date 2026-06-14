import sqlite3
import json
import threading
from pathlib import Path
import time

DB_PATH = Path("database.db")
db_lock = threading.Lock()

class DatabaseManager:
    def __init__(self):
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        with db_lock:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Tasks Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                task_id TEXT PRIMARY KEY,
                user_email TEXT,
                status TEXT,
                progress INTEGER,
                step TEXT,
                message TEXT,
                created_at REAL,
                start_time REAL,
                completed_time REAL,
                queue_position INTEGER,
                eta_seconds REAL,
                result_path TEXT,
                error TEXT,
                metadata TEXT
            )
            """)
            
            # Users Table (for quotas, premium status)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                email TEXT PRIMARY KEY,
                is_premium BOOLEAN DEFAULT 0,
                credits INTEGER DEFAULT 10,
                last_reset REAL
            )
            """)
            
            conn.commit()
            conn.close()
            
    def get_task(self, task_id: str):
        with db_lock:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                d = dict(row)
                if d.get("metadata"):
                    try:
                        d["metadata"] = json.loads(d["metadata"])
                    except:
                        pass
                return d
            return None

    def upsert_task(self, task_id: str, data: dict):
        with db_lock:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT task_id FROM tasks WHERE task_id = ?", (task_id,))
            exists = cursor.fetchone()
            
            metadata_str = json.dumps(data.get("metadata", {})) if "metadata" in data else None
            
            if exists:
                updates = []
                values = []
                for k, v in data.items():
                    if k == "task_id" or k == "metadata": continue
                    updates.append(f"{k} = ?")
                    values.append(v)
                if "metadata" in data:
                    updates.append("metadata = ?")
                    values.append(metadata_str)
                    
                if updates:
                    values.append(task_id)
                    query = f"UPDATE tasks SET {', '.join(updates)} WHERE task_id = ?"
                    cursor.execute(query, values)
            else:
                columns = []
                values = []
                placeholders = []
                for k, v in data.items():
                    if k == "metadata": continue
                    columns.append(k)
                    values.append(v)
                    placeholders.append("?")
                
                if "metadata" in data:
                    columns.append("metadata")
                    values.append(metadata_str)
                    placeholders.append("?")
                    
                columns.append("task_id")
                values.append(task_id)
                placeholders.append("?")
                
                query = f"INSERT INTO tasks ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
                cursor.execute(query, values)
                
            conn.commit()
            conn.close()
            
    def get_user(self, email: str):
        with db_lock:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            conn.close()
            return dict(row) if row else None
            
    def ensure_user(self, email: str):
        user = self.get_user(email)
        if not user:
            with db_lock:
                conn = self.get_connection()
                cursor = conn.cursor()
                cursor.execute("INSERT INTO users (email, is_premium, credits, last_reset) VALUES (?, 0, 10, ?)", (email, time.time()))
                conn.commit()
                conn.close()
            return self.get_user(email)
        return user

    def fail_stuck_tasks(self):
        """Marks any tasks stuck in 'queued' or 'processing' as failed when server restarts"""
        with db_lock:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE tasks SET status = 'failed', message = 'Server restarted. Please try uploading again.' WHERE status IN ('queued', 'processing')"
            )
            conn.commit()
            conn.close()

db_manager = DatabaseManager()
