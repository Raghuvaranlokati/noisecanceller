from fastapi import APIRouter, HTTPException, Request
import time
import uuid

router = APIRouter(prefix="/api/billing")

@router.post("/create-checkout-session")
async def create_checkout_session(request: Request):
    """
    Stub for creating a Stripe Checkout Session.
    In a real app, this would call stripe.checkout.Session.create(...)
    and return the session.url to redirect the user to Stripe.
    """
    data = await request.json()
    email = data.get("email")
    plan = data.get("plan", "pro")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required to upgrade")
        
    # Return a fake checkout URL for demonstration
    # In production: return {"url": session.url}
    fake_session_id = str(uuid.uuid4())
    fake_checkout_url = f"/checkout/success?session_id={fake_session_id}&email={email}"
    
    return {"url": fake_checkout_url}

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Stub for handling Stripe webhooks (e.g., checkout.session.completed).
    Updates the database to mark the user as is_premium=1.
    """
    # In a real app, verify the stripe signature here
    # event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    
    data = await request.json()
    
    # Simulate processing a successful checkout
    if data.get("type") == "checkout.session.completed":
        # Extract email from the session metadata
        email = data.get("data", {}).get("object", {}).get("customer_email")
        if email:
            from core.database import db_manager
            with db_manager.db_lock:
                conn = db_manager.get_connection()
                cursor = conn.cursor()
                # Give premium status and 300 credits
                cursor.execute(
                    "UPDATE users SET is_premium = 1, credits = credits + 300 WHERE email = ?",
                    (email,)
                )
                conn.commit()
                conn.close()
                
    return {"status": "success"}
