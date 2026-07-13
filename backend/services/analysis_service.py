import librosa
import numpy as np

def analyze_audio_file(file_path: str):
    # Load a short snippet (e.g. 30 seconds from the middle) for faster analysis
    # If the file is shorter, it will load the whole thing
    try:
        y, sr = librosa.load(file_path, sr=22050, duration=30, offset=15)
    except Exception:
        # Fallback if file is shorter than 15 seconds
        y, sr = librosa.load(file_path, sr=22050)
    
    # Calculate BPM
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    bpm = int(round(tempo[0])) if isinstance(tempo, np.ndarray) else int(round(tempo))

    # Calculate Key
    chromagram = librosa.feature.chroma_stft(y=y, sr=sr)
    mean_chroma = np.mean(chromagram, axis=1)
    
    # Simple Krumhansl-Schmuckler key-finding algorithm profiles
    # Major profile
    maj_profile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
    # Minor profile
    min_profile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
    
    pitch_classes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    max_corr = -1
    best_key = "Unknown"
    
    # Try all 12 major and 12 minor keys
    for i in range(12):
        # Shift profiles to test different root notes
        shifted_maj = np.roll(maj_profile, i)
        shifted_min = np.roll(min_profile, i)
        
        corr_maj = np.corrcoef(mean_chroma, shifted_maj)[0, 1]
        corr_min = np.corrcoef(mean_chroma, shifted_min)[0, 1]
        
        if corr_maj > max_corr:
            max_corr = corr_maj
            best_key = f"{pitch_classes[i]} Major"
            
        if corr_min > max_corr:
            max_corr = corr_min
            best_key = f"{pitch_classes[i]} Minor"
            
    return {
        "bpm": bpm,
        "key": best_key
    }
