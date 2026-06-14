"use client";
import { useState, useEffect } from 'react';
import { Users, FileAudio, Activity, ShieldCheck, Crown, Clock } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
      return;
    }
    
    // Fetch stats
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    fetch(`${baseUrl}/api/admin/analytics`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load admin stats", err);
        setLoading(false);
      });
  }, [isLoaded, isSignedIn, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1877F2]"></div>
      </div>
    );
  }

  if (!stats) return <div className="p-20 text-center">Failed to load analytics</div>;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-[#1877F2]" /> Platform Admin
          </h1>
          <div className="bg-[#1877F2]/20 text-[#1877F2] px-4 py-1.5 rounded-full text-sm font-bold border border-[#1877F2]/30">
            Live Analytics
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#111] border border-[#27272a] rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-blue-500/20 p-3 rounded-xl"><FileAudio className="w-6 h-6 text-blue-500" /></div>
              <h3 className="text-gray-400 font-medium">Total Extractions</h3>
            </div>
            <div className="text-4xl font-black text-white">{stats.total_tasks}</div>
          </div>
          
          <div className="bg-[#111] border border-[#27272a] rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-emerald-500/20 p-3 rounded-xl"><Activity className="w-6 h-6 text-emerald-500" /></div>
              <h3 className="text-gray-400 font-medium">Completed</h3>
            </div>
            <div className="text-4xl font-black text-white">{stats.status_counts?.completed || 0}</div>
          </div>

          <div className="bg-[#111] border border-[#27272a] rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-purple-500/20 p-3 rounded-xl"><Users className="w-6 h-6 text-purple-500" /></div>
              <h3 className="text-gray-400 font-medium">Total Users</h3>
            </div>
            <div className="text-4xl font-black text-white">{stats.total_users}</div>
          </div>

          <div className="bg-[#111] border border-[#27272a] rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl" />
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="bg-yellow-500/20 p-3 rounded-xl"><Crown className="w-6 h-6 text-yellow-500" /></div>
              <h3 className="text-gray-400 font-medium">Pro Subscribers</h3>
            </div>
            <div className="text-4xl font-black text-white relative z-10">{stats.premium_users}</div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-[#111] border border-[#27272a] rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Task Status Breakdown</h2>
            <div className="space-y-4">
              {Object.entries(stats.status_counts || {}).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                  <span className="text-gray-300 capitalize flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      status === 'completed' ? 'bg-emerald-500' :
                      status === 'processing' ? 'bg-blue-500' :
                      status === 'failed' ? 'bg-rose-500' : 'bg-gray-500'
                    }`} />
                    {status}
                  </span>
                  <span className="font-bold text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-[#111] border border-[#27272a] rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#27272a] text-gray-400 text-sm">
                    <th className="pb-3 font-medium">Task ID</th>
                    <th className="pb-3 font-medium">User Email</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]">
                  {stats.recent_tasks?.map((task: any) => (
                    <tr key={task.task_id} className="text-sm">
                      <td className="py-4 font-mono text-gray-400 truncate max-w-[150px]">{task.task_id}</td>
                      <td className="py-4 text-gray-300">{task.user_email || "Anonymous"}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' :
                          task.status === 'processing' ? 'bg-blue-500/20 text-blue-500' :
                          task.status === 'failed' ? 'bg-rose-500/20 text-rose-500' : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {task.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 text-gray-500 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(task.created_at * 1000).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {stats.recent_tasks?.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">No recent tasks found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
