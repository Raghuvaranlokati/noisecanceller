import os
import numpy as np
import librosa
import soundfile as sf
import subprocess

def analyze_audio_health(filepath: str) -> dict:
    """
    Analyzes the health of an audio file and returns diagnostics and a score.
    Uses librosa to compute various metrics.
    """
    try:
        # Load audio (mono for analysis)
        y, sr = librosa.load(filepath, sr=22050, mono=True)
        
        # 1. Volume & Clipping (Amplitude)
        max_amplitude = np.max(np.abs(y))
        rms = librosa.feature.rms(y=y)[0]
        mean_rms = np.mean(rms)
        
        # Determine if clipping occurs
        is_clipping = max_amplitude > 0.99
        clipping_score = 0 if is_clipping else 100
        
        # Determine volume issues (too quiet or too loud)
        volume_score = 100
        if mean_rms < 0.01:
            volume_score = 40  # Very quiet
            volume_issue = "Audio is very quiet. Details may be lost."
        elif mean_rms > 0.3:
            volume_score = 60  # Very loud
            volume_issue = "Audio is very loud and risks distortion."
        else:
            volume_issue = "Volume levels are optimal."

        # 2. Background Noise Estimation (using Zero Crossing Rate and low-energy frames)
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        mean_zcr = np.mean(zcr)
        
        # A very high ZCR often correlates with noisy/hissing environments
        # A very low ZCR might be muffled.
        noise_score = 100
        noise_issue = "Background noise levels are acceptable."
        if mean_zcr > 0.15:
            noise_score = 50
            noise_issue = "High background noise or hiss detected."
        
        # 3. Frequency Range (Spectral Centroid / Rolloff)
        # Check if the audio is muffled
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        mean_rolloff = np.mean(spectral_rolloff)
        
        clarity_score = 100
        clarity_issue = "Good frequency balance and clarity."
        if mean_rolloff < 2000:
            clarity_score = 50
            clarity_issue = "Audio sounds muffled. Lacking high frequencies."
        elif mean_rolloff > 8000:
            clarity_score = 80
            clarity_issue = "Audio is very bright/sharp."

        # Calculate Overall Health Score
        overall_score = int((clipping_score + volume_score + noise_score + clarity_score) / 4)
        
        # Recommendations
        recommendations = []
        if is_clipping:
            recommendations.append("Apply a limiter or reduce input gain to avoid distortion.")
        if volume_score < 100:
            recommendations.append("Normalize the audio volume.")
        if noise_score < 100:
            recommendations.append("Use AI Denoise to remove background hiss.")
        if clarity_score < 100 and mean_rolloff < 2000:
            recommendations.append("Apply EQ to boost high frequencies and improve clarity.")
            
        if len(recommendations) == 0:
            recommendations.append("Your audio is in great condition. AI processing will focus on perfect isolation.")

        return {
            "score": overall_score,
            "metrics": {
                "clipping": is_clipping,
                "volumeLevel": float(mean_rms),
                "noiseLevel": float(mean_zcr),
                "clarity": float(mean_rolloff)
            },
            "diagnostics": [
                {"category": "Clipping", "issue": "Clipping detected" if is_clipping else "No clipping detected", "status": "bad" if is_clipping else "good"},
                {"category": "Volume", "issue": volume_issue, "status": "good" if volume_score == 100 else "warning"},
                {"category": "Noise", "issue": noise_issue, "status": "good" if noise_score == 100 else "warning"},
                {"category": "Clarity", "issue": clarity_issue, "status": "good" if clarity_score == 100 else "warning"}
            ],
            "recommendations": recommendations,
            "predictedImprovement": "High" if overall_score < 70 else ("Medium" if overall_score < 90 else "Low (Already good quality)")
        }
    except Exception as e:
        print(f"Error in health analysis: {e}")
        return {
            "score": 0,
            "error": str(e)
        }
