"use client";

import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, FastForward, Rewind, Activity, Music } from 'lucide-react';

interface SmartCompareStudioProps {
  originalUrl: string;
  cleanedUrl: string;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export default function SmartCompareStudio({ originalUrl, cleanedUrl, audioRef }: SmartCompareStudioProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const originalContainerRef = useRef<HTMLDivElement>(null);
  const originalAudioRef = useRef<HTMLAudioElement>(null);
  const localCleanedAudioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTrack, setActiveTrack] = useState<'original' | 'cleaned'>('cleaned');
  const [isReady, setIsReady] = useState(false);

  const originalWs = useRef<WaveSurfer | null>(null);
  const cleanedWs = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !originalContainerRef.current) return;

    // Initialize Original Waveform (Hidden from view but plays audio when active)
    const originalOptions: any = {
      container: originalContainerRef.current,
      waveColor: '#3f3f46',
      progressColor: '#71717a',
      height: 10,
    };
    
    if (originalAudioRef.current) {
      originalOptions.media = originalAudioRef.current;
    } else {
      originalOptions.url = originalUrl;
    }
    
    originalWs.current = WaveSurfer.create(originalOptions);

    // Initialize Cleaned Waveform (Visible)
    const cleanedOptions: any = {
      container: containerRef.current,
      waveColor: '#1877F2',
      progressColor: '#60A5FA',
      cursorColor: '#ffffff',
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 100,
    };

    if (audioRef && audioRef.current) {
      cleanedOptions.media = audioRef.current;
    } else if (localCleanedAudioRef.current) {
      cleanedOptions.media = localCleanedAudioRef.current;
    } else {
      cleanedOptions.url = cleanedUrl;
    }

    cleanedWs.current = WaveSurfer.create(cleanedOptions);

    // Sync play/pause
    cleanedWs.current.on('play', () => {
      setIsPlaying(true);
      originalWs.current?.play();
    });
    cleanedWs.current.on('pause', () => {
      setIsPlaying(false);
      originalWs.current?.pause();
    });
    
    // Sync seeking (When user clicks on the visible waveform)
    cleanedWs.current.on('seeking', (currentTime) => {
      originalWs.current?.setTime(currentTime);
    });

    Promise.all([
      new Promise(resolve => originalWs.current?.on('ready', resolve)),
      new Promise(resolve => cleanedWs.current?.on('ready', resolve))
    ]).then(() => {
      setIsReady(true);
      // Default to playing cleaned
      originalWs.current?.setVolume(0);
      cleanedWs.current?.setVolume(1);
    });

    return () => {
      originalWs.current?.destroy();
      cleanedWs.current?.destroy();
    };
  }, [originalUrl, cleanedUrl, audioRef]);

  const togglePlayback = () => {
    if (isPlaying) {
      cleanedWs.current?.pause();
      // originalWs is synced via events
    } else {
      cleanedWs.current?.play();
      // originalWs is synced via events
    }
  };

  const handleTrackSwitch = (track: 'original' | 'cleaned') => {
    setActiveTrack(track);
    if (track === 'original') {
      originalWs.current?.setVolume(1);
      cleanedWs.current?.setVolume(0);
    } else {
      originalWs.current?.setVolume(0);
      cleanedWs.current?.setVolume(1);
    }
  };

  return (
    <div className="bg-[#111] border border-[#27272a] rounded-2xl p-6 shadow-xl w-full relative">
      {/* Hidden container and audio for original track */}
      <div className="absolute opacity-0 pointer-events-none w-10 h-10 -z-10 overflow-hidden" aria-hidden="true">
        <div ref={originalContainerRef}></div>
        <audio ref={originalAudioRef} src={originalUrl} crossOrigin="anonymous" preload="auto" />
        {!audioRef && <audio ref={localCleanedAudioRef} src={cleanedUrl} crossOrigin="anonymous" preload="auto" />}
      </div>

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="text-[#1877F2]" /> Smart Compare Studio
        </h3>
        
        {/* A/B Toggle Switch */}
        <div className="flex bg-[#1a1a1a] rounded-lg p-1 border border-[#27272a]">
          <button
            onClick={() => handleTrackSwitch('original')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTrack === 'original' ? 'bg-[#27272a] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Original
          </button>
          <button
            onClick={() => handleTrackSwitch('cleaned')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTrack === 'cleaned' ? 'bg-[#1877F2] text-white shadow-[0_0_10px_rgba(24,119,242,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Music className="w-4 h-4" /> Cleaned
          </button>
        </div>
      </div>

      {/* Waveform Container */}
      <div className="relative mb-6">
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#111]/80 rounded-lg">
            <div className="w-6 h-6 border-2 border-[#1877F2] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <div ref={containerRef} className="w-full bg-[#0a0a0a] rounded-lg overflow-hidden border border-[#27272a]"></div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <button className="text-gray-400 hover:text-white transition-colors" onClick={() => {
          const time = cleanedWs.current?.getCurrentTime() || 0;
          cleanedWs.current?.setTime(Math.max(0, time - 5));
          originalWs.current?.setTime(Math.max(0, time - 5));
        }}>
          <Rewind className="w-6 h-6" />
        </button>
        
        <button 
          onClick={togglePlayback}
          disabled={!isReady}
          className={`w-14 h-14 flex items-center justify-center rounded-full transition-all ${isReady ? 'bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-[0_0_15px_rgba(24,119,242,0.4)] hover:scale-105' : 'bg-[#27272a] text-gray-500 cursor-not-allowed'}`}
        >
          {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current translate-x-0.5" />}
        </button>

        <button className="text-gray-400 hover:text-white transition-colors" onClick={() => {
          const time = cleanedWs.current?.getCurrentTime() || 0;
          cleanedWs.current?.setTime(Math.min(cleanedWs.current.getDuration() || 0, time + 5));
          originalWs.current?.setTime(Math.min(originalWs.current.getDuration() || 0, time + 5));
        }}>
          <FastForward className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
