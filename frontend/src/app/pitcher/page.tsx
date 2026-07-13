"use client";
import { useState, useEffect, useRef } from "react";
import { UploadCloud, Play, Pause, Download, SlidersHorizontal, Loader2, Music2 } from "lucide-react";
import * as Tone from "tone";

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function PitcherPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [pitch, setPitch] = useState(0); // semitones
  const [tempo, setTempo] = useState(1); // multiplier (1 = 100%)
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isToneLoaded, setIsToneLoaded] = useState(false);

  // Tone.js nodes
  const playerRef = useRef<Tone.Player | null>(null);
  const pitchShiftRef = useRef<Tone.PitchShift | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadAudio(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const loadAudio = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsToneLoaded(false);
    setIsPlaying(false);
    
    // Stop any existing playback
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current.dispose();
    }
    if (pitchShiftRef.current) {
      pitchShiftRef.current.dispose();
    }

    const url = URL.createObjectURL(selectedFile);
    
    await Tone.start();
    
    pitchShiftRef.current = new Tone.PitchShift({
      pitch: pitch
    }).toDestination();
    
    playerRef.current = new Tone.Player({
      url: url,
      loop: true,
      playbackRate: tempo,
      onload: () => {
        setIsToneLoaded(true);
      }
    }).connect(pitchShiftRef.current);
  };

  // Update nodes when state changes
  useEffect(() => {
    if (pitchShiftRef.current) {
      pitchShiftRef.current.pitch = pitch;
    }
  }, [pitch]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.playbackRate = tempo;
    }
  }, [tempo]);

  const togglePlay = async () => {
    if (!playerRef.current || !isToneLoaded) return;
    
    await Tone.start();
    
    if (isPlaying) {
      playerRef.current.stop();
    } else {
      playerRef.current.start();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = async () => {
    if (!file) return;
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("pitch_shift", pitch.toString());
    formData.append("tempo_shift", tempo.toString());

    try {
      const res = await fetch(`${baseUrl}/api/render_pitch`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to process audio");

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `pitched_${file.name}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert("An error occurred while rendering the audio.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-24 px-4 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Pitch & Tempo <span className="text-fuchsia-500">Changer</span>
        </h1>
        <p className="text-lg text-gray-400">
          Change the key and speed of your music independently.
        </p>
      </div>

      <div className="bg-[#111] border border-[#27272a] rounded-3xl p-6 md:p-10 shadow-2xl">
        {!file ? (
          <div 
            className="w-full border-2 border-dashed border-[#27272a] hover:border-fuchsia-500 bg-[#050505] rounded-3xl p-12 text-center cursor-pointer transition-all flex flex-col items-center"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById("fileInput")?.click()}
          >
            <input 
              id="fileInput" 
              type="file" 
              className="hidden" 
              accept="audio/*" 
              onChange={(e) => e.target.files && loadAudio(e.target.files[0])} 
            />
            <UploadCloud className="w-16 h-16 text-gray-500 mb-4" />
            <h3 className="text-2xl text-white font-bold mb-2">Drop your audio file here</h3>
            <p className="text-gray-400">or click to browse</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between bg-[#1a1a1a] p-4 rounded-xl border border-[#27272a]">
              <div className="flex items-center gap-4 truncate">
                <div className="w-12 h-12 bg-fuchsia-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Music2 className="w-6 h-6 text-fuchsia-500" />
                </div>
                <div className="truncate">
                  <h3 className="text-white font-bold truncate">{file.name}</h3>
                  <p className="text-sm text-gray-400">
                    {isToneLoaded ? "Ready to play" : "Loading audio engine..."}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  if (playerRef.current) { playerRef.current.stop(); playerRef.current.dispose(); }
                  setFile(null);
                  setIsPlaying(false);
                }}
                className="text-gray-400 hover:text-white text-sm whitespace-nowrap px-4"
              >
                Change File
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Pitch Slider */}
              <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-[#27272a]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Pitch <span className="text-xs font-normal text-gray-400">(Semitones)</span>
                  </h3>
                  <span className="text-2xl font-bold text-fuchsia-500">
                    {pitch > 0 ? `+${pitch}` : pitch}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="-12" 
                  max="12" 
                  step="1" 
                  value={pitch}
                  onChange={(e) => setPitch(parseInt(e.target.value))}
                  className="w-full accent-fuchsia-500 h-2 bg-[#27272a] rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2 font-mono">
                  <span>-12</span>
                  <span>0</span>
                  <span>+12</span>
                </div>
                <button 
                  onClick={() => setPitch(0)}
                  className="mt-4 text-sm text-gray-400 hover:text-white border border-[#27272a] rounded px-3 py-1 bg-[#1a1a1a]"
                >
                  Reset Pitch
                </button>
              </div>

              {/* Tempo Slider */}
              <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-[#27272a]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Speed <span className="text-xs font-normal text-gray-400">(Tempo)</span>
                  </h3>
                  <span className="text-2xl font-bold text-[#1877F2]">
                    {Math.round(tempo * 100)}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.01" 
                  value={tempo}
                  onChange={(e) => setTempo(parseFloat(e.target.value))}
                  className="w-full accent-[#1877F2] h-2 bg-[#27272a] rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2 font-mono">
                  <span>50%</span>
                  <span>100%</span>
                  <span>200%</span>
                </div>
                <button 
                  onClick={() => setTempo(1)}
                  className="mt-4 text-sm text-gray-400 hover:text-white border border-[#27272a] rounded px-3 py-1 bg-[#1a1a1a]"
                >
                  Reset Speed
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center mt-4">
              <button
                onClick={togglePlay}
                disabled={!isToneLoaded}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                  isToneLoaded 
                    ? "bg-white text-black hover:bg-gray-200" 
                    : "bg-[#27272a] text-gray-500 cursor-not-allowed"
                }`}
              >
                {isPlaying ? <Pause className="fill-current w-6 h-6" /> : <Play className="fill-current w-6 h-6" />}
                {isPlaying ? "Pause Preview" : "Play Preview"}
              </button>

              <button
                onClick={handleDownload}
                disabled={isProcessing || !isToneLoaded}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                  isProcessing
                    ? "bg-[#27272a] text-gray-500 cursor-wait"
                    : "bg-fuchsia-600 text-white hover:bg-fuchsia-500"
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Rendering...
                  </>
                ) : (
                  <>
                    <Download className="w-6 h-6" />
                    Save & Download
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
