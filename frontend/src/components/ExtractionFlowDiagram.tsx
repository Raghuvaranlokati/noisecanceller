"use client";
import { useEffect, useState, useMemo } from "react";
import { Mic2, Activity, Music, UploadCloud, Cpu, Layers, FileArchive, CheckCircle2, Loader2 } from "lucide-react";

export default function ExtractionFlowDiagram({ isProcessing, progress }: { isProcessing: boolean, progress: number }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine active stage based on progress.percent or progress message
  // Using percent as a reliable fallback since messages might vary
  const activeStageIndex = useMemo(() => {
    if (!isProcessing && progress === 0) return 0; // Waiting
    if (progress === 100) return 5; // Done
    if (progress < 20) return 1; // Uploading
    if (progress < 50) return 2; // Demucs Separation
    if (progress < 70) return 3; // Enhancement
    if (progress < 90) return 4; // Whisper
    return 5; // Packaging
  }, [isProcessing, progress]);

  const stages = [
    { id: 1, title: "Input Audio", icon: UploadCloud, color: "text-gray-400", bg: "bg-gray-800 border-gray-700", glow: "shadow-none" },
    { id: 2, title: "Demucs v4", desc: "Source Separation", icon: Layers, color: "text-[#1877F2]", bg: "bg-[#1877F2]/10 border-[#1877F2]/50", glow: "shadow-[0_0_15px_rgba(24,119,242,0.4)]" },
    { id: 3, title: "DeepFilterNet", desc: "Denoise & De-reverb", icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/50", glow: "shadow-[0_0_15px_rgba(168,85,247,0.4)]" },
    { id: 4, title: "Whisper v3", desc: "Transcription", icon: Cpu, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/50", glow: "shadow-[0_0_15px_rgba(16,185,129,0.4)]" },
    { id: 5, title: "Final ZIP", icon: FileArchive, color: "text-white", bg: "bg-white/10 border-white/50", glow: "shadow-[0_0_15px_rgba(255,255,255,0.4)]" }
  ];

  if (!mounted) return null;

  return (
    <div className="w-full relative flex flex-col items-center bg-[#050505] rounded-3xl border border-[#27272a] overflow-hidden my-8 p-6 md:p-10 min-h-[500px]">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
      
      <div className="w-full flex justify-between items-center mb-8 relative z-10">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#1877F2]" /> 
          Live Model Pipeline
        </h3>
        {isProcessing && (
          <div className="bg-[#1877F2]/20 text-[#1877F2] px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            PROCESSING
          </div>
        )}
      </div>

      {/* Vertical Pipeline Layout */}
      <div className="relative w-full max-w-sm mx-auto flex flex-col gap-6 md:gap-8 z-10 py-4">
        
        {/* The Animated Line connecting everything */}
        <div className="absolute left-[39px] md:left-[47px] top-8 bottom-8 w-1 bg-[#27272a] rounded-full overflow-hidden">
          {/* Progress fill */}
          <div 
            className="w-full bg-gradient-to-b from-[#1877F2] via-purple-500 to-emerald-500 transition-all duration-1000 ease-in-out relative"
            style={{ height: \`\${(activeStageIndex / 5) * 100}%\` }}
          >
             <div className="absolute bottom-0 left-0 w-full h-10 bg-white/50 blur-sm animate-pulse"></div>
          </div>
        </div>

        {stages.map((stage, index) => {
          const isActive = activeStageIndex === stage.id;
          const isPast = activeStageIndex > stage.id;
          const Icon = stage.icon;
          
          return (
            <div key={stage.id} className={\`relative flex items-center gap-6 md:gap-8 transition-all duration-500 \${isActive ? 'scale-105 opacity-100' : isPast ? 'opacity-70 scale-100' : 'opacity-30 scale-95'}\`}>
              
              {/* Node Icon */}
              <div className={\`w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-2xl border-2 flex flex-col items-center justify-center relative z-10 transition-all duration-500 \${isActive ? stage.bg + ' ' + stage.glow : isPast ? 'bg-[#111] border-gray-600' : 'bg-[#0a0a0a] border-[#27272a]'}\`}>
                
                {isActive && <div className="absolute inset-0 rounded-2xl bg-white/5 animate-ping opacity-50"></div>}
                
                {isPast ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1" />
                ) : (
                  <Icon className={\`w-8 h-8 mb-1 \${isActive ? stage.color : 'text-gray-500'}\`} />
                )}
              </div>

              {/* Node Info */}
              <div className="flex flex-col">
                <span className={\`text-lg md:text-xl font-bold \${isActive ? 'text-white' : 'text-gray-400'}\`}>
                  {stage.title}
                </span>
                {stage.desc && (
                  <span className={\`text-xs md:text-sm \${isActive ? stage.color : 'text-gray-500'}\`}>
                    {stage.desc}
                  </span>
                )}
                
                {isActive && isProcessing && (
                  <div className="mt-2 flex items-center gap-2 text-xs font-mono text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Running tensor compute...
                  </div>
                )}
              </div>

            </div>
          );
        })}

      </div>
    </div>
  );
}
