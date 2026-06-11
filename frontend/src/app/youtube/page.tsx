"use client";
import { useState, Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { Search, Download, Video, Settings2, ShieldCheck, Lock } from 'lucide-react';

function YoutubeContent() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState("mp3");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ step: "", percent: 0, message: "", status: "" });
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { user, isLoaded, isSignedIn } = useUser();
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const handleDownload = async () => {
    if (!url) {
      setError("Please enter a YouTube URL.");
      return;
    }
    if (!isSignedIn) {
      setError("Please sign in to process files.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setResultPath(null);
    setProgress({ step: "Downloading...", percent: 50, message: "Server is downloading and converting...", status: "processing" });

    const formData = new FormData();
    formData.append("url", url);
    formData.append("format", format);
    formData.append("email", user?.primaryEmailAddress?.emailAddress || "");

    try {
      const res = await fetch(`${baseUrl}/api/youtube`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to process YouTube request");
      }

      // Instead of parsing JSON, we now receive the raw audio file directly
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      setResultPath(downloadUrl);
      setLoading(false);
      setProgress({ step: "Complete", percent: 100, message: "Ready to download!", status: "completed" });
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#1877F2]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between mb-12">
          <div>
            <h1 className="text-5xl font-black tracking-tight mb-2 flex items-center gap-4">
              <Video className="w-12 h-12 text-red-500" />
              YouTube <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Converter</span>
            </h1>
            <p className="text-[#a1a1aa] text-lg max-w-2xl mt-4">
              Instantly extract high-quality MP3 or WAV audio from any YouTube video. Powered by our background queue to ensure reliability.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
          
          {/* LEFT SIDE: OPTIONS */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#111] border border-[#27272a] rounded-3xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-red-500/20"></div>
              
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Format Options</h2>
                <Settings2 className="w-4 h-4 text-gray-600" />
              </div>
              
              <div className="space-y-4 relative z-10">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-[#27272a] hover:border-gray-500 transition-colors cursor-pointer bg-[#050505]">
                  <input type="radio" name="format" value="mp3" checked={format === "mp3"} onChange={() => setFormat("mp3")} className="accent-red-500 w-5 h-5" />
                  <div className="flex flex-col">
                    <span className="font-bold text-white">MP3 Format</span>
                    <span className="text-xs text-gray-500">Fast, small size, universal playback</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-[#27272a] hover:border-gray-500 transition-colors cursor-pointer bg-[#050505]">
                  <input type="radio" name="format" value="wav" checked={format === "wav"} onChange={() => setFormat("wav")} className="accent-red-500 w-5 h-5" />
                  <div className="flex flex-col">
                    <span className="font-bold text-white">WAV Format <span className="ml-2 text-[9px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded font-bold uppercase">Lossless</span></span>
                    <span className="text-xs text-gray-500">Uncompressed studio-quality audio</span>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-200">
              <span className="font-bold">Note:</span> Please ensure you have the right to download the content you request.
            </div>
          </div>

          {/* RIGHT SIDE: MAIN INPUT */}
          <div className="lg:col-span-8 bg-[#111] border border-[#27272a] rounded-3xl p-6 md:p-12 shadow-2xl relative z-10 flex flex-col min-h-[500px]">

            {/* Error Message */}
            {error && <div className="mt-6 p-6 bg-red-900/30 border border-red-500 text-red-200 rounded-2xl text-center font-medium absolute top-4 left-4 right-4">{error}</div>}

            {/* Input State */}
            {!resultPath && !loading && (
              <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
                {!isLoaded ? (
                   <h3 className="text-3xl text-center text-white font-bold mb-4">Loading...</h3>
                ) : !isSignedIn ? (
                  <div className="text-center">
                    <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-3xl md:text-4xl text-white font-bold mb-4">Login Required</h3>
                    <p className="text-gray-400 text-lg">You must sign in via the top right to download videos.</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-3xl font-bold text-white mb-6 text-center">Paste YouTube Link</h3>
                    
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-6 w-6 text-gray-500 group-focus-within:text-red-500 transition-colors" />
                      </div>
                      <input 
                        type="url" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full bg-[#050505] text-white border-2 border-[#27272a] focus:border-red-500 rounded-2xl py-6 pl-14 pr-6 text-lg outline-none transition-all shadow-[0_0_0_rgba(239,68,68,0)] focus:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                      />
                    </div>
                    
                    <button 
                      onClick={handleDownload}
                      disabled={!url}
                      className="mt-6 w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xl py-5 rounded-2xl shadow-[0_10px_30px_-10px_rgba(220,38,38,0.5)] hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                    >
                      <Download className="w-6 h-6" /> Extract Audio
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Loading State */}
            {loading && progress.status !== "queued" && (
              <div className="bg-[#050505] border border-[#27272a] rounded-3xl p-12 text-center h-full flex flex-col items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-red-500 border-r-4 border-r-transparent border-b-4 border-b-red-500/30 border-l-4 border-l-transparent mb-8"></div>
                
                <h3 className="text-4xl font-bold text-white mb-4">{progress.percent}%</h3>
                <h4 className="text-xl text-red-500 font-medium mb-2">{progress.step || "Preparing..."}</h4>
                <p className="text-[#a1a1aa] mb-8 text-lg">{progress.message}</p>
                
                <div className="mt-2 h-3 bg-[#27272a] rounded-full overflow-hidden w-full max-w-md mx-auto">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 relative transition-all duration-500" 
                    style={{ width: `${progress.percent}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
                  </div>
                </div>
              </div>
            )}

            {/* Success State */}
            {resultPath && (
              <div className="bg-[#050505] border border-[#27272a] rounded-3xl p-8 md:p-12 h-full flex flex-col justify-center text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">Download Complete!</h3>
                <p className="text-gray-400 text-md mb-8">Your audio file is ready to download.</p>
                
                <a 
                  href={resultPath} 
                  download={`youtube_audio.${format}`}
                  className="inline-flex items-center gap-3 py-4 px-8 bg-red-600 text-white rounded-full text-lg font-bold hover:bg-red-500 hover:-translate-y-1 shadow-[0_10px_30px_-10px_rgba(220,38,38,0.5)] transition-all mx-auto"
                >
                  <Download className="w-5 h-5" /> Download {format.toUpperCase()}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function YoutubePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white text-xl">Loading...</div>}>
      <YoutubeContent />
    </Suspense>
  );
}
