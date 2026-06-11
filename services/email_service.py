import os
import resend

resend.api_key = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL = "onboarding@resend.dev" # Default testing email for Resend free tier
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

def send_queued_email(user_email: str, task_id: str):
    subject = "🎵 Your Audio Extraction is Queued!"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your song is in the queue!</h2>
        <p>We have successfully received your audio file and it is currently waiting in line for the AI pipeline.</p>
        <p>You can safely close the tab. You can track its live progress or access your Studio Mixer here:</p>
        <a href="{FRONTEND_URL}/history" style="display:inline-block;padding:12px 24px;background:#1877F2;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:20px;">Track Progress</a>
        <p style="color: #666; margin-top: 30px; font-size: 12px;">Task ID: <strong>{task_id}</strong></p>
    </div>
    """
    
    _send_email(user_email, subject, html_content)

def send_completed_email(user_email: str, task_id: str):
    subject = "✨ Your Audio Stems are Ready!"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #FAFAFA; padding: 40px; border-radius: 16px; border: 1px solid #eaeaea;">
        <h2 style="color: #111;">Extraction Complete! 🎉</h2>
        <p style="color: #444; font-size: 16px; line-height: 1.5;">Your audio has been fully processed by our advanced AI pipeline. We've successfully isolated your vocals and instrumentals, and your pristine stems are waiting for you!</p>
        
        <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #eee;">
            <p style="margin: 0; color: #666; font-size: 14px;">Your Tracking ID:</p>
            <p style="margin: 5px 0 0 0; color: #111; font-family: monospace; font-size: 18px; font-weight: bold;">{task_id}</p>
        </div>

        <p>Jump right back into the Interactive Studio Mixer to listen, mute, and download your stems:</p>
        <a href="{FRONTEND_URL}/studio/{task_id}" style="display:inline-block;padding:14px 28px;background:#10B981;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:10px;">🎧 Open Studio Mixer</a>
        
        <p style="color: #888; margin-top: 40px; font-size: 14px;">Made with ❤️ for creators.<br>Enjoy your music!</p>
    </div>
    """
    
    _send_email(user_email, subject, html_content)

def _send_email(to_email: str, subject: str, html_content: str):
    if not resend.api_key:
        print(f"\n[MOCK EMAIL] To: {to_email} | Subject: {subject}")
        print("Set RESEND_API_KEY in .env to send real emails.")
        return
        
    try:
        r = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": to_email,
            "subject": subject,
            "html": html_content
        })
        print(f"[EMAIL SENT] Successfully sent to {to_email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")
