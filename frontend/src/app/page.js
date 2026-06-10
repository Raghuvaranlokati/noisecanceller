"use client";
import { useState, useEffect } from "react";
import "./globals.css";

export default function Home() {
  const [file, setFile] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState("idle"); // idle, processing, completed, error
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoLength, setVideoLength] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isolateVocals, setIsolateVocals] = useState(false);
  const [isolateInstrumental, setIsolateInstrumental] = useState(false);
  const [enhanceSpeech, setEnhanceSpeech] = useState(false);

  const handleStart = async () => {
    if (!file) return;
    setStatus("processing");
    setProgress(0);
    setMessage("Uploading file...");
    setStep("1/5");
    setStartTime(Date.now() / 1000);
    setVideoTitle(file.name);
    setVideoLength(0);
    setElapsedTime(0);
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("isolate_vocals", isolateVocals);
      formData.append("isolate_instrumental", isolateInstrumental);
      formData.append("enhance_speech", enhanceSpeech);

      const res = await fetch(`${baseUrl}/api/process`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setTaskId(data.task_id);
        if (typeof window !== "undefined") {
          localStorage.setItem('noise_canceller_taskId', data.task_id);
        }
      } else {
        setStatus("error");
        setMessage(data.detail || "Failed to start processing.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Cannot connect to server. Is the backend running?");
    }
  };

  // Restore task from localStorage on page load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTaskId = localStorage.getItem('noise_canceller_taskId');
      if (savedTaskId) {
        setTaskId(savedTaskId);
        setStatus("processing");
        setMessage("Resuming progress...");
        setStep("...");
      }
    }
  }, []);

  useEffect(() => {
    let interval;
    if (taskId && status === "processing") {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/status/${taskId}`);
          const data = await res.json();
          if (res.ok) {
            setProgress(data.progress);
            setMessage(data.message);
            if (data.step) setStep(data.step);
            if (data.start_time) setStartTime(data.start_time);
            if (data.video_title) setVideoTitle(data.video_title);
            if (data.video_length) setVideoLength(data.video_length);
            
            if (data.start_time) {
               setElapsedTime(Math.floor(Date.now() / 1000 - data.start_time));
            }
            if (data.status === "completed") {
              setStatus("completed");
              if (typeof window !== "undefined") localStorage.removeItem('noise_canceller_taskId');
              clearInterval(interval);
            } else if (data.status === "failed") {
              setStatus("error");
              if (typeof window !== "undefined") localStorage.removeItem('noise_canceller_taskId');
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.error(err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [taskId, status]);

  // Calculate live ETA
  const calculateETA = () => {
    if (progress === 0 || progress === 100 || !startTime) return "Calculating...";
    const totalEstimatedSeconds = (elapsedTime / progress) * 100;
    const remainingSeconds = Math.max(0, Math.floor(totalEstimatedSeconds - elapsedTime));
    return formatTime(remainingSeconds);
  };

  const formatTime = (seconds) => {
    if (!seconds) return "0s";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  const handleDownload = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/download/${taskId}`;
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Vocal Extractor</h1>
        <p className="subtitle">Extract pure vocals from any YouTube video in 50s chunks.</p>
        
        <div className="input-group">
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => setFile(e.target.files[0])}
            disabled={status === "processing"}
            style={{ width: "100%", padding: "12px", background: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }}
          />
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginTop: "15px", marginBottom: "15px", fontSize: "14px", color: "#d1d5db" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={isolateVocals} 
                onChange={(e) => setIsolateVocals(e.target.checked)} 
                disabled={status === "processing"}
                style={{ width: "16px", height: "16px", accentColor: "#8b5cf6" }}
              />
              Isolate Vocals (Demucs API)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={isolateInstrumental} 
                onChange={(e) => setIsolateInstrumental(e.target.checked)} 
                disabled={status === "processing"}
                style={{ width: "16px", height: "16px", accentColor: "#8b5cf6" }}
              />
              Isolate Background Music (Demucs API)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={enhanceSpeech} 
                onChange={(e) => setEnhanceSpeech(e.target.checked)} 
                disabled={status === "processing"}
                style={{ width: "16px", height: "16px", accentColor: "#10b981" }}
              />
              Speech Enhancement / Noise Removal (DeepFilterNet API)
            </label>
          </div>
          
          <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "15px" }}>
            {!isolateVocals && !isolateInstrumental && !enhanceSpeech
              ? "⚡ Instant Splitter Mode: No AI selected. Video will be instantly downloaded and cut into chunks." 
              : "🚀 Cloud AI Mode: Audio will be processed on massive enterprise GPUs via Hugging Face."}
          </div>

          {status === "idle" || status === "error" ? (
            <button onClick={handleStart} disabled={!file}>
              Upload & Start Extraction
            </button>
          ) : status === "processing" ? (
            <button disabled>
              Processing...
            </button>
          ) : (
            <button onClick={handleDownload} style={{ background: "linear-gradient(to right, #10b981, #059669)" }}>
              Download Vocals (.zip)
            </button>
          )}
        </div>

        {status === "error" && (
          <div style={{ color: "#ef4444", textAlign: "center", marginTop: "10px" }}>
            Error: {message}
          </div>
        )}

        {(status === "processing" || status === "completed") && (
          <div className="progress-container" style={{ marginTop: "20px", background: "#111827", padding: "20px", borderRadius: "12px", border: "1px solid #374151" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "14px", color: "#9ca3af" }}>
              <span><strong>Step:</strong> {step}</span>
              <span><strong>Elapsed:</strong> {formatTime(elapsedTime)}</span>
            </div>
            
            {videoTitle && (
              <div style={{ marginBottom: "15px", padding: "10px", background: "#1f2937", borderRadius: "8px", fontSize: "13px" }}>
                <div style={{ color: "#fff", marginBottom: "4px" }}><strong>{videoTitle}</strong></div>
                <div style={{ color: "#9ca3af" }}>Duration: {formatTime(videoLength)}</div>
              </div>
            )}

            <div className="progress-bar-bg" style={{ height: "12px" }}>
              <div 
                className="progress-bar-fill" 
                style={{ width: `${progress}%`, transition: "width 0.5s ease" }}
              ></div>
            </div>
            <div className="status-text" style={{ marginTop: "12px", fontSize: "15px", fontWeight: "500", color: "#f3f4f6" }}>
              {message} ({progress}%)
            </div>
            
            {status === "processing" && (
              <div style={{ marginTop: "10px", textAlign: "right", fontSize: "13px", color: "#a78bfa" }}>
                <strong>Estimated Time Left:</strong> {calculateETA()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
