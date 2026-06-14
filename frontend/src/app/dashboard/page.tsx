"use client";
import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Activity, BarChart3, Database, HardDrive, ShieldCheck, Zap, AudioLines, FileMusic, AlignLeft, Users, Settings2, Clock, UploadCloud, ChevronRight } from "lucide-react";

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [stats, setStats] = useState({
    totalProcessed: 0,
    totalMinutes: 0,
    storageUsed: 0,
    premiumStatus: false
  });

  // Mock fetching statistics
  useEffect(() => {
    if (isSignedIn) {
      // Stub data to simulate a loaded dashboard
      setTimeout(() => {
        setStats({
          totalProcessed: 14,
          totalMinutes: 87,
          storageUsed: 1.2, // GB
          premiumStatus: true
        });
      }, 800);
    }
  }, [isSignedIn]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-[#27272a] rounded-full mb-4"></div>
          <div className="w-48 h-6 bg-[#27272a] rounded mb-2"></div>
          <div className="w-32 h-4 bg-[#27272a] rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pt-24 min-h-screen">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Creator Workspace</h1>
          <p className="text-gray-400">Welcome back, {user?.firstName || "Creator"}. Here's your processing overview.</p>
        </div>
        <Link 
          href="/" 
          className="bg-[#1877F2] text-white px-6 py-3 rounded-full font-bold hover:bg-[#166FE5] transition-all shadow-[0_0_15px_rgba(24,119,242,0.3)] flex items-center gap-2 hover:-translate-y-1"
        >
          <UploadCloud className="w-5 h-5" /> New Extraction
        </Link>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-[#111] border border-[#27272a] rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#1877F2]/5 rounded-bl-[100px] -z-10 group-hover:bg-[#1877F2]/10 transition-colors"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#1877F2]/10 rounded-2xl flex items-center justify-center text-[#1877F2]">
              <AudioLines className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">Files Processed</p>
              <h3 className="text-2xl font-bold text-white">{stats.totalProcessed}</h3>
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-[#27272a] rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-[100px] -z-10 group-hover:bg-purple-500/10 transition-colors"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">Audio Minutes</p>
              <h3 className="text-2xl font-bold text-white">{stats.totalMinutes}m</h3>
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-[#27272a] rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-[100px] -z-10 group-hover:bg-emerald-500/10 transition-colors"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">Cloud Storage</p>
              <h3 className="text-2xl font-bold text-white">{stats.storageUsed} GB</h3>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1877F2] to-[#0A4A9E] border border-transparent rounded-3xl p-6 shadow-[0_10px_30px_-10px_rgba(24,119,242,0.5)] relative overflow-hidden group flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-white">Premium Plan</h3>
            <Zap className="w-6 h-6 text-yellow-300" />
          </div>
          <p className="text-blue-100 text-sm mb-4">Unlimited fast processing enabled.</p>
          <Link href="/pricing" className="text-white text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
            Manage Subscription <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-[#111] border border-[#27272a] rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#1877F2]" /> Recent Extractions
            </h2>
            <Link href="/history" className="text-sm text-gray-400 hover:text-white transition-colors">View All History</Link>
          </div>
          
          <div className="space-y-4">
            {/* Skeleton Loading State */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#27272a] rounded-2xl hover:border-gray-600 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#27272a] rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-[#1877F2]/20 group-hover:text-[#1877F2] transition-colors">
                    <FileMusic className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">project_stem_extract_{i}.wav</h4>
                    <p className="text-xs text-gray-500">Completed 2 hours ago • Vocals, Drums, Bass</p>
                  </div>
                </div>
                <div className="text-emerald-500 text-sm font-medium bg-emerald-500/10 px-3 py-1 rounded-full">
                  Ready
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics & Quota */}
        <div className="bg-[#111] border border-[#27272a] rounded-3xl p-6 shadow-xl flex flex-col">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-purple-500" /> Usage Analytics
          </h2>
          
          <div className="flex-1 flex flex-col justify-center gap-8">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Daily Processing Quota</span>
                <span className="text-white font-bold">14 / 50</span>
              </div>
              <div className="h-2 bg-[#27272a] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-[#1877F2] w-[28%] rounded-full"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Cloud Storage Limit</span>
                <span className="text-white font-bold">1.2 GB / 50 GB</span>
              </div>
              <div className="h-2 bg-[#27272a] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 w-[5%] rounded-full"></div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-2xl p-4 border border-[#27272a] text-center mt-auto">
              <p className="text-sm text-gray-400 mb-2">Need more processing power?</p>
              <button className="text-white text-sm font-bold w-full bg-[#27272a] hover:bg-gray-700 py-2 rounded-xl transition-colors">
                Buy More Credits
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
