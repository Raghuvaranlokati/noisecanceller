"use client";
import { useEffect, useState, useRef } from 'react';
import { Search, Clock, MessageSquare, VolumeX } from 'lucide-react';

interface WordInfo {
  word: string;
  start: number;
  end: number;
}

interface TimelineMarker {
  type: 'speech' | 'silence';
  start: number;
  end: number;
  text?: string;
  duration?: number;
}

export default function SyncedTranscriptPlayer({ 
  taskId, 
  baseUrl, 
  audioRef 
}: { 
  taskId: string, 
  baseUrl: string,
  audioRef: React.RefObject<HTMLAudioElement | null>
}) {
  const [words, setWords] = useState<WordInfo[]>([]);
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    fetch(`${baseUrl}/api/stream/${taskId}/transcript.json`)
      .then(res => {
        if (!res.ok) throw new Error("Transcript not found");
        return res.json();
      })
      .then(data => {
        if (data.words) setWords(data.words);
      })
      .catch(err => console.log("No transcript found for this task"));
      
    fetch(`${baseUrl}/api/stream/${taskId}/timeline_markers.json`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.markers) setMarkers(data.markers);
      })
      .catch(() => {});
  }, [taskId, baseUrl]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handleTimeUpdate = () => setCurrentTime(audioEl.currentTime);
    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    return () => audioEl.removeEventListener('timeupdate', handleTimeUpdate);
  }, [audioRef, audioRef.current]);

  // Auto-scroll to active word if not searching
  useEffect(() => {
    if (activeWordRef.current && containerRef.current && searchQuery === "") {
      activeWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [currentTime, searchQuery]);

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  if (words.length === 0) return null;

  return (
    <div className="bg-[#111] border border-[#27272a] rounded-2xl p-6 mb-8 w-full max-w-2xl mx-auto overflow-hidden relative shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <h4 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" /> Audio Intelligence Transcript
        </h4>
        
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#27272a] rounded-full pl-9 pr-4 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-[#1877F2] transition-colors"
          />
        </div>
      </div>
      
      {/* Timeline Intelligence Strip */}
      {markers.length > 0 && (
        <div className="mb-4 bg-[#0a0a0a] rounded-lg p-2 border border-[#27272a]">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-500 uppercase tracking-widest px-1">
            <Clock className="w-3 h-3" /> Timeline Segments
          </div>
          <div className="flex w-full h-4 rounded overflow-hidden">
            {markers.map((m, i) => {
              const totalDuration = markers[markers.length-1].end;
              const widthPct = ((m.end - m.start) / totalDuration) * 100;
              return (
                <div 
                  key={i} 
                  title={`${m.type} (${m.start.toFixed(1)}s - ${m.end.toFixed(1)}s)`}
                  className={`h-full cursor-pointer hover:brightness-125 transition-all ${m.type === 'silence' ? 'bg-[#27272a]' : 'bg-[#1877F2]'}`}
                  style={{ width: `${widthPct}%` }}
                  onClick={() => seekTo(m.start)}
                />
              )
            })}
          </div>
          <div className="flex justify-between mt-1 px-1 text-[10px] text-gray-600 font-mono">
            <span>0:00</span>
            <span className="flex items-center gap-1"><VolumeX className="w-3 h-3" /> Gray = Silence</span>
            <span>{Math.floor(markers[markers.length-1]?.end || 0)}s</span>
          </div>
        </div>
      )}

      <div 
        ref={containerRef}
        className="max-h-64 overflow-y-auto scroll-smooth flex flex-wrap gap-x-2 gap-y-3 p-6 bg-black/80 rounded-xl border border-white/5 relative"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style dangerouslySetInnerHTML={{__html: `::-webkit-scrollbar { display: none; }`}} />
        {words.map((w, i) => {
          const isActive = currentTime >= w.start && currentTime <= w.end;
          const isPassed = currentTime > w.end;
          const matchesSearch = searchQuery && w.word.toLowerCase().includes(searchQuery.toLowerCase());
          
          return (
            <span 
              key={i}
              ref={isActive ? activeWordRef : null}
              onClick={() => seekTo(w.start)}
              className={`text-xl md:text-2xl font-black cursor-pointer transition-all duration-300 hover:text-white ${
                matchesSearch ? 'bg-yellow-500/30 text-yellow-300 px-1 rounded' :
                isActive ? 'text-[#1877F2] scale-110 drop-shadow-[0_0_8px_rgba(24,119,242,0.8)]' : 
                isPassed ? 'text-gray-300' : 'text-gray-600'
              }`}
              style={{
                 textShadow: isActive ? '0px 0px 10px rgba(24,119,242,0.8)' : 'none'
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
