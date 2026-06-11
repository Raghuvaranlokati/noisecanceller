"use client";
import { useEffect, useState } from "react";
import { Mic2, Drum, Activity, Music } from "lucide-react";

export default function ExtractionFlowDiagram({ isProcessing, progress }: { isProcessing: boolean, progress: number }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  if (!mounted) return null;

  // The dash animation CSS is embedded here to keep the component self-contained
  return (
    <div className="w-full h-64 md:h-80 relative flex items-center justify-center bg-[#050505] rounded-3xl border border-[#27272a] overflow-hidden my-8 p-4">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes flowData {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-flow {
          stroke-dasharray: 20 40;
          animation: flowData ${isProcessing ? '1.5s' : '8s'} linear infinite;
        }
        .glow-filter {
          filter: drop-shadow(0 0 8px rgba(24, 119, 242, 0.6));
        }
        @keyframes pulseNode {
          0% { box-shadow: 0 0 0 0 rgba(24, 119, 242, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(24, 119, 242, 0); }
          100% { box-shadow: 0 0 0 0 rgba(24, 119, 242, 0); }
        }
        .node-pulse {
          animation: pulseNode ${isProcessing ? '1s' : '3s'} infinite;
        }
      `}} />

      {/* SVG Container for the connecting lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        
        {/* Paths */}
        {/* Vocals Path */}
        <path d="M 30% 50% C 50% 50%, 60% 20%, 80% 20%" fill="none" stroke="#27272a" strokeWidth="3" />
        <path d="M 30% 50% C 50% 50%, 60% 20%, 80% 20%" fill="none" stroke="#1877F2" strokeWidth="3" className="animate-flow glow-filter" opacity={isProcessing ? 0.8 : 0.2} />
        
        {/* Drums Path */}
        <path d="M 30% 50% C 50% 50%, 60% 40%, 80% 40%" fill="none" stroke="#27272a" strokeWidth="3" />
        <path d="M 30% 50% C 50% 50%, 60% 40%, 80% 40%" fill="none" stroke="#10B981" strokeWidth="3" className="animate-flow" style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))' }} opacity={isProcessing ? 0.8 : 0.2} />
        
        {/* Bass Path */}
        <path d="M 30% 50% C 50% 50%, 60% 60%, 80% 60%" fill="none" stroke="#27272a" strokeWidth="3" />
        <path d="M 30% 50% C 50% 50%, 60% 60%, 80% 60%" fill="none" stroke="#F59E0B" strokeWidth="3" className="animate-flow" style={{ filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.6))' }} opacity={isProcessing ? 0.8 : 0.2} />
        
        {/* Other Path */}
        <path d="M 30% 50% C 50% 50%, 60% 80%, 80% 80%" fill="none" stroke="#27272a" strokeWidth="3" />
        <path d="M 30% 50% C 50% 50%, 60% 80%, 80% 80%" fill="none" stroke="#8B5CF6" strokeWidth="3" className="animate-flow" style={{ filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))' }} opacity={isProcessing ? 0.8 : 0.2} />
        
      </svg>

      {/* Nodes */}
      {/* Source Node (Left) */}
      <div className="absolute left-[20%] md:left-[25%] top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className={`w-16 h-16 md:w-20 md:h-20 bg-[#111] border-2 ${isProcessing ? 'border-[#1877F2]' : 'border-[#27272a]'} rounded-full flex items-center justify-center z-10 node-pulse transition-colors duration-500`}>
          <Music className={`w-8 h-8 ${isProcessing ? 'text-[#1877F2]' : 'text-gray-500'}`} />
        </div>
        <div className="mt-4 text-sm font-bold text-white tracking-widest uppercase">Input Audio</div>
        {isProcessing && (
          <div className="mt-2 text-xs text-[#1877F2] font-mono">{progress}% Processing...</div>
        )}
      </div>

      {/* Destination Nodes (Right) */}
      <div className="absolute right-[10%] md:right-[15%] top-0 h-full flex flex-col justify-center gap-4 md:gap-8 translate-x-1/2 w-32">
        
        {/* Vocals */}
        <div className="flex items-center gap-3 relative top-[-10%] md:top-[-5%]">
          <div className={`w-10 h-10 md:w-12 md:h-12 bg-[#111] border-2 ${isProcessing ? 'border-[#1877F2] shadow-[0_0_15px_rgba(24,119,242,0.5)]' : 'border-[#27272a]'} rounded-full flex items-center justify-center z-10 transition-all duration-500`}>
            <Mic2 className={`w-5 h-5 ${isProcessing ? 'text-[#1877F2]' : 'text-gray-500'}`} />
          </div>
          <span className="text-xs md:text-sm font-bold text-gray-300">Vocals</span>
        </div>

        {/* Drums */}
        <div className="flex items-center gap-3 relative top-[-5%] md:top-[-2%]">
          <div className={`w-10 h-10 md:w-12 md:h-12 bg-[#111] border-2 ${isProcessing ? 'border-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'border-[#27272a]'} rounded-full flex items-center justify-center z-10 transition-all duration-500`}>
            <Drum className={`w-5 h-5 ${isProcessing ? 'text-[#10B981]' : 'text-gray-500'}`} />
          </div>
          <span className="text-xs md:text-sm font-bold text-gray-300">Drums</span>
        </div>

        {/* Bass */}
        <div className="flex items-center gap-3 relative top-[5%] md:top-[2%]">
          <div className={`w-10 h-10 md:w-12 md:h-12 bg-[#111] border-2 ${isProcessing ? 'border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'border-[#27272a]'} rounded-full flex items-center justify-center z-10 transition-all duration-500`}>
            <Activity className={`w-5 h-5 ${isProcessing ? 'text-[#F59E0B]' : 'text-gray-500'}`} />
          </div>
          <span className="text-xs md:text-sm font-bold text-gray-300">Bass</span>
        </div>

        {/* Other */}
        <div className="flex items-center gap-3 relative top-[10%] md:top-[5%]">
          <div className={`w-10 h-10 md:w-12 md:h-12 bg-[#111] border-2 ${isProcessing ? 'border-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'border-[#27272a]'} rounded-full flex items-center justify-center z-10 transition-all duration-500`}>
            <Music className={`w-5 h-5 ${isProcessing ? 'text-[#8B5CF6]' : 'text-gray-500'}`} />
          </div>
          <span className="text-xs md:text-sm font-bold text-gray-300">Other</span>
        </div>
        
      </div>
      
    </div>
  );
}
