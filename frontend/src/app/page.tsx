"use client";
import { useState, useEffect, Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { UploadCloud, Music, AudioLines, Settings2, ShieldCheck, Zap, Lock, Sliders, Activity, Mic2, Search, LogOut, History, Copy, Check } from 'lucide-react';
import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";

function HomeContent() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState({ step: "", percent: 0, message: "", chunks_total: 0, chunks_completed: 0, chunks_pending: 0, start_time: 0, eta_seconds: 0, completed_time: 0, queue_position: 0 });
  const [resultZip, setResultZip] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { user, isLoaded, isSignedIn } = useUser();
  const searchParams = useSearchParams();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loginInput, setLoginInput] = useState("");
  const [searchTaskId, setSearchTaskId] = useState("");

  useEffect(() => {
    const queryTaskId = searchParams.get('taskId');
    if (queryTaskId && !taskId && !loading && !resultZip) {
      setTaskId(queryTaskId);
      setLoading(true);
      setProgress({ step: "Looking up task...", percent: 10, message: "Connecting to server...", chunks_total: 0, chunks_completed: 0, chunks_pending: 0, start_time: 0, eta_seconds: 0, completed_time: 0, queue_position: 0 });
      pollProgress(queryTaskId);
    }
  }, [searchParams, taskId, loading, resultZip]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("user_email");
    if (savedEmail) setUserEmail(savedEmail);
  }, []);
  
  // Feature Toggles
  const [fourStem, setFourStem] = useState<boolean>(false);
  const [enhance, setEnhance] = useState<boolean>(false);
  
  // Download Customization Options
  const [dlFormat, setDlFormat] = useState<string>("mp3");
  const [dlChunked, setDlChunked] = useState<boolean>(true);
  const [dlFolderName, setDlFolderName] = useState<string>("My_Song_Stems");
  const [dlStems, setDlStems] = useState<Record<string, boolean>>({
    vocals: true,
    instrumental: true,
    drums: true,
    bass: true
  });

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!isSignedIn) {
      setError("Please sign in to upload and process files. You can login using the button in the top right corner.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setResultZip(null);
    setProgress({ step: "Uploading...", percent: 5, message: "Sending file to cloud...", chunks_total: 0, chunks_completed: 0, chunks_pending: 0, start_time: 0, eta_seconds: 0, completed_time: 0, queue_position: 0 });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("isolate_vocals", "true");
    formData.append("isolate_instrumental", "true");
    formData.append("four_stem", fourStem.toString());
    formData.append("enhance_speech", enhance.toString());
    formData.append("email", user?.primaryEmailAddress?.emailAddress || "");

    try {
      const res = await fetch(`${baseUrl}/api/process`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to process file");
      }

      const data = await res.json();
      setTaskId(data.task_id);
      
      // Save to Firebase History
      if (user?.primaryEmailAddress?.emailAddress) {
        try {
          await addDoc(collection(db, "extractions"), {
            taskId: data.task_id,
            email: user.primaryEmailAddress.emailAddress,
            filename: file.name,
            createdAt: serverTimestamp()
          });
        } catch (fbErr) {
          console.error("Failed to save to Firebase history:", fbErr);
        }
      }

      pollProgress(data.task_id);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  const pollProgress = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${baseUrl}/api/status/${id}`);
        const data = await res.json();

        if (data.status === "processing" || data.status === "pending") {
          setProgress({
            step: data.step || "Processing...",
            percent: data.progress || 5,
            message: data.message || "Working...",
            chunks_total: data.chunks_total || 0,
            chunks_completed: data.chunks_completed || 0,
            chunks_pending: data.chunks_pending || 0,
            start_time: data.start_time || 0,
            eta_seconds: data.eta_seconds || 0,
            completed_time: data.completed_time || 0,
            queue_position: data.queue_position || 0
          });
        } else if (data.status === "completed") {
          clearInterval(interval);
          setResultZip(data.result_path || true);
          setLoading(false);
          setProgress({ step: "Complete", percent: 100, message: "Ready to download!", chunks_total: 0, chunks_completed: 0, chunks_pending: 0, start_time: 0, eta_seconds: 0, completed_time: 0, queue_position: 0 });
        } else if (data.status === "failed") {
          clearInterval(interval);
          setError(data.message || data.error || "An unknown error occurred on the server.");
          setLoading(false);
        }
      } catch (err) {
        // Keep trying
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen pb-20">
      
      {/* Massive Hero Section */}
      <div className="pt-16 pb-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Extract <span className="text-[#1877F2]">Vocals & Stems</span> instantly.
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            The professional AI vocal remover and music source separation engine.
          </p>
        </div>
      </div>

      {/* Main Split-Screen Dashboard UI */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
          
          {/* Subtle global background glow behind the entire dashboard */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#1877F2]/5 rounded-full blur-[150px] pointer-events-none z-0" />

          {/* LEFT SIDEBAR: TOOLS PANEL */}
          <div className="lg:col-span-4 bg-[#111] border border-[#27272a] rounded-3xl p-6 shadow-2xl relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Settings2 className="w-6 h-6 text-[#1877F2]" /> Extraction Tools
              </h2>
            </div>
            
            {/* Active Tools */}
            <div className="space-y-4">
              <button 
                onClick={() => setFourStem(!fourStem)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                  fourStem 
                    ? 'bg-[#1877F2]/10 border-[#1877F2] shadow-[0_0_15px_rgba(24,119,242,0.15)]' 
                    : 'bg-[#050505] border-[#27272a] hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${fourStem ? 'bg-[#1877F2] text-white' : 'bg-[#18191A] text-gray-400'}`}>
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-bold ${fourStem ? 'text-white' : 'text-gray-300'}`}>4-Stem Separation</h3>
                    <p className="text-xs text-gray-500">Extract Vocals, Drums, Bass, & Other</p>
                  </div>
                </div>
                {/* Custom Toggle Switch UI */}
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${fourStem ? 'bg-[#1877F2]' : 'bg-[#27272a]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${fourStem ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </button>

              <button 
                onClick={() => setEnhance(!enhance)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                  enhance 
                    ? 'bg-purple-500/10 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                    : 'bg-[#050505] border-[#27272a] hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${enhance ? 'bg-purple-500 text-white' : 'bg-[#18191A] text-gray-400'}`}>
                    <AudioLines className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-bold ${enhance ? 'text-white' : 'text-gray-300'}`}>Studio Denoise</h3>
                    <p className="text-xs text-gray-500">Clean up background noise</p>
                  </div>
                </div>
                {/* Custom Toggle Switch UI */}
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${enhance ? 'bg-purple-500' : 'bg-[#27272a]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${enhance ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>

            <hr className="border-[#27272a] my-8" />

            {/* Pro / Coming Soon Tools */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Advanced / Pro</h2>
              <span className="text-[10px] bg-[#1877F2]/20 text-[#1877F2] px-2 py-0.5 rounded font-bold">Coming Soon</span>
            </div>
            
            <div className="space-y-3 opacity-50">
              <div className="w-full flex items-center justify-between p-3 rounded-xl bg-[#050505] border border-[#27272a] cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <Sliders className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-400">Mastering & EQ</span>
                </div>
                <Lock className="w-4 h-4 text-gray-600" />
              </div>

              <div className="w-full flex items-center justify-between p-3 rounded-xl bg-[#050505] border border-[#27272a] cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-400">BPM & Key Detection</span>
                </div>
                <Lock className="w-4 h-4 text-gray-600" />
              </div>

              <div className="w-full flex items-center justify-between p-3 rounded-xl bg-[#050505] border border-[#27272a] cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <Mic2 className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-400">Vocal Pitch Shift</span>
                </div>
                <Lock className="w-4 h-4 text-gray-600" />
              </div>
            </div>
            
            <div className="mt-auto pt-8">
              <p className="text-xs text-center text-gray-600">Select your tools before dropping a file to process.</p>
            </div>
          </div>

          {/* RIGHT SIDE: FILE UPLOAD & RESULTS */}
          <div className="lg:col-span-8 bg-[#111] border border-[#27272a] rounded-3xl p-6 md:p-12 shadow-2xl relative z-10 flex flex-col min-h-[700px]">
            
            {/* MAIN FLOW DIAGRAM (ALWAYS VISIBLE) */}
            <div className="mb-10 w-full max-w-lg mx-auto relative h-56 flex-shrink-0">
              {/* SVG Connecting Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="#52525b" strokeWidth="2" strokeDasharray="6 6" />
                <line x1="50%" y1="50%" x2="75%" y2="25%" stroke="#52525b" strokeWidth="2" strokeDasharray="6 6" />
                <line x1="50%" y1="50%" x2="50%" y2="80%" stroke="#52525b" strokeWidth="2" strokeDasharray="6 6" />
              </svg>
              
              {/* Top Left Node */}
              <div className={`absolute top-4 left-4 w-32 h-16 border-2 rounded-xl flex items-center justify-center z-10 transition-all duration-500 ${loading && progress.step.includes("1/") ? 'bg-cyan-500/20 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-110' : 'bg-[#0a0a0a] border-[#27272a]'}`}>
                <span className={`text-sm font-bold ${loading && progress.step.includes("1/") ? 'text-cyan-400' : 'text-gray-500'}`}>Extracting</span>
              </div>
              
              {/* Top Right Node */}
              <div className={`absolute top-4 right-4 w-32 h-16 border-2 rounded-xl flex items-center justify-center z-10 transition-all duration-500 ${loading && progress.step.includes("2/") ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)] scale-110' : 'bg-[#0a0a0a] border-[#27272a]'}`}>
                <span className={`text-sm font-bold ${loading && progress.step.includes("2/") ? 'text-emerald-400' : 'text-gray-500'}`}>Splitting</span>
              </div>
              
              {/* Bottom Node */}
              <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 border-2 rounded-xl flex items-center justify-center z-10 transition-all duration-500 ${(loading && progress.step.includes("4/")) || resultZip ? 'bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] scale-110' : 'bg-[#0a0a0a] border-[#27272a]'}`}>
                <span className={`text-sm font-bold ${(loading && progress.step.includes("4/")) || resultZip ? 'text-red-400' : 'text-gray-500'}`}>Merging</span>
              </div>
              
              {/* Center Node */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-[3px] rounded-full flex flex-col items-center justify-center z-10 transition-all duration-500 ${loading && progress.step.includes("3/") ? 'bg-purple-500/20 border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.8)] scale-110 animate-pulse' : 'bg-[#0f0f11] border-[#27272a]'}`}>
                <span className={`text-[11px] font-bold tracking-widest ${loading && progress.step.includes("3/") ? 'text-purple-300' : 'text-gray-600'}`}>CLOUD GPU</span>
              </div>
            </div>
            
            {/* Dynamic Content Area */}
            <div className="flex-1 flex flex-col justify-center relative">
              {/* Massive Dropzone */}
              {!resultZip && !loading && (
              <div 
                className="border-2 border-dashed border-[#27272a] hover:border-[#1877F2] bg-[#050505] rounded-3xl p-16 md:p-24 text-center cursor-pointer transition-all group h-full flex flex-col items-center justify-center"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById("fileInput")?.click()}
              >
                <input id="fileInput" type="file" className="hidden" accept="audio/*,video/*" onChange={handleFileChange} />
                
                <UploadCloud className="w-20 h-20 text-gray-500 group-hover:text-[#1877F2] mx-auto mb-6 transition-colors" />
                
                {file ? (
                  <div>
                    <h3 className="text-3xl text-emerald-400 font-bold mb-4 break-words mx-auto">{file.name}</h3>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                      className="bg-[#1877F2] text-white px-10 py-4 rounded-xl text-xl font-bold hover:bg-[#166FE5] transition-all shadow-[0_0_20px_rgba(24,119,242,0.3)] hover:-translate-y-1"
                    >
                      Extract Now
                    </button>
                  </div>
                ) : (
                  <>
                    {!isLoaded ? (
                       <h3 className="text-3xl md:text-4xl text-white font-bold mb-4">Loading...</h3>
                    ) : !isSignedIn ? (
                      <>
                        <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-3xl md:text-4xl text-white font-bold mb-4">Login Required</h3>
                        <p className="text-gray-400 text-lg">You must sign in via the top right to process files.</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-3xl md:text-4xl text-white font-bold mb-4 group-hover:text-[#1877F2] transition-colors">Select Files</h3>
                        <p className="text-gray-400 text-lg">or drag and drop them here</p>
                        <p className="text-sm text-gray-600 mt-4">Supports MP3, WAV, FLAC, MP4, and more.</p>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && <div className="mt-6 p-6 bg-red-900/30 border border-red-500 text-red-200 rounded-2xl text-center font-medium absolute top-4 left-4 right-4">{error}</div>}

            {/* Loading State */}
            {loading && (
              <div className="bg-[#050505] border border-[#27272a] rounded-3xl p-12 text-center h-full flex flex-col items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-[#1877F2] border-r-4 border-r-transparent border-b-4 border-b-[#1877F2]/30 border-l-4 border-l-transparent mb-8"></div>
                
                {/* Status Content */}
                <h3 className="text-4xl font-bold text-white mb-4">{progress.percent}%</h3>
                <h4 className="text-xl text-[#1877F2] font-medium mb-2">{progress.step || "Preparing audio..."}</h4>
                <p className="text-[#a1a1aa] mb-8 text-lg">{progress.message}</p>
                
                {/* TIMING METRICS */}
                <div className="mt-2 h-3 bg-[#27272a] rounded-full overflow-hidden w-full max-w-md mx-auto">
                  <div 
                    className="h-full bg-gradient-to-r from-[#166FE5] to-[#1877F2] relative transition-all duration-500" 
                    style={{ width: `${progress.percent}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
                  </div>
                </div>
                
                <div className="mt-4 flex justify-between text-sm font-medium text-gray-500 w-full max-w-md mx-auto px-2">
                  <div>Started: {progress.start_time ? new Date(progress.start_time * 1000).toLocaleTimeString() : '...'}</div>
                  {progress.eta_seconds > 0 && progress.eta_seconds < 3600 && (
                    <div className="text-[#1877F2]">ETA: {progress.eta_seconds}s</div>
                  )}
                  {progress.eta_seconds >= 3600 && (
                    <div className="text-[#1877F2]">ETA: {Math.floor(progress.eta_seconds / 60)}m</div>
                  )}
                </div>
                
                {/* CHUNK MATRIX */}
                {progress.chunks_total > 0 && (
                  <div className="mt-8 pt-8 border-t border-[#27272a] w-full max-w-3xl mx-auto">
                    <h5 className="text-sm text-gray-400 font-bold mb-4 tracking-widest uppercase text-center">Live Chunk Matrix</h5>
                    <div className="flex flex-wrap gap-2 justify-center max-h-60 overflow-y-auto pr-2">
                      {[...Array(progress.chunks_total)].map((_, i) => {
                        const isCompleted = i < progress.chunks_completed;
                        const isProcessing = !isCompleted && i < progress.chunks_completed + 5; // Represents max 5 parallel cloud workers
                        
                        return (
                          <div 
                            key={i} 
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                              isCompleted 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                                : isProcessing 
                                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.5)] animate-pulse scale-110 z-10' 
                                  : 'bg-[#0a0a0a] text-gray-600 border border-[#27272a]'
                            }`}
                          >
                            {i + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audio Player and Download (Success State) */}
            {resultZip && taskId && (
              <div className="bg-[#050505] border border-[#27272a] rounded-3xl p-8 md:p-12 h-full flex flex-col justify-center">
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-2">Extraction Complete!</h3>
                  <p className="text-gray-400 text-md mb-4">Your stems have been successfully separated.</p>
                  
                  <div className="flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#27272a] rounded-xl px-4 py-3 w-max mx-auto">
                    <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Task ID:</span>
                    <span className="text-white font-mono text-sm tracking-wider">{taskId}</span>
                    <button 
                      onClick={() => {
                        if(taskId) navigator.clipboard.writeText(taskId);
                        alert("Task ID copied to clipboard!");
                      }}
                      className="ml-2 text-gray-400 hover:text-[#1877F2] transition-colors p-1"
                      title="Copy ID to Clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="bg-[#111] border border-[#27272a] rounded-2xl p-6 mb-8 w-full max-w-xl mx-auto">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4 bg-black/50 p-3 rounded-xl border border-white/5">
                      <div className="w-28 font-bold text-[#1877F2] text-sm md:text-base">🎤 Vocals</div>
                      <audio controls src={`${baseUrl}/api/stream/${taskId}/vocals.wav`} preload="none" className="flex-1 h-10 rounded-lg">
                        <track kind="captions" />
                      </audio>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-black/50 p-3 rounded-xl border border-white/5">
                      <div className="w-28 font-bold text-gray-300 text-sm md:text-base">🎸 Instrument</div>
                      <audio controls src={`${baseUrl}/api/stream/${taskId}/instrumental.wav`} preload="none" className="flex-1 h-10 rounded-lg">
                        <track kind="captions" />
                      </audio>
                    </div>
                    
                    {fourStem && (
                      <>
                        <div className="flex items-center gap-4 bg-black/50 p-3 rounded-xl border border-white/5">
                          <div className="w-28 font-bold text-orange-400 text-sm md:text-base">🥁 Drums</div>
                          <audio controls src={`${baseUrl}/api/stream/${taskId}/drums.wav`} preload="none" className="flex-1 h-10 rounded-lg">
                            <track kind="captions" />
                          </audio>
                        </div>
                        <div className="flex items-center gap-4 bg-black/50 p-3 rounded-xl border border-white/5">
                          <div className="w-28 font-bold text-blue-400 text-sm md:text-base">🎸 Bass</div>
                          <audio controls src={`${baseUrl}/api/stream/${taskId}/bass.wav`} preload="none" className="flex-1 h-10 rounded-lg">
                            <track kind="captions" />
                          </audio>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-[#111] border border-[#27272a] rounded-2xl p-6 mb-8 w-full max-w-xl mx-auto">
                  <h4 className="text-lg font-bold text-white mb-4">Download Customization</h4>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Select Stems to Include</label>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded-lg border border-[#27272a] cursor-pointer hover:border-gray-500 transition-colors">
                          <input type="checkbox" checked={dlStems.vocals} onChange={(e) => setDlStems({...dlStems, vocals: e.target.checked})} className="accent-[#1877F2]" />
                          <span className="text-gray-300">Vocals</span>
                        </label>
                        <label className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded-lg border border-[#27272a] cursor-pointer hover:border-gray-500 transition-colors">
                          <input type="checkbox" checked={dlStems.instrumental} onChange={(e) => setDlStems({...dlStems, instrumental: e.target.checked})} className="accent-[#1877F2]" />
                          <span className="text-gray-300">Instrumental</span>
                        </label>
                        {fourStem && (
                          <>
                            <label className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded-lg border border-[#27272a] cursor-pointer hover:border-gray-500 transition-colors">
                              <input type="checkbox" checked={dlStems.drums} onChange={(e) => setDlStems({...dlStems, drums: e.target.checked})} className="accent-[#1877F2]" />
                              <span className="text-gray-300">Drums</span>
                            </label>
                            <label className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded-lg border border-[#27272a] cursor-pointer hover:border-gray-500 transition-colors">
                              <input type="checkbox" checked={dlStems.bass} onChange={(e) => setDlStems({...dlStems, bass: e.target.checked})} className="accent-[#1877F2]" />
                              <span className="text-gray-300">Bass</span>
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Audio Format</label>
                        <select 
                          value={dlFormat} 
                          onChange={(e) => setDlFormat(e.target.value)}
                          className="w-full bg-[#1a1a1a] text-white border border-[#27272a] rounded-lg px-4 py-3 outline-none focus:border-[#1877F2]"
                        >
                          <option value="mp3">MP3 (Fast, Small Size)</option>
                          <option value="wav">WAV (Lossless Quality)</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Zip / Folder Name</label>
                        <input 
                          type="text"
                          value={dlFolderName}
                          onChange={(e) => setDlFolderName(e.target.value)}
                          placeholder="My_Song_Stems"
                          className="w-full bg-[#1a1a1a] text-white border border-[#27272a] rounded-lg px-4 py-3 outline-none focus:border-[#1877F2]"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Delivery Structure</label>
                        <select 
                          value={dlChunked ? "chunked" : "single"} 
                          onChange={(e) => setDlChunked(e.target.value === "chunked")}
                          className="w-full bg-[#1a1a1a] text-white border border-[#27272a] rounded-lg px-4 py-3 outline-none focus:border-[#1877F2]"
                        >
                          <option value="chunked">50s Chunks (ad0001...) in Folders</option>
                          <option value="single">Single Full-Length Files</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center flex-col items-center gap-4">
                  <a 
                    href={`${baseUrl}/api/custom_download/${taskId}?stems=${Object.entries(dlStems).filter(([k,v]) => v).map(([k]) => k).join(',')}&format=${dlFormat}&chunked=${dlChunked}&folder_name=${encodeURIComponent(dlFolderName)}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-3 py-4 px-8 bg-[#1877F2] text-white rounded-full text-lg font-bold hover:bg-[#166FE5] hover:-translate-y-1 shadow-[0_10px_30px_-10px_rgba(24,119,242,0.5)] transition-all"
                  >
                    <UploadCloud className="w-6 h-6 rotate-180" />
                    Download Custom ZIP
                  </a>
                  <p className="text-gray-500 text-xs text-center max-w-sm">
                    Files will be dynamically converted and packaged on our servers. This takes a few seconds.
                  </p>
                </div>
                <div className="text-center mt-6">
                  <button onClick={() => {setResultZip(null); setFile(null);}} className="text-gray-400 hover:text-white underline text-sm">
                    Process another file
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Trust / Features Section */}
      <div className="max-w-7xl mx-auto px-4 mt-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="bg-[#111] border border-[#27272a] rounded-3xl p-8">
            <Zap className="w-10 h-10 text-[#1877F2] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Fast Processing</h3>
            <p className="text-gray-400 text-sm">Our next-gen AI splits songs in less than a minute. No waiting in queues for hours.</p>
          </div>
          <div className="bg-[#111] border border-[#27272a] rounded-3xl p-8">
            <Settings2 className="w-10 h-10 text-[#1877F2] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Studio Quality</h3>
            <p className="text-gray-400 text-sm">Extract completely clean vocals and stems with zero artifacting using Demucs v4.</p>
          </div>
          <div className="bg-[#111] border border-[#27272a] rounded-3xl p-8">
            <ShieldCheck className="w-10 h-10 text-[#1877F2] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">100% Secure</h3>
            <p className="text-gray-400 text-sm">Your files are encrypted during upload and permanently deleted after processing.</p>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
