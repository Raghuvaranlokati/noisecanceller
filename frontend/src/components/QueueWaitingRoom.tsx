import React from 'react';
import { Clock, Users, Zap, ShieldCheck } from 'lucide-react';

interface QueueWaitingRoomProps {
  position: number;
  etaSeconds: number;
  onCancel?: () => void;
}

const QueueWaitingRoom: React.FC<QueueWaitingRoomProps> = ({ position, etaSeconds, onCancel }) => {
  // Format ETA beautifully
  const minutes = Math.floor(etaSeconds / 60);
  const seconds = etaSeconds % 60;
  const etaText = minutes > 0 ? `~${minutes} min ${seconds} sec` : `~${seconds} sec`;

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl bg-black border border-[#27272a] shadow-2xl overflow-hidden mt-8 relative group">
      
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 opacity-50"></div>
      
      {/* Scanning Line Animation */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-[scan_3s_ease-in-out_infinite]"></div>
      
      <div className="relative p-10 md:p-14 flex flex-col items-center justify-center text-center space-y-8">
        
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Users className="w-4 h-4" />
            Waiting Room
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            You are in line.
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto mt-2">
            Our AI models are heavy, so we process extractions one by one.
            <br/><br/>
            <span className="text-emerald-400 font-bold block animate-pulse">
              You can safely close this tab!
            </span>
            <span className="text-xs text-gray-500 mt-1 block">
              Your audio is processing securely in the background. You can come back later and check your <strong>History</strong> page to download the results. <br/>
              <em>(Note: Tasks may be lost if the upstream server performs a hardware restart)</em>
            </span>
          </p>
        </div>

        {/* Large Number Display */}
        <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full border-2 border-[#27272a] bg-[#0a0a0a] flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.15)] mt-4">
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
          
          <div className="flex flex-col items-center justify-center">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Position</span>
            <span className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
              #{position}
            </span>
          </div>
        </div>

        {/* ETA Section */}
        <div className="flex flex-col items-center justify-center bg-[#111] border border-[#27272a] rounded-2xl p-4 w-full max-w-xs mt-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
            <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-pink-500" />
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Estimated Wait</span>
            </div>
            <span className="text-xl font-bold text-white">{etaText}</span>
        </div>

        {/* Features / Reassurance Footer */}
        <div className="grid grid-cols-2 gap-4 w-full pt-6 border-t border-[#27272a]/50 mt-4">
            <div className="flex flex-col items-center justify-center text-center p-3">
                <ShieldCheck className="w-5 h-5 text-gray-500 mb-2" />
                <span className="text-xs font-semibold text-gray-300">Secure Processing</span>
                <span className="text-[10px] text-gray-600 mt-1">Files deleted after 24h</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-3">
                <Zap className="w-5 h-5 text-gray-500 mb-2" />
                <span className="text-xs font-semibold text-gray-300">Pro Tools Active</span>
                <span className="text-[10px] text-gray-600 mt-1">Highest quality output</span>
            </div>
        </div>
        
        {onCancel && (
          <button 
            onClick={onCancel}
            className="mt-2 px-6 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-full text-sm font-medium transition-colors"
          >
            Cancel Processing
          </button>
        )}

      </div>
      
      {/* Custom CSS for Scanning animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0%, 100% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translateY(400px); opacity: 1; }
          90% { opacity: 0; }
        }
      `}} />
    </div>
  );
};

export default QueueWaitingRoom;
