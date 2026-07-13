"use client";
import { useState } from "react";
import { UploadCloud, Music, Activity, Loader2 } from "lucide-react";

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function AnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ bpm: number, key: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to analyze file");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-24 px-4 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Key & BPM <span className="text-[#1877F2]">Finder</span>
        </h1>
        <p className="text-lg text-gray-400">
          Upload any song to instantly analyze its musical key and tempo.
        </p>
      </div>

      <div className="bg-[#111] border border-[#27272a] rounded-3xl p-8 md:p-12 shadow-2xl relative min-h-[400px] flex flex-col items-center justify-center">
        {!result && !loading && (
          <div 
            className="w-full border-2 border-dashed border-[#27272a] hover:border-[#1877F2] bg-[#050505] rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById("fileInput")?.click()}
          >
            <input 
              id="fileInput" 
              type="file" 
              className="hidden" 
              accept="audio/*,video/*" 
              onChange={(e) => e.target.files && setFile(e.target.files[0])} 
            />
            
            <UploadCloud className="w-16 h-16 text-gray-500 mb-4" />
            
            {file ? (
              <div className="flex flex-col items-center">
                <h3 className="text-xl text-emerald-400 font-bold mb-4">{file.name}</h3>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
                  className="bg-[#1877F2] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#166FE5] transition-all"
                >
                  Analyze Audio
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-2xl text-white font-bold mb-2">Drop your audio file here</h3>
                <p className="text-gray-400">or click to browse</p>
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center text-center">
            <Loader2 className="w-16 h-16 text-[#1877F2] animate-spin mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">Analyzing Audio...</h3>
            <p className="text-gray-400">Running AI pitch and beat detection algorithms.</p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <h3 className="text-red-500 text-xl font-bold mb-4">{error}</h3>
            <button onClick={() => {setError(null); setFile(null);}} className="text-gray-400 underline">Try Again</button>
          </div>
        )}

        {result && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl mx-auto">
              <div className="bg-[#0a0a0a] border border-[#27272a] rounded-2xl p-8 text-center flex flex-col items-center justify-center relative overflow-hidden group hover:border-[#1877F2] transition-colors">
                <div className="absolute inset-0 bg-[#1877F2]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Music className="w-10 h-10 text-[#1877F2] mb-4 relative z-10" />
                <h4 className="text-gray-400 text-sm font-bold tracking-widest uppercase mb-2 relative z-10">Musical Key</h4>
                <div className="text-4xl md:text-6xl font-bold text-white relative z-10">
                  {result.key}
                </div>
              </div>
              
              <div className="bg-[#0a0a0a] border border-[#27272a] rounded-2xl p-8 text-center flex flex-col items-center justify-center relative overflow-hidden group hover:border-emerald-500 transition-colors">
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Activity className="w-10 h-10 text-emerald-500 mb-4 relative z-10" />
                <h4 className="text-gray-400 text-sm font-bold tracking-widest uppercase mb-2 relative z-10">Tempo (BPM)</h4>
                <div className="text-4xl md:text-6xl font-bold text-white relative z-10">
                  {result.bpm}
                </div>
              </div>
            </div>
            
            <div className="text-center mt-12">
              <button 
                onClick={() => {setResult(null); setFile(null);}}
                className="bg-[#1a1a1a] border border-[#27272a] text-white px-6 py-3 rounded-full font-bold hover:bg-[#27272a] transition-all"
              >
                Analyze Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
