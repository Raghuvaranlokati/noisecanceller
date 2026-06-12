"use client";
import { useEffect, useState, useRef } from 'react';

interface WordInfo {
  word: string;
  start: number;
  end: number;
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
  const [currentTime, setCurrentTime] = useState(0);
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
  }, [taskId, baseUrl]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handleTimeUpdate = () => setCurrentTime(audioEl.currentTime);
    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    return () => audioEl.removeEventListener('timeupdate', handleTimeUpdate);
  }, [audioRef, audioRef.current]);

  // Auto-scroll to active word
  useEffect(() => {
    if (activeWordRef.current && containerRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [currentTime]);

  if (words.length === 0) return null;

  return (
    <div className="bg-[#111] border border-[#27272a] rounded-2xl p-6 mb-8 w-full max-w-xl mx-auto overflow-hidden relative shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-emerald-400">🎤 Live Lyric Sync</h4>
        <div className="text-xs font-mono text-gray-500 bg-black/50 px-2 py-1 rounded">Powered by Whisper</div>
      </div>
      <div 
        ref={containerRef}
        className="max-h-56 overflow-y-auto scroll-smooth flex flex-wrap gap-x-2 gap-y-3 p-6 bg-black/80 rounded-xl border border-white/5 relative"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style dangerouslySetInnerHTML={{__html: `::-webkit-scrollbar { display: none; }`}} />
        {words.map((w, i) => {
          const isActive = currentTime >= w.start && currentTime <= w.end;
          const isPassed = currentTime > w.end;
          
          return (
            <span 
              key={i}
              ref={isActive ? activeWordRef : null}
              className={`text-xl md:text-2xl font-black transition-all duration-300 ${
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
