"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import Link from "next/link";
import { History, ExternalLink, SearchX, Lock, CheckCircle2, XCircle, Loader2, Copy, Check, Search, Filter, Play, Download, Trash2, SlidersHorizontal, ArrowUpDown } from "lucide-react";

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

function TaskStatusRow({ item, onDelete }: { item: any, onDelete: (id: string) => void }) {
  const [status, setStatus] = useState<string>("loading"); // loading, processing, completed, failed
  const [progressText, setProgressText] = useState<string>("Checking status...");
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
          setStatus("expired");
          setProgressText("Expired / Removed");
          clearInterval(interval);
          return;
        }
        
        const data = await res.json();
        
        if (data.status === "completed") {
          setStatus("completed");
          setProgressText("Ready");
          clearInterval(interval);
        } else if (data.status === "failed") {
          setStatus("failed");
          setProgressText("Failed");
          clearInterval(interval);
        } else if (data.status === "cancelled") {
          setStatus("cancelled");
          setProgressText("Cancelled");
          clearInterval(interval);
        } else {
          setStatus("processing");
          setProgressText(`${data.progress || 0}%`);
        }
      } catch (err) {
        // network issue, keep checking
      }
    };

    checkStatus();
    interval = setInterval(checkStatus, 3000);

    return () => clearInterval(interval);
  }, [item.taskId]);

  const handleDelete = async () => {
    if(confirm("Are you sure you want to delete this extraction record?")) {
      setIsDeleting(true);
      await onDelete(item.id);
    }
  };

  return (
    <div className={`p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-all duration-300 border-b border-[#27272a] last:border-0 ${isDeleting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          {status === "loading" && <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />}
          {status === "processing" && <Loader2 className="w-4 h-4 text-[#1877F2] animate-spin" />}
          {status === "completed" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {status === "failed" && <XCircle className="w-4 h-4 text-red-500" />}
          {status === "cancelled" && <XCircle className="w-4 h-4 text-gray-500" />}
          {status === "expired" && <SearchX className="w-4 h-4 text-gray-500" />}
          <h3 className="text-lg font-bold text-white truncate max-w-[200px] md:max-w-xs">
            {item.filename || "Unknown Audio"}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
            status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 
            status === 'failed' ? 'bg-red-500/10 text-red-500' : 
            status === 'processing' ? 'bg-[#1877F2]/10 text-[#1877F2]' : 'bg-gray-800 text-gray-400'
          }`}>
            {progressText}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center">
            <span className="font-mono text-xs text-gray-400 bg-[#1a1a1a] px-2 py-1 rounded border border-[#27272a]">
              ID: {item.taskId.substring(0, 8)}...
            </span>
            <button onClick={handleCopy} className="ml-2 hover:text-[#1877F2] transition-colors" title="Copy ID">
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          {item.createdAt && (
            <span className="hidden sm:inline">• {new Date(item.createdAt.toMillis()).toLocaleString()}</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {status === 'completed' && (
          <>
            <a 
              href={`${baseUrl}/api/custom_download/${item.taskId}?stems=vocals,instrumental&format=mp3&chunked=false&folder_name=Stems`}
              target="_blank" rel="noreferrer"
              className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              title="Quick Download (Vocals + Inst MP3)"
            >
              <Download className="w-4 h-4" />
            </a>
            <Link 
              href={`/?taskId=${item.taskId}`}
              className="px-4 py-2 rounded-lg font-bold bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 border border-[#1877F2]/30 flex items-center gap-2 transition-colors"
            >
              Open Workspace <ExternalLink className="w-4 h-4" />
            </Link>
          </>
        )}
        
        {status === 'processing' && (
          <Link 
            href={`/?taskId=${item.taskId}`}
            className="px-4 py-2 rounded-lg font-bold bg-[#1a1a1a] text-gray-300 hover:bg-[#27272a] border border-[#27272a] flex items-center gap-2 transition-colors"
          >
            Live Progress <ExternalLink className="w-4 h-4" />
          </Link>
        )}

        <button 
          onClick={handleDelete}
          className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-colors ml-2"
          title="Delete Record"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters and Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  const fetchHistory = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, "extractions"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
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
    try {
      await deleteDoc(doc(db, "extractions", id));
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch(err) {
      console.error("Failed to delete", err);
    }
  };

  // Filter and sort logic
  const filteredAndSortedHistory = useMemo(() => {
    return history
      .filter(item => {
        if (searchQuery) {
          const queryLower = searchQuery.toLowerCase();
          const filename = (item.filename || "").toLowerCase();
          const taskId = (item.taskId || "").toLowerCase();
          if (!filename.includes(queryLower) && !taskId.includes(queryLower)) {
            return false;
          }
        }
        // Since status is determined dynamically by the child component, we can't easily filter by "processing" vs "completed" here perfectly without hitting the DB.
        // We will skip strict status filtering for now since the backend doesn't sync status back to Firebase yet.
        return true; 
      })
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [history, searchQuery, sortOrder]);

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
    <div className="max-w-5xl mx-auto px-4 py-12 pt-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Extraction Library</h1>
          <p className="text-gray-400">Manage, search, and download your processed audio files.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[#111] border border-[#27272a] rounded-2xl p-4 mb-6 shadow-xl flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search by filename or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#27272a] rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-[#1877F2] transition-colors"
          />
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="appearance-none bg-[#1a1a1a] border border-[#27272a] rounded-xl pl-10 pr-8 py-3 text-white focus:outline-none focus:border-[#1877F2] transition-colors cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <ArrowUpDown className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* List Container */}
      <div className="bg-[#111] border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl min-h-[400px]">
        {filteredAndSortedHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
            <SearchX className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No extractions found</h3>
            <p className="text-gray-400 max-w-md">
              {searchQuery ? "Try adjusting your search criteria." : "You haven't extracted any files yet."}
            </p>
            {!searchQuery && (
              <Link href="/" className="mt-6 bg-[#1877F2] text-white px-6 py-3 rounded-full font-bold hover:bg-[#166FE5] transition-colors">
                Extract a New File
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredAndSortedHistory.map((item) => (
              <TaskStatusRow key={item.id} item={item} onDelete={handleDeleteTask} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
