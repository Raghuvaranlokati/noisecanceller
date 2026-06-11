"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from "firebase/firestore";
import Link from "next/link";
import { History, Trash2, ExternalLink, ShieldCheck, SearchX } from "lucide-react";

export default function HistoryPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLoading(false);
      return;
    }

    if (user?.primaryEmailAddress?.emailAddress) {
      fetchHistory(user.primaryEmailAddress.emailAddress);
    }
  }, [user, isLoaded, isSignedIn]);

  const fetchHistory = async (email: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "extractions"),
        where("email", "==", email),
        // Note: orderBy requires an index in Firestore if combined with where. 
        // For simplicity, we'll sort client-side to avoid forcing the user to create a composite index immediately.
      );
      
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Sort client-side
      docs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      // Verification Step: Check if files still exist on the backend
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const validDocs = [];

      for (const item of docs) {
        try {
          const res = await fetch(`${baseUrl}/api/status/${item.taskId}`);
          if (res.status === 404) {
            // Task has been deleted from temp storage! Delete from Firebase.
            console.log(`Task ${item.taskId} no longer exists. Removing from history.`);
            await deleteDoc(doc(db, "extractions", item.id));
          } else {
            validDocs.push(item);
          }
        } catch (e) {
          // If network error, keep it for now
          validDocs.push(item);
        }
      }

      setHistory(validDocs);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
    setLoading(false);
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

      <div className="bg-[#111] border border-[#27272a] rounded-2xl overflow-hidden">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <SearchX className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No active history found</h3>
            <p className="text-gray-400 max-w-md">
              You haven't extracted any files recently, or your previous extractions were automatically cleaned up from the temporary server storage.
            </p>
            <Link href="/" className="mt-6 bg-[#1877F2] text-white px-6 py-3 rounded-full font-bold hover:bg-[#166FE5] transition-colors">
              Extract a New File
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#27272a]">
            {history.map((item) => (
              <div key={item.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                <div>
                  <h3 className="text-lg font-bold text-white truncate max-w-sm mb-1">
                    {item.filename || "Unknown Audio"}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="bg-[#1a1a1a] px-2 py-1 rounded text-xs font-mono">
                      ID: {item.taskId.split("-")[0]}...
                    </span>
                    {item.createdAt && (
                      <span>{new Date(item.createdAt.toMillis()).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Link 
                    href={`/?taskId=${item.taskId}`}
                    className="flex items-center gap-2 bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 px-4 py-2 rounded-lg font-bold transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> Open Result
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
