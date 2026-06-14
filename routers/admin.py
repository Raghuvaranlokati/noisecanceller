from fastapi import APIRouter, HTTPException, Depends
from core.database import db_manager

router = APIRouter(prefix="/api/admin")

# In production, add a dependency to verify admin API key / JWT
def verify_admin(api_key: str = None):
    # Stub for admin verification
    # if api_key != "secret-admin-key":
    #     raise HTTPException(status_code=401, detail="Unauthorized")
    return True

@router.get("/analytics")
async def get_analytics(_ = Depends(verify_admin)):
    """
    Returns platform-wide statistics for the admin dashboard.
    """
    with db_manager.db_lock:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        # Total tasks
        cursor.execute("SELECT COUNT(*) as c FROM tasks")
        total_tasks = cursor.fetchone()["c"]
        
        # Tasks by status
        cursor.execute("SELECT status, COUNT(*) as c FROM tasks GROUP BY status")
        status_counts = {row["status"]: row["c"] for row in cursor.fetchall()}
        
        # Total users
        cursor.execute("SELECT COUNT(*) as c FROM users")
        total_users = cursor.fetchone()["c"]
        
        # Premium users
        cursor.execute("SELECT COUNT(*) as c FROM users WHERE is_premium = 1")
        premium_users = cursor.fetchone()["c"]
        
        # Recent tasks
        cursor.execute("SELECT task_id, status, created_at, user_email FROM tasks ORDER BY created_at DESC LIMIT 10")
        recent_tasks = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
    return {
        "total_tasks": total_tasks,
        "status_counts": status_counts,
        "total_users": total_users,
        "premium_users": premium_users,
        "recent_tasks": recent_tasks
    }
