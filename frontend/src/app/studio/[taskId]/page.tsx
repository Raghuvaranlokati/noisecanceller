"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Play, Pause, Volume2, VolumeX, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface Track {
  id: string;
  name: string;
  filename: string;
  color: string;
}

const TRACKS: Track[] = [
  { id: "vocals", name: "Vocals", filename: "vocals.wav", color: "from-pink-500 to-rose-500" },
  { id: "bass", name: "Bass", filename: "bass.wav", color: "from-blue-500 to-cyan-500" },
  { id: "drums", name: "Drums", filename: "drums.wav", color: "from-amber-500 to-orange-500" },
  { id: "instrumental", name: "Instrumental", filename: "instrumental.wav", color: "from-emerald-500 to-teal-500" }
];

export default function StudioMixer({ params }: { params: { taskId: string } }) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumes, setVolumes] = useState<Record<string, number>>({
    vocals: 0.8, bass: 0.8, drums: 0.8, instrumental: 0.8
  });
  const [muted, setMuted] = useState<Record<string, boolean>>({
    vocals: false, bass: false, drums: false, instrumental: false
  });
  const [solo, setSolo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Refs for audio elements
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    // Check if the task exists and is completed
    const checkTask = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/status/${params.taskId}`);
        if (!res.ok) throw new Error("Task not found");
        const data = await res.json();
        if (data.status !== "completed") {
          throw new Error("Task not ready");
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        router.push("/history");
      }
    };
    checkTask();
  }, [params.taskId, router]);

  // Sync play/pause across all tracks
  const togglePlay = () => {
    if (isPlaying) {
      Object.values(audioRefs.current).forEach(audio => audio?.pause());
    } else {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.play().catch(e => console.error("Playback failed", e));
        }
      });
    }
    setIsPlaying(!isPlaying);
  };

  // Sync volumes when state changes
  useEffect(() => {
    TRACKS.forEach(track => {
      const audio = audioRefs.current[track.id];
      if (audio) {
        if (muted[track.id] || (solo && solo !== track.id)) {
          audio.volume = 0;
        } else {
          audio.volume = volumes[track.id];
        }
      }
    });
  }, [volumes, muted, solo]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-black">
        <Loader2 className="w-12 h-12 text-[#1877F2] animate-spin mb-4" />
        <p className="text-white font-bold text-xl">Loading Studio...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-[#0a0a0a] text-white p-4 md:p-8 relative rounded-3xl border border-[#27272a] shadow-2xl mt-6 md:mt-12 mb-20 max-w-6xl mx-auto">
      {/* Hidden audio elements */}
      {TRACKS.map(track => (
        <audio
          key={track.id}
          ref={el => {
            if (el) audioRefs.current[track.id] = el;
          }}
          src={`${baseUrl}/api/stream/${params.taskId}/${track.filename}`}
          loop
          crossOrigin="anonymous"
        />
      ))}

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 md:mb-12">
        <div>
          <Link href="/history" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to History
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
            Studio Mixer
          </h1>
          <p className="text-gray-400 mt-2">ID: {params.taskId.split("-")[0]}</p>
        </div>
        
        {/* Master Transport Controls */}
        <div className="bg-[#1a1a1a] p-3 md:p-4 rounded-2xl border border-[#27272a] flex items-center gap-6 w-full md:w-auto justify-center">
          <button 
            onClick={togglePlay}
            className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause className="w-6 h-6 md:w-8 md:h-8" /> : <Play className="w-6 h-6 md:w-8 md:h-8 ml-1" />}
          </button>
        </div>
      </div>

      {/* Mixer Console */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {TRACKS.map(track => (
          <div key={track.id} className="bg-[#111] border border-[#27272a] rounded-2xl p-6 flex flex-col items-center">
            
            {/* Track Header */}
            <div className={`w-full h-2 rounded-full bg-gradient-to-r ${track.color} mb-6`} />
            <h3 className="text-xl font-bold mb-8">{track.name}</h3>
            
            {/* Volume Fader */}
            <div className="relative h-64 w-12 bg-black rounded-full mb-8 border border-[#27272a] flex justify-center py-4">
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                value={volumes[track.id]}
                onChange={(e) => setVolumes({...volumes, [track.id]: parseFloat(e.target.value)})}
                className="absolute top-1/2 -translate-y-1/2 w-56 h-full appearance-none bg-transparent cursor-pointer"
                style={{ transform: "rotate(-90deg)" }}
              />
            </div>
            
            {/* Controls */}
            <div className="flex gap-4 w-full justify-center">
              <button 
                onClick={() => setMuted({...muted, [track.id]: !muted[track.id]})}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  muted[track.id] 
                    ? "bg-red-500/20 text-red-500 border border-red-500/50" 
                    : "bg-[#1a1a1a] text-gray-400 hover:bg-[#222]"
                }`}
              >
                M
              </button>
              <button 
                onClick={() => setSolo(solo === track.id ? null : track.id)}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  solo === track.id 
                    ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]" 
                    : "bg-[#1a1a1a] text-gray-400 hover:bg-[#222]"
                }`}
              >
                S
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
