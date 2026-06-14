import { Metadata } from "next";
import Link from "next/link";
import { blogs } from "@/data/blogs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowRight, Calendar, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog | VocalBee",
  description: "Read the latest tutorials, industry guides, and news about AI audio separation and vocal extraction.",
};

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-[#09090b] selection:bg-[#1877F2]/30 text-gray-200 font-sans flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center mb-20">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
              VocalBee <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1877F2] to-[#0A53BE]">Blog</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Tips, tutorials, and insights on the future of AI audio separation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <Link href={`/blog/${blog.slug}`} key={blog.slug} className="group flex flex-col bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden hover:border-[#1877F2]/50 hover:shadow-[0_0_30px_rgba(24,119,242,0.15)] transition-all duration-300">
                <div className="p-8 flex flex-col flex-grow">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="px-3 py-1 text-xs font-semibold text-[#1877F2] bg-[#1877F2]/10 rounded-full">
                      {blog.category}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-4 group-hover:text-[#1877F2] transition-colors line-clamp-2">
                    {blog.title}
                  </h2>
                  <p className="text-gray-400 mb-8 line-clamp-3 flex-grow">
                    {blog.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-6 border-t border-[#27272a] mt-auto">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {blog.date}</span>
                    </div>
                    <span className="flex items-center gap-1.5 font-medium text-[#1877F2] opacity-0 group-hover:opacity-100 transition-opacity">
                      Read <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
