"use client";
import { useState, useRef } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ step: "", percent: 0, message: "" });
  const [resultZip, setResultZip] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [error, setError] = useState(null);
  const [fourStem, setFourStem] = useState(false);
  const [enhance, setEnhance] = useState(false);

  // Auto-detect backend URL based on environment (local dev vs Vercel)
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const startExtraction = async () => {
    if (!file) {
      setError("Please select an audio or video file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultZip(null);
    setTaskId(null);
    setProgress({ step: "1/4", percent: 5, message: "Uploading file securely..." });

    try {
      const formData = new FormData();
      formData.append("file", file);
      // Backend expects these booleans as strings or standard form data
      formData.append("isolate_vocals", "true");
      formData.append("isolate_instrumental", "true");
      formData.append("four_stem", fourStem ? "true" : "false");
      formData.append("enhance_speech", enhance ? "true" : "false");

      const res = await fetch(`${baseUrl}/api/process`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to start processing");
      }

      const data = await res.json();
      setTaskId(data.task_id);
      pollProgress(data.task_id);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const pollProgress = async (id) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${baseUrl}/api/status/${id}`);
        const data = await res.json();

        if (data.status === "processing") {
          setProgress({
            step: data.progress.step || "Processing",
            percent: data.progress.percent || 0,
            message: data.progress.message || "Working...",
          });
        } else if (data.status === "completed") {
          clearInterval(interval);
          setResultZip(`${baseUrl}/api/download/${id}`);
          setProgress({ step: "Done", percent: 100, message: "Extraction Complete!" });
          setLoading(false);
        } else if (data.status === "failed") {
          clearInterval(interval);
          setError(data.error);
          setLoading(false);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 2000);
  };

  return (
    <main>
      <div className="container">
        
        {/* Hero Section */}
        <section className="hero-section">
          <h1 className="hero-title">Vocal Extractor AI</h1>
          <p className="hero-subtitle">
            Extract studio-quality vocals, drums, bass, and instrumental tracks from any audio or video file instantly. 
            Powered by next-gen Enterprise GPUs. 100% Free.
          </p>
        </section>

        {/* Main Processing App */}
        <div className="glass-card">
          {!resultZip && (
            <>
              <div 
                className="upload-zone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="feature-icon">📁</div>
                <h3 style={{marginBottom: "10px"}}>Drag & Drop your audio/video file here</h3>
                <p style={{color: "var(--text-muted)", marginBottom: "20px"}}>Supports MP3, MP4, WAV, FLAC, MOV</p>
                
                <label className="custom-file-upload">
                  <input type="file" accept="audio/*,video/*" onChange={handleFileChange} />
                  Choose File
                </label>
                {file && <p style={{marginTop: "15px", color: "var(--success)", fontWeight: "500"}}>Selected: {file.name}</p>}
              </div>

              <div className="checkbox-grid">
                <label className="checkbox-label">
                  <input type="checkbox" checked disabled />
                  <span>
                    <strong>Vocal Isolation</strong><br/>
                    <small style={{color: "var(--text-muted)"}}>Extract clean vocals</small>
                  </span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked disabled />
                  <span>
                    <strong>Instrumental</strong><br/>
                    <small style={{color: "var(--text-muted)"}}>Extract backing track</small>
                  </span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={fourStem} onChange={e => setFourStem(e.target.checked)} />
                  <span>
                    <strong>4-Stem Separation</strong><br/>
                    <small style={{color: "var(--text-muted)"}}>Vocals, Drums, Bass, Other (Slower)</small>
                  </span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={enhance} onChange={e => setEnhance(e.target.checked)} />
                  <span>
                    <strong>Deep Denoise</strong><br/>
                    <small style={{color: "var(--text-muted)"}}>Remove background noise</small>
                  </span>
                </label>
              </div>

              {error && <div style={{padding: "15px", background: "rgba(220, 38, 38, 0.1)", color: "#f87171", borderRadius: "8px", marginBottom: "20px", border: "1px solid #7f1d1d"}}>{error}</div>}

              {loading ? (
                <div className="progress-container">
                  <div style={{display: "flex", justifyContent: "space-between", marginBottom: "8px"}}>
                    <span style={{fontWeight: "500", color: "var(--primary)"}}>Step {progress.step}</span>
                    <span style={{color: "var(--text-muted)"}}>{progress.percent}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${progress.percent}%` }}></div>
                  </div>
                  <p style={{textAlign: "center", marginTop: "12px", color: "var(--text-muted)", fontSize: "0.9rem"}}>{progress.message}</p>
                </div>
              ) : (
                <button className="btn-primary" onClick={startExtraction} disabled={!file}>
                  ✨ Start AI Extraction
                </button>
              )}
            </>
          )}

          {/* Results UI with Custom Audio Player */}
          {resultZip && taskId && (
            <div style={{textAlign: "center"}}>
              <div className="feature-icon" style={{fontSize: "3rem", marginBottom: "10px"}}>🎉</div>
              <h2 style={{color: "var(--success)", marginBottom: "10px"}}>Extraction Complete!</h2>
              <p style={{color: "var(--text-muted)", marginBottom: "30px"}}>Listen to your isolated tracks below or download the full ZIP.</p>
              
              <div className="audio-player-card">
                <div className="audio-track">
                  <div className="audio-track-title" style={{textAlign:"left"}}>🎤 Vocals</div>
                  <audio controls src={`${baseUrl}/api/stream/${taskId}/vocals.wav`} preload="none"></audio>
                </div>
                <div className="audio-track">
                  <div className="audio-track-title" style={{textAlign:"left"}}>🎸 Instrumental</div>
                  <audio controls src={`${baseUrl}/api/stream/${taskId}/instrumental.wav`} preload="none"></audio>
                </div>
                {fourStem && (
                  <>
                    <div className="audio-track">
                      <div className="audio-track-title" style={{textAlign:"left"}}>🥁 Drums</div>
                      <audio controls src={`${baseUrl}/api/stream/${taskId}/drums.wav`} preload="none"></audio>
                    </div>
                    <div className="audio-track">
                      <div className="audio-track-title" style={{textAlign:"left"}}>🎸 Bass</div>
                      <audio controls src={`${baseUrl}/api/stream/${taskId}/bass.wav`} preload="none"></audio>
                    </div>
                  </>
                )}
              </div>

              <div style={{marginTop: "30px", display: "flex", gap: "15px", justifyContent: "center"}}>
                <a href={resultZip} download>
                  <button className="btn-primary btn-success">📦 Download All Stems (.ZIP)</button>
                </a>
                <button className="btn-primary" onClick={() => {setResultZip(null); setFile(null); setTaskId(null);}} style={{background: "var(--border)"}}>Process Another File</button>
              </div>
            </div>
          )}
        </div>

        {/* Feature Grid for SEO and conversion */}
        <section className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3 className="feature-title">Lightning Fast</h3>
            <p style={{color: "var(--text-muted)"}}>Powered by Hugging Face Enterprise GPUs, extracting a 4-minute song takes seconds.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎛️</div>
            <h3 className="feature-title">4-Stem Separation</h3>
            <p style={{color: "var(--text-muted)"}}>Go beyond basic vocal removal. Isolate drums, bass, vocals, and melodies perfectly.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💎</div>
            <h3 className="feature-title">Studio Quality</h3>
            <p style={{color: "var(--text-muted)"}}>Maintains the original 44.1kHz sample rate with absolutely zero audio compression.</p>
          </div>
        </section>

      </div>
    </main>
  );
}
