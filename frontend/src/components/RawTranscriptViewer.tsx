import React, { useState, useEffect } from 'react';
import { Copy, FileText, Check } from 'lucide-react';

interface RawTranscriptViewerProps {
  taskId: string;
  baseUrl: string;
}

export default function RawTranscriptViewer({ taskId, baseUrl }: RawTranscriptViewerProps) {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/stream/${taskId}/lyrics.srt`);
        if (res.ok) {
          const text = await res.text();
          setTranscript(text);
        } else {
          setTranscript(null);
        }
      } catch (err) {
        console.error("Failed to fetch transcript", err);
        setTranscript(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTranscript();
  }, [taskId, baseUrl]);

  const handleCopy = () => {
    if (transcript) {
      navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return null;
  if (!transcript || transcript.trim() === '') return null; // Don't render if there's no transcript

  return (
    <div className="bg-[#111] border border-[#27272a] rounded-2xl p-6 mb-8 w-full max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-500" /> Raw Transcript
        </h4>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-2 text-sm bg-[#1a1a1a] hover:bg-[#27272a] border border-[#27272a] transition-colors text-gray-300 px-3 py-1.5 rounded-lg"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Text'}
        </button>
      </div>
      <div className="bg-[#050505] border border-[#27272a] rounded-xl p-4 max-h-64 overflow-y-auto font-mono text-sm text-gray-300 whitespace-pre-wrap">
        {transcript}
      </div>
    </div>
  );
}
