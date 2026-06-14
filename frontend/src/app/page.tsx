"use client";
import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { UploadCloud, Music, AudioLines, Settings2, ShieldCheck, Zap, Lock, Sliders, Activity, Mic2, Search, LogOut, History, Copy, Check, FileMusic, AlignLeft, Users, CheckCircle2, XCircle, List, Plus } from 'lucide-react';
import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import ExtractionFlowDiagram from "../components/ExtractionFlowDiagram";
import SmartCompareStudio from "../components/SmartCompareStudio";
import QueueWaitingRoom from "../components/QueueWaitingRoom";
import SyncedTranscriptPlayer from "../components/SyncedTranscriptPlayer";
import RawTranscriptViewer from "../components/RawTranscriptViewer";
import FAQAccordion from "../components/FAQAccordion";
import { faqs } from "../data/faqs";
import Link from "next/link";

function HomeContent() {
  const [file, setFile] = useState<File | null>(null);
  const [metadataCsv, setMetadataCsv] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState({ step: "", percent: 0, message: "", chunks_total: 0, chunks_completed: 0, chunks_pending: 0, start_time: 0, eta_seconds: 0, completed_time: 0, queue_position: 0 });
  const [resultZip, setResultZip] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const vocalsAudioRef = useRef<HTMLAudioElement>(null);
  const [healthReport, setHealthReport] = useState<any>(null);
  const [isHealthChecking, setIsHealthChecking] = useState<boolean>(false);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  
  const { user, isLoaded, isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const searchParams = useSearchParams();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loginInput, setLoginInput] = useState("");
  const [searchTaskId, setSearchTaskId] = useState("");

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const eventSourceRef = useRef<EventSource | null>(null);

  const pollProgress = useCallback((id: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${baseUrl}/api/events/status/${id}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.error) {
        eventSource.close();
        setError(data.error === "Task not found" ? "This task is no longer available. The server restarts periodically to free up resources, which clears old files. Please upload your audio again." : data.error);
        setLoading(false);
        setTaskId(null);
        window.history.replaceState({}, '', '/');
        return;
      }

      if (data.status === "processing" || data.status === "pending" || data.status === "queued") {
        setProgress({
          step: data.step || (data.status === "queued" ? "Queued" : "Processing..."),
          percent: data.progress || 5,
          message: data.message || "Working...",
          chunks_total: data.chunks_total || 0,
          chunks_completed: data.chunks_completed || 0,
          chunks_pending: data.chunks_pending || 0,
          start_time: data.start_time || 0,
          eta_seconds: data.eta_seconds || 0,
          completed_time: data.completed_time || 0,
          queue_position: data.queue_position || 0,
          status: data.status
        } as any);
      } else if (data.status === "completed") {
        eventSource.close();
        setResultZip(data.result_path || true);
        setLoading(false);
        setProgress({ step: "Complete", percent: 100, message: "Ready to download!", chunks_total: 0, chunks_completed: 0, chunks_pending: 0, start_time: 0, eta_seconds: 0, completed_time: 0, queue_position: 0 });
      } else if (data.status === "failed") {
        eventSource.close();
        setError(data.message || data.error || "An unknown error occurred on the server.");
        setLoading(false);
      } else if (data.status === "cancelled" || data.status === "expired") {
        eventSource.close();
        setError(data.status === "cancelled" ? "Processing was cancelled." : "This task is no longer available. The server restarts periodically to free up resources, which clears old files. Please upload your audio again.");
        setLoading(false);
        setTaskId(null);
        window.history.replaceState({}, '', '/');
      }
    };

    eventSource.onerror = () => {
      // SSE auto-reconnects on network drops.
      // If the backend strictly sends data.error on 404, we handle it above.
    };
  }, [baseUrl]);

  // Clean up SSE on component unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const queryTaskId = searchParams.get('taskId');
    if (queryTaskId && !taskId && !loading && !resultZip) {
      setTimeout(() => {
        setTaskId(queryTaskId);
        setLoading(true);
        setProgress({ step: "Looking up task...", percent: 10, message: "Connecting to server...", chunks_total: 0, chunks_completed: 0, chunks_pending: 0, start_time: 0, eta_seconds: 0, completed_time: 0, queue_position: 0 });
        pollProgress(queryTaskId);
      }, 0);
    }
  }, [searchParams, taskId, loading, resultZip, pollProgress]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("user_email");
    if (savedEmail) {
      setTimeout(() => setUserEmail(savedEmail), 0);
    }
  }, []);

  const selectTask = (task: any) => {
    setTaskId(task.task_id);
    if (task.status === "completed") {
      if (eventSourceRef.current) eventSourceRef.current.close();
      setResultZip(task.result_path || true);
      setLoading(false);
      setProgress({ step: "Complete", percent: 100, message: "Ready to download!", chunks_total: 0, chunks_completed: 0, chunks_pending: 0, start_time: 0, eta_seconds: 0, completed_time: 0, queue_position: 0 } as any);
      setError(null);
    } else if (task.status === "failed" || task.status === "cancelled") {
      if (eventSourceRef.current) eventSourceRef.current.close();
      setError(task.message || "Task failed or cancelled.");
      setResultZip(null);
      setLoading(false);
    } else {
      setResultZip(null);
      setError(null);
      setLoading(true);
      pollProgress(task.task_id);
    }
  };

  const startNewUpload = () => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    setTaskId(null);
    setResultZip(null);
    setError(null);
    setLoading(false);
    setProgress({ step: "", percent: 0, message: "", chunks_total: 0, chunks_completed: 0, chunks_pending: 0, start_time: 0, eta_seconds: 0, completed_time: 0, queue_position: 0 } as any);
  };

  // Auto-fetch all tasks
  useEffect(() => {
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) return;

    const fetchTasks = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/user/tasks?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const tasks = await res.json();
          setActiveTasks(tasks);
        }
      } catch (err) {
        console.error("Failed to fetch tasks", err);
      }
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [user?.primaryEmailAddress?.emailAddress, baseUrl]);
  
  // Feature Toggles
  const [isolateVocals, setIsolateVocals] = useState<boolean>(true);
  const [isolateInstrumental, setIsolateInstrumental] = useState<boolean>(true);
  const [fourStem, setFourStem] = useState<boolean>(false);
  const [enhance, setEnhance] = useState<boolean>(false);
  const [stemToMidi, setStemToMidi] = useState<boolean>(false);
  const [deReverb, setDeReverb] = useState<boolean>(false);
  const [lyricSync, setLyricSync] = useState<boolean>(false);
  const [separateSpeakers, setSeparateSpeakers] = useState<boolean>(false);
  const [fastMode, setFastMode] = useState<boolean>(true);

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

  const checkHealth = async (selectedFile: File) => {
    if (!isSignedIn) return;
    setIsHealthChecking(true);
    setHealthReport(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch(`${baseUrl}/api/health`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setHealthReport(data);
      }
    } catch (e) {
      console.error("Health check failed", e);
    }
    setIsHealthChecking(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      checkHealth(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      checkHealth(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!isSignedIn) {
      openSignIn();
      return;
    }
    
    setLoading(true);
    setError(null);
    setResultZip(null);
    setProgress({ step: "Uploading...", percent: 5, message: "Sending file to cloud...", chunks_total: 0, chunks_completed: 0, chunks_pending: 0, start_time: 0, eta_seconds: 0, completed_time: 0, queue_position: 0 });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("isolate_vocals", isolateVocals.toString());
    formData.append("isolate_instrumental", isolateInstrumental.toString());
    formData.append("four_stem", fourStem.toString());
    formData.append("enhance_speech", enhance.toString());
    formData.append("stem_to_midi", stemToMidi.toString());
    formData.append("de_reverb", deReverb.toString());
    formData.append("lyric_sync", lyricSync.toString());
    formData.append("separate_speakers", separateSpeakers.toString());
    formData.append("fast_mode", fastMode.toString());
    formData.append("email", user?.primaryEmailAddress?.emailAddress || "");
    
    if (metadataCsv) {
      formData.append("metadata_csv", metadataCsv);
    }

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
            createdAt: serverTimestamp(),
            options: {
              isolateVocals,
              isolateInstrumental,
              fourStem,
              enhance,
              stemToMidi,
              deReverb,
              lyricSync,
              separateSpeakers,
              fastMode
            }
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

  // pollProgress moved to top to satisfy ESLint

  return (
    <div className="min-h-screen pb-20">
      
      {/* Massive Hero Section */}
      <div className="pt-16 pb-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4">
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1000px] aspect-square bg-[#1877F2]/5 rounded-full blur-[100px] pointer-events-none z-0" />

          {/* LEFT SIDEBAR: TOOLS PANEL */}
          <div className="lg:col-span-4 bg-[#111] border border-[#27272a] rounded-3xl p-6 shadow-2xl relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Settings2 className="w-6 h-6 text-[#1877F2]" /> Extraction Tools
              </h2>
            </div>
            
            {/* Basic Extraction Tools */}
            <div className="space-y-4">
              <button 
                onClick={() => setIsolateVocals(!isolateVocals)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                  isolateVocals 
                    ? 'bg-[#1877F2]/10 border-[#1877F2] shadow-[0_0_15px_rgba(24,119,242,0.15)]' 
                    : 'bg-[#050505] border-[#27272a] hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isolateVocals ? 'bg-[#1877F2] text-white' : 'bg-[#18191A] text-gray-400'}`}>
                    <Mic2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-bold ${isolateVocals ? 'text-white' : 'text-gray-300'}`}>Isolate Vocals</h3>
                    <p className="text-xs text-gray-500">Extract clean acapellas</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isolateVocals ? 'bg-[#1877F2]' : 'bg-[#27272a]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isolateVocals ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </button>

              <button 
                onClick={() => setIsolateInstrumental(!isolateInstrumental)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                  isolateInstrumental 
                    ? 'bg-rose-500/10 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                    : 'bg-[#050505] border-[#27272a] hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isolateInstrumental ? 'bg-rose-500 text-white' : 'bg-[#18191A] text-gray-400'}`}>
                    <AudioLines className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-bold ${isolateInstrumental ? 'text-white' : 'text-gray-300'}`}>Isolate Instrumental</h3>
                    <p className="text-xs text-gray-500">Remove vocals, keep music</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isolateInstrumental ? 'bg-rose-500' : 'bg-[#27272a]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isolateInstrumental ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </button>

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
                    <p className="text-xs text-gray-500">Vocals, Drums, Bass, & Other</p>
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
                    <Activity className="w-5 h-5" />
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
            {/* Pro / Coming Soon Tools */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Advanced / Pro Features</h2>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => setStemToMidi(!stemToMidi)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${
                  stemToMidi 
                    ? 'bg-yellow-500/10 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)]' 
                    : 'bg-[#050505] border-[#27272a] hover:border-gray-500'
                }`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${stemToMidi ? 'bg-yellow-500' : 'bg-transparent'}`}></div>
                <div className="flex items-center gap-3">
                  <FileMusic className={`w-5 h-5 ${stemToMidi ? 'text-yellow-500' : 'text-gray-500'}`} />
                  <div className="flex flex-col">
                    <span className={`font-bold ${stemToMidi ? 'text-white' : 'text-gray-300'}`}>Stem-to-MIDI <span className="ml-2 text-[9px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded font-bold uppercase">Pro</span></span>
                    <span className="text-[10px] text-gray-500">Convert Bass/Melody directly to .midi</span>
                  </div>
                </div>
                {/* Custom Toggle Switch UI */}
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${stemToMidi ? 'bg-yellow-500' : 'bg-[#27272a]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${stemToMidi ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </button>

              <button 
                onClick={() => setDeReverb(!deReverb)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${
                  deReverb 
                    ? 'bg-cyan-500/10 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                    : 'bg-[#050505] border-[#27272a] hover:border-gray-500'
                }`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${deReverb ? 'bg-cyan-500' : 'bg-transparent'}`}></div>
                <div className="flex items-center gap-3">
                  <Mic2 className={`w-5 h-5 ${deReverb ? 'text-cyan-500' : 'text-gray-500'}`} />
                  <div className="flex flex-col">
                    <span className={`font-bold ${deReverb ? 'text-white' : 'text-gray-300'}`}>AI De-Reverb <span className="ml-2 text-[9px] bg-cyan-500/20 text-cyan-500 px-2 py-0.5 rounded font-bold uppercase">Pro</span></span>
                    <span className="text-[10px] text-gray-500">Extract completely dry studio vocals</span>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${deReverb ? 'bg-cyan-500' : 'bg-[#27272a]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${deReverb ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </button>

              <button 
                onClick={() => setLyricSync(!lyricSync)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${
                  lyricSync 
                    ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                    : 'bg-[#050505] border-[#27272a] hover:border-gray-500'
                }`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${lyricSync ? 'bg-emerald-500' : 'bg-transparent'}`}></div>
                <div className="flex items-center gap-3">
                  <AlignLeft className={`w-5 h-5 ${lyricSync ? 'text-emerald-500' : 'text-gray-500'}`} />
                  <div className="flex flex-col">
                    <span className={`font-bold ${lyricSync ? 'text-white' : 'text-gray-300'}`}>Whisper Lyric Sync <span className="ml-2 text-[9px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded font-bold uppercase">Pro</span></span>
                    <span className="text-[10px] text-gray-500">Auto-generate .srt subtitle files</span>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${lyricSync ? 'bg-emerald-500' : 'bg-[#27272a]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${lyricSync ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </button>

              <button 
                onClick={() => setSeparateSpeakers(!separateSpeakers)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${
                  separateSpeakers 
                    ? 'bg-purple-500/10 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                    : 'bg-[#050505] border-[#27272a] hover:border-gray-500'
                }`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${separateSpeakers ? 'bg-purple-500' : 'bg-transparent'}`}></div>
                <div className="flex items-center gap-3">
                  <Users className={`w-5 h-5 ${separateSpeakers ? 'text-purple-500' : 'text-gray-500'}`} />
                  <div className="flex flex-col">
                    <span className={`font-bold ${separateSpeakers ? 'text-white' : 'text-gray-300'}`}>Separate Speakers <span className="ml-2 text-[9px] bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded font-bold uppercase">Pro</span></span>
                    <span className="text-[10px] text-gray-500">Auto-cut vocals into Speaker 1, Speaker 2, etc.</span>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${separateSpeakers ? 'bg-purple-500' : 'bg-[#27272a]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${separateSpeakers ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </button>

              <button 
                onClick={() => setFastMode(!fastMode)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${
                  fastMode 
                    ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(10,185,129,0.15)]' 
                    : 'bg-[#050505] border-[#27272a] hover:border-gray-500'
                }`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${fastMode ? 'bg-emerald-500' : 'bg-transparent'}`}></div>
                <div className="flex items-center gap-3">
                  <Zap className={`w-5 h-5 ${fastMode ? 'text-emerald-500' : 'text-gray-500'}`} />
                  <div className="flex flex-col">
                    <span className={`font-bold ${fastMode ? 'text-white' : 'text-gray-300'}`}>Fast CPU Mode</span>
                    <span className="text-[10px] text-gray-500">Uses MDX-Net. Uncheck for High Quality (Demucs).</span>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${fastMode ? 'bg-emerald-500' : 'bg-[#27272a]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${fastMode ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>
            
            <div className="mt-auto pt-8">
              <p className="text-xs text-center text-gray-600">Select your tools before dropping a file to process.</p>
            </div>
          </div>

          {/* RIGHT SIDE: FILE UPLOAD & RESULTS */}
          <div className="lg:col-span-8 bg-[#111] border border-[#27272a] rounded-3xl p-6 md:p-12 shadow-2xl relative z-10 flex flex-col min-h-[700px]">
            
            {/* MAIN FLOW DIAGRAM OR QUEUE */}
            {(progress as any).status === "queued" ? (
              <QueueWaitingRoom 
                position={progress.queue_position} 
                etaSeconds={progress.eta_seconds} 
                onCancel={async () => {
                  if (!taskId) return;
                  try {
                    await fetch(`${baseUrl}/api/cancel/${taskId}`, { method: 'POST' });
                    setLoading(false);
                    setResultZip(null);
                    setTaskId(null);
                    setFile(null);
                    window.history.replaceState({}, '', '/');
                    setError("Processing was cancelled from the queue.");
                  } catch (err) {
                    console.error(err);
                  }
                }}
              />
            ) : (
              <ExtractionFlowDiagram isProcessing={loading} progress={progress.percent} />
            )}
            
            {/* Dynamic Content Area */}
            <div className="flex-1 flex flex-col justify-center relative">
              {/* Massive Dropzone */}
              {!resultZip && !loading && (
              <div 
                className="border-2 border-dashed border-[#27272a] hover:border-[#1877F2] bg-[#050505] rounded-3xl p-8 sm:p-12 md:p-24 text-center cursor-pointer transition-all group h-full flex flex-col items-center justify-center"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById("fileInput")?.click()}
              >
                <input id="fileInput" type="file" className="hidden" accept="audio/*,video/*" onChange={handleFileChange} />
                
                <UploadCloud className="w-20 h-20 text-gray-500 group-hover:text-[#1877F2] mx-auto mb-6 transition-colors" />
                
                {file ? (
                  <div className="flex flex-col items-center">
                    <h3 className="text-3xl text-emerald-400 font-bold mb-4 break-words mx-auto">{file.name}</h3>
                    
                    <div className="mb-6 p-4 border border-[#27272a] rounded-xl bg-[#0a0a0a] w-full max-w-md">
                      <label className="block text-sm text-gray-400 mb-3 font-bold">Optional: Metadata CSV for Forced Alignment</label>
                      <input 
                        type="file" 
                        accept=".csv" 
                        className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1877F2]/10 file:text-[#1877F2] hover:file:bg-[#1877F2]/20 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setMetadataCsv(e.target.files[0]);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {metadataCsv && <p className="text-emerald-400 text-xs mt-2 text-left flex items-center gap-1"><Check className="w-3 h-3" /> {metadataCsv.name}</p>}
                    </div>

                    {/* Audio Health Report */}
                    {isHealthChecking && (
                      <div className="mb-8 w-full max-w-md bg-[#111] border border-[#27272a] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#1877F2] animate-pulse"></div>
                        <div className="flex items-center gap-3 justify-center text-gray-400">
                          <Activity className="w-5 h-5 animate-pulse text-[#1877F2]" />
                          <span className="font-medium animate-pulse">Running AI Audio Health Diagnostics...</span>
                        </div>
                      </div>
                    )}
                    
                    {healthReport && !isHealthChecking && (
                      <div className="mb-8 w-full max-w-md bg-[#111] border border-[#27272a] rounded-2xl p-6 shadow-xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className={`absolute top-0 left-0 w-full h-1 ${healthReport.score > 80 ? 'bg-emerald-500' : healthReport.score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                        
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-white font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-[#1877F2]" /> Audio Health Report</h4>
                          <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${healthReport.score > 80 ? 'bg-emerald-500/20 text-emerald-400' : healthReport.score > 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                            Score: {healthReport.score}/100
                          </div>
                        </div>

                        <div className="space-y-3 mb-6">
                          {healthReport.diagnostics && healthReport.diagnostics.map((diag: any, i: number) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {diag.status === 'good' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : diag.status === 'warning' ? <Activity className="w-4 h-4 text-yellow-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-gray-200">{diag.category}</p>
                                <p className="text-xs text-gray-500">{diag.issue}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {healthReport.recommendations && healthReport.recommendations.length > 0 && (
                          <div className="bg-[#1a1a1a] rounded-xl p-4 text-left border border-[#27272a]">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">AI Recommendations</p>
                            <ul className="text-sm text-gray-300 space-y-1 list-disc pl-4">
                              {healthReport.recommendations.map((rec: string, i: number) => (
                                <li key={i}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <p className="text-xs text-center text-gray-500 mt-4 font-medium bg-black/30 py-2 rounded-lg">
                          Predicted AI Improvement: <span className={healthReport.predictedImprovement === 'High' ? 'text-emerald-400 font-bold' : 'text-[#1877F2] font-bold'}>{healthReport.predictedImprovement}</span>
                        </p>
                      </div>
                    )}

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
            {loading && (progress as any).status !== "queued" && (
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
                
                <button 
                  onClick={async () => {
                    if (!taskId) return;
                    try {
                      await fetch(`${baseUrl}/api/cancel/${taskId}`, { method: 'POST' });
                      setLoading(false);
                      setResultZip(null);
                      setTaskId(null);
                      setFile(null);
                      window.history.replaceState({}, '', '/');
                      setError("Processing was cancelled.");
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="mt-8 px-6 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-full text-sm font-medium transition-colors"
                >
                  Cancel Processing
                </button>
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
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 bg-[#1a1a1a] border border-[#27272a] rounded-xl px-4 py-3 w-full sm:w-max mx-auto">
                    <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Task ID:</span>
                    <span className="text-white font-mono text-xs sm:text-sm tracking-wider break-all">{taskId}</span>
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
                
                <div className="mb-8 w-full max-w-2xl mx-auto">
                  <audio ref={vocalsAudioRef} src={`${baseUrl}/api/stream/${taskId}/vocals.wav`} preload="none" className="hidden" />
                  <SmartCompareStudio 
                    originalUrl={`${baseUrl}/api/stream/${taskId}/original.wav`}
                    cleanedUrl={`${baseUrl}/api/stream/${taskId}/vocals.wav`}
                    audioRef={vocalsAudioRef}
                  />
                </div>

                {lyricSync && <SyncedTranscriptPlayer taskId={taskId} baseUrl={baseUrl} audioRef={vocalsAudioRef} />}
                {lyricSync && <RawTranscriptViewer taskId={taskId} baseUrl={baseUrl} />}

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
                    className="inline-flex items-center justify-center gap-3 py-4 px-6 md:px-8 bg-[#1877F2] text-white rounded-full text-base md:text-lg font-bold hover:bg-[#166FE5] hover:-translate-y-1 shadow-[0_10px_30px_-10px_rgba(24,119,242,0.5)] transition-all w-full sm:w-auto"
                  >
                    <UploadCloud className="w-6 h-6 rotate-180" />
                    Download Custom ZIP
                  </a>
                  <p className="text-gray-500 text-xs text-center max-w-sm">
                    Files will be dynamically converted and packaged on our servers. This takes a few seconds.
                  </p>
                </div>
                <div className="text-center mt-6">
                  <button onClick={startNewUpload} className="text-gray-400 hover:text-white underline text-sm">
                    Process another file
                  </button>
                </div>
              </div>
            )}
            
            {/* Task Panel */}
            {activeTasks.length > 0 && (
              <div className="mt-8 border-t border-[#27272a] pt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2"><List className="w-5 h-5" /> Your Tasks</h3>
                  {taskId && (
                    <button onClick={startNewUpload} className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                      <Plus className="w-4 h-4" /> New Upload
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-2">
                  {activeTasks.map(task => (
                    <div 
                      key={task.task_id} 
                      onClick={() => selectTask(task)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${taskId === task.task_id ? 'bg-[#1877F2]/10 border-[#1877F2]' : 'bg-[#0a0a0a] border-[#27272a] hover:border-gray-500'}`}
                    >
                      <div className="flex items-center gap-3">
                        {task.status === 'processing' ? <Activity className="w-5 h-5 text-[#1877F2] animate-pulse" /> : 
                         task.status === 'queued' ? <List className="w-5 h-5 text-yellow-500" /> :
                         task.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                         <XCircle className="w-5 h-5 text-red-500" />
                        }
                        <div>
                           <p className="text-sm text-white font-bold">{task.metadata?.filename || 'Audio File'} <span className="text-xs text-gray-500 font-normal ml-2">{task.task_id.substring(0, 8)}</span></p>
                           <p className="text-xs text-gray-400 capitalize">{task.status} {task.status === 'processing' ? `${task.progress || 0}%` : ''} {task.status === 'queued' ? `(Pos: ${task.queue_position || '?'})` : ''}</p>
                        </div>
                      </div>
                      <button className="text-xs text-gray-400 hover:text-white bg-[#111] px-3 py-1 rounded-lg">View</button>
                    </div>
                  ))}
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

      {/* FAQ Section on Homepage */}
      <div className="max-w-4xl mx-auto px-4 mt-32 mb-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          <p className="text-gray-400 text-lg">Quick answers to common questions about VocalBee.</p>
        </div>
        <FAQAccordion faqs={faqs.slice(0, 10)} />
        <div className="text-center mt-10">
          <Link href="/faq" className="text-[#1877F2] hover:text-white transition-colors font-medium text-lg">
            View all 100 FAQs &rarr;
          </Link>
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
