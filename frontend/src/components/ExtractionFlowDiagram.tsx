"use client";
import { useEffect, useState } from "react";
import { Mic2, Drum, Activity, Music, Cpu, FileAudio } from "lucide-react";

export default function ExtractionFlowDiagram({ isProcessing, progress, stemCount = 4, isolateVocals = true }: { isProcessing: boolean, progress: number, stemCount?: number, isolateVocals?: boolean }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="w-full relative flex flex-col items-center justify-between bg-[#050505] rounded-3xl border border-[#27272a] overflow-hidden my-8 p-4 py-10 md:p-12 min-h-[400px] md:min-h-[500px]">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px]"></div>
      <div className="absolute top-[50%] left-1/2 -translate-x-1/2 w-48 h-48 bg-orange-500/10 rounded-full blur-[60px]"></div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dashFlow {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        .animated-line {
          stroke-dasharray: 8 8;
          animation: dashFlow ${isProcessing ? '1s' : '4s'} linear infinite;
        }
        .neon-glow-cyan { box-shadow: 0 0 15px rgba(6, 182, 212, 0.4), inset 0 0 10px rgba(6, 182, 212, 0.2); }
        .neon-glow-orange { box-shadow: 0 0 15px rgba(249, 115, 22, 0.4), inset 0 0 10px rgba(249, 115, 22, 0.2); }
        .neon-glow-green { box-shadow: 0 0 15px rgba(16, 185, 129, 0.4), inset 0 0 10px rgba(16, 185, 129, 0.2); }
        .neon-glow-purple { box-shadow: 0 0 15px rgba(168, 85, 247, 0.4), inset 0 0 10px rgba(168, 85, 247, 0.2); }
        .neon-glow-yellow { box-shadow: 0 0 15px rgba(234, 179, 8, 0.4), inset 0 0 10px rgba(234, 179, 8, 0.2); }
      `}} />

      {/* SVG CONNECTING LINES */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" preserveAspectRatio="none">
        <defs>
          <linearGradient id="grad-cyan-orange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          {/* Orange to Green */}
          <linearGradient id="grad-o-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          {/* Orange to Cyan */}
          <linearGradient id="grad-o-c" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          {/* Orange to Purple */}
          <linearGradient id="grad-o-p" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          {/* Orange to Yellow */}
          <linearGradient id="grad-o-y" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>

        {/* Level 1 to Level 2 */}
        <path d="M 50% 15% L 50% 50%" fill="none" stroke="url(#grad-cyan-orange)" strokeWidth="2" className={isProcessing ? "animated-line" : ""} opacity={0.6} />
        {isProcessing && <path d="M 50% 15% L 50% 50%" fill="none" stroke="#fff" strokeWidth="2" className="animated-line" style={{ filter: 'drop-shadow(0 0 5px #fff)' }} opacity={0.8} />}

        {isolateVocals && stemCount === 4 && (
          <>
            {/* Level 2 to Level 3 (Vocals) */}
            <path d="M 50% 50% C 50% 65%, 12.5% 70%, 12.5% 85%" fill="none" stroke="url(#grad-o-g)" strokeWidth="2" className={isProcessing ? "animated-line" : ""} opacity={0.6} />
            {isProcessing && <path d="M 50% 50% C 50% 65%, 12.5% 70%, 12.5% 85%" fill="none" stroke="#10b981" strokeWidth="2" className="animated-line" style={{ filter: 'drop-shadow(0 0 5px #10b981)' }} opacity={0.8} />}

            {/* Level 2 to Level 3 (Drums) */}
            <path d="M 50% 50% C 50% 65%, 37.5% 70%, 37.5% 85%" fill="none" stroke="url(#grad-o-c)" strokeWidth="2" className={isProcessing ? "animated-line" : ""} opacity={0.6} />
            {isProcessing && <path d="M 50% 50% C 50% 65%, 37.5% 70%, 37.5% 85%" fill="none" stroke="#06b6d4" strokeWidth="2" className="animated-line" style={{ filter: 'drop-shadow(0 0 5px #06b6d4)' }} opacity={0.8} />}

            {/* Level 2 to Level 3 (Bass) */}
            <path d="M 50% 50% C 50% 65%, 62.5% 70%, 62.5% 85%" fill="none" stroke="url(#grad-o-p)" strokeWidth="2" className={isProcessing ? "animated-line" : ""} opacity={0.6} />
            {isProcessing && <path d="M 50% 50% C 50% 65%, 62.5% 70%, 62.5% 85%" fill="none" stroke="#a855f7" strokeWidth="2" className="animated-line" style={{ filter: 'drop-shadow(0 0 5px #a855f7)' }} opacity={0.8} />}

            {/* Level 2 to Level 3 (Other) */}
            <path d="M 50% 50% C 50% 65%, 87.5% 70%, 87.5% 85%" fill="none" stroke="url(#grad-o-y)" strokeWidth="2" className={isProcessing ? "animated-line" : ""} opacity={0.6} />
            {isProcessing && <path d="M 50% 50% C 50% 65%, 87.5% 70%, 87.5% 85%" fill="none" stroke="#eab308" strokeWidth="2" className="animated-line" style={{ filter: 'drop-shadow(0 0 5px #eab308)' }} opacity={0.8} />}
          </>
        )}

        {isolateVocals && stemCount === 2 && (
          <>
            {/* Level 2 to Level 3 (Vocals) */}
            <path d="M 50% 50% C 50% 65%, 30% 70%, 30% 85%" fill="none" stroke="url(#grad-o-g)" strokeWidth="2" className={isProcessing ? "animated-line" : ""} opacity={0.6} />
            {isProcessing && <path d="M 50% 50% C 50% 65%, 30% 70%, 30% 85%" fill="none" stroke="#10b981" strokeWidth="2" className="animated-line" style={{ filter: 'drop-shadow(0 0 5px #10b981)' }} opacity={0.8} />}
            
            {/* Level 2 to Level 3 (Instrumental) */}
            <path d="M 50% 50% C 50% 65%, 70% 70%, 70% 85%" fill="none" stroke="url(#grad-o-c)" strokeWidth="2" className={isProcessing ? "animated-line" : ""} opacity={0.6} />
            {isProcessing && <path d="M 50% 50% C 50% 65%, 70% 70%, 70% 85%" fill="none" stroke="#06b6d4" strokeWidth="2" className="animated-line" style={{ filter: 'drop-shadow(0 0 5px #06b6d4)' }} opacity={0.8} />}
          </>
        )}
      </svg>

      {/* NODES LAYER */}
      <div className="z-10 w-full h-full flex flex-col items-center justify-between pointer-events-none min-h-[300px] md:min-h-[400px]">
        
        {/* TOP NODE */}
        <div className="flex flex-col items-center mt-2">
          <div className="border border-cyan-500 rounded-xl px-4 py-2 md:px-6 md:py-3 bg-[#0a0a0a]/90 backdrop-blur-sm neon-glow-cyan flex flex-col items-center min-w-[140px] md:min-w-[180px]">
            <span className="text-cyan-400 font-mono font-bold text-xs md:text-sm tracking-wider flex items-center gap-2">
              <FileAudio className="w-4 h-4" /> INPUT_AUDIO
            </span>
            <span className="text-gray-400 font-mono text-[10px] md:text-xs mt-1">.wav / .mp3</span>
          </div>
        </div>

        {/* MIDDLE NODE */}
        <div className="flex flex-col items-center relative my-auto">
          <div className={`border border-orange-500 rounded-xl px-4 py-3 md:px-8 md:py-4 bg-[#0a0a0a]/90 backdrop-blur-sm ${isProcessing ? 'neon-glow-orange scale-105' : 'border-orange-500/50'} transition-all duration-500 flex flex-col items-center min-w-[180px] md:min-w-[250px]`}>
            <span className={`font-mono font-bold text-xs md:text-base tracking-wider flex items-center gap-2 ${isProcessing ? 'text-orange-400' : 'text-orange-400/70'}`}>
              <Cpu className={`w-4 h-4 md:w-5 md:h-5 ${isProcessing ? 'animate-pulse' : ''}`} /> 
              TARGET(engine)
            </span>
            <span className="text-gray-400 font-mono text-[10px] md:text-xs mt-1">{isProcessing ? `processing.invoke(${progress}%)` : 'engine.ready()'}</span>
          </div>
        </div>

        {/* BOTTOM NODES */}
        {isolateVocals && (
          <div className={`w-full flex justify-around mt-auto relative z-10 gap-1 md:gap-4 px-1 ${stemCount === 2 ? 'max-w-[400px] mx-auto' : ''}`}>
            
            <div className={`flex flex-col items-center border border-emerald-500 rounded-xl py-2 px-1 md:px-4 bg-[#0a0a0a]/90 backdrop-blur-sm ${isProcessing ? 'neon-glow-green' : 'border-emerald-500/50'} flex-1 max-w-[80px] md:max-w-[120px]`}>
              <span className={`font-mono font-bold text-[9px] md:text-sm tracking-wider flex flex-col md:flex-row items-center gap-1 md:gap-2 ${isProcessing ? 'text-emerald-400' : 'text-emerald-400/70'}`}>
                <Mic2 className="w-3 h-3 md:w-4 md:h-4" /> Vocals
              </span>
              {isProcessing && <div className="w-[80%] h-1 bg-emerald-500/20 rounded-full mt-2 overflow-hidden"><div className="h-full bg-emerald-500 w-full animate-pulse"></div></div>}
            </div>

            {stemCount === 2 ? (
              <div className={`flex flex-col items-center border border-cyan-500 rounded-xl py-2 px-1 md:px-4 bg-[#0a0a0a]/90 backdrop-blur-sm ${isProcessing ? 'neon-glow-cyan' : 'border-cyan-500/50'} flex-1 max-w-[80px] md:max-w-[120px]`}>
                <span className={`font-mono font-bold text-[9px] md:text-sm tracking-wider flex flex-col md:flex-row items-center gap-1 md:gap-2 ${isProcessing ? 'text-cyan-400' : 'text-cyan-400/70'}`}>
                  <Music className="w-3 h-3 md:w-4 md:h-4" /> Inst
                </span>
                {isProcessing && <div className="w-[80%] h-1 bg-cyan-500/20 rounded-full mt-2 overflow-hidden"><div className="h-full bg-cyan-500 w-full animate-pulse" style={{animationDelay: '0.2s'}}></div></div>}
              </div>
            ) : (
              <>
                <div className={`flex flex-col items-center border border-cyan-500 rounded-xl py-2 px-1 md:px-4 bg-[#0a0a0a]/90 backdrop-blur-sm ${isProcessing ? 'neon-glow-cyan' : 'border-cyan-500/50'} flex-1 max-w-[80px] md:max-w-[120px]`}>
                  <span className={`font-mono font-bold text-[9px] md:text-sm tracking-wider flex flex-col md:flex-row items-center gap-1 md:gap-2 ${isProcessing ? 'text-cyan-400' : 'text-cyan-400/70'}`}>
                    <Drum className="w-3 h-3 md:w-4 md:h-4" /> Drums
                  </span>
                  {isProcessing && <div className="w-[80%] h-1 bg-cyan-500/20 rounded-full mt-2 overflow-hidden"><div className="h-full bg-cyan-500 w-full animate-pulse" style={{animationDelay: '0.2s'}}></div></div>}
                </div>

                <div className={`flex flex-col items-center border border-purple-500 rounded-xl py-2 px-1 md:px-4 bg-[#0a0a0a]/90 backdrop-blur-sm ${isProcessing ? 'neon-glow-purple' : 'border-purple-500/50'} flex-1 max-w-[80px] md:max-w-[120px]`}>
                  <span className={`font-mono font-bold text-[9px] md:text-sm tracking-wider flex flex-col md:flex-row items-center gap-1 md:gap-2 ${isProcessing ? 'text-purple-400' : 'text-purple-400/70'}`}>
                    <Activity className="w-3 h-3 md:w-4 md:h-4" /> Bass
                  </span>
                  {isProcessing && <div className="w-[80%] h-1 bg-purple-500/20 rounded-full mt-2 overflow-hidden"><div className="h-full bg-purple-500 w-full animate-pulse" style={{animationDelay: '0.4s'}}></div></div>}
                </div>

                <div className={`flex flex-col items-center border border-yellow-500 rounded-xl py-2 px-1 md:px-4 bg-[#0a0a0a]/90 backdrop-blur-sm ${isProcessing ? 'neon-glow-yellow' : 'border-yellow-500/50'} flex-1 max-w-[80px] md:max-w-[120px]`}>
                  <span className={`font-mono font-bold text-[9px] md:text-sm tracking-wider flex flex-col md:flex-row items-center gap-1 md:gap-2 ${isProcessing ? 'text-yellow-400' : 'text-yellow-400/70'}`}>
                    <Music className="w-3 h-3 md:w-4 md:h-4" /> Other
                  </span>
                  {isProcessing && <div className="w-[80%] h-1 bg-yellow-500/20 rounded-full mt-2 overflow-hidden"><div className="h-full bg-yellow-500 w-full animate-pulse" style={{animationDelay: '0.6s'}}></div></div>}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
