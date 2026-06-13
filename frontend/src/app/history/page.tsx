"use client";
import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import Link from "next/link";
import { History, ExternalLink, SearchX, Lock, CheckCircle2, XCircle, Loader2, Copy, Check } from "lucide-react";

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

function TaskStatusRow({ item, onDelete }: { item: any, onDelete: (id: string) => void }) {
  const [status, setStatus] = useState<string>("loading"); // loading, processing, completed, failed
  const [progressText, setProgressText] = useState<string>("Checking status...");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.taskId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/status/${item.taskId}`);
        if (res.status === 404) {
          // Task expired/deleted
          onDelete(item.id);
          return;
        }
        
        const data = await res.json();
        
        if (data.status === "completed") {
          setStatus("completed");
          setProgressText("Extraction Finished");
          clearInterval(interval);
        } else if (data.status === "failed") {
          setStatus("failed");
          setProgressText("Processing Failed");
          clearInterval(interval);
        } else if (data.status === "cancelled") {
          setStatus("cancelled");
          setProgressText("Cancelled by User");
          clearInterval(interval);
        } else {
          setStatus("processing");
          setProgressText(`${data.progress || 0}% - ${data.message || "Working..."}`);
        }
      } catch (err) {
        // network issue, keep checking
      }
    };

    checkStatus();
    interval = setInterval(checkStatus, 3000);

    return () => clearInterval(interval);
  }, [item.taskId, item.id, onDelete]);

  return (
    <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/5 transition-colors border-b border-[#27272a] last:border-0">
      <div>
        <h3 className="text-lg font-bold text-white truncate max-w-sm mb-2">
          {item.filename || "Unknown Audio"}
        </h3>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center bg-[#1a1a1a] px-2 py-1 rounded text-xs font-mono border border-[#27272a]">
            <span>ID: {item.taskId.split("-")[0]}</span>
            <button 
              onClick={handleCopy}
              className="ml-2 hover:text-white transition-colors flex items-center"
              title="Copy full Task ID"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          {item.createdAt && (
            <span>{new Date(item.createdAt.toMillis()).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 w-full md:w-auto">
        {/* Animated Status Indicator */}
        <div className="flex items-center gap-2 min-w-[140px]">
          {status === "loading" && <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />}
          {status === "processing" && <Loader2 className="w-5 h-5 text-[#1877F2] animate-spin" />}
          {status === "completed" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          {status === "failed" && <XCircle className="w-5 h-5 text-red-500" />}
          {status === "cancelled" && <XCircle className="w-5 h-5 text-gray-500" />}
          
          <span className={`text-sm font-bold ${
            status === 'completed' ? 'text-emerald-500' : 
            status === 'failed' ? 'text-red-500' : 
            status === 'cancelled' ? 'text-gray-500' :
            status === 'processing' ? 'text-[#1877F2]' : 'text-gray-500'
          }`}>
            {progressText}
          </span>
        </div>

        <Link 
          href={status === 'completed' ? `/?taskId=${item.taskId}` : status === 'processing' ? `/?taskId=${item.taskId}` : '#'}
          className={`flex items-center justify-center sm:justify-start gap-2 px-4 py-3 sm:py-2 rounded-lg font-bold transition-all w-full sm:w-auto text-center ${
            status === 'processing' 
              ? 'bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 border border-[#1877F2]/30 cursor-pointer'
              : status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30 cursor-pointer'
                : 'bg-gray-800 text-gray-400 cursor-not-allowed opacity-50'
          }`}
          onClick={(e) => {
            if (status !== 'completed' && status !== 'processing') e.preventDefault();
          }}
        >
          {status === 'processing' ? 'View Progress' : status === 'completed' ? 'View Results' : status === 'cancelled' ? 'Cancelled' : 'Failed'} <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, "extractions"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Sort client-side
      docs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      setHistory(docs);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    if (user?.primaryEmailAddress?.emailAddress) {
      fetchHistory(user.primaryEmailAddress.emailAddress);
    }
  }, [user, isLoaded, isSignedIn, fetchHistory]);

  const handleDeleteTask = async (id: string) => {
    await deleteDoc(doc(db, "extractions", id));
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#1877F2] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Lock className="w-16 h-16 text-gray-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Sign in to view history</h2>
        <p className="text-gray-400">Your extraction history is tied to your account.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <History className="w-8 h-8 text-[#1877F2]" />
        <h1 className="text-3xl font-bold text-white">Your Extraction History</h1>
      </div>

      <div className="bg-[#111] border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <SearchX className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No active history found</h3>
            <p className="text-gray-400 max-w-md">
              You haven&apos;t extracted any files recently, or your previous extractions were automatically cleaned up from the temporary server storage.
            </p>
            <Link href="/" className="mt-6 bg-[#1877F2] text-white px-6 py-3 rounded-full font-bold hover:bg-[#166FE5] transition-colors">
              Extract a New File
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {history.map((item) => (
              <TaskStatusRow key={item.id} item={item} onDelete={handleDeleteTask} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
