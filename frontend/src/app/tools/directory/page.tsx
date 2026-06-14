"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSeoSlugs, parseSlugToData } from "@/data/seoMatrix";

function DirectoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const pageStr = searchParams.get("page");
  const currentPage = pageStr ? parseInt(pageStr, 10) : 1;
  const itemsPerPage = 500;
  
  // getSeoSlugs is technically a static array of 40,000 strings
  const allSlugs = getSeoSlugs();
  const totalPages = Math.ceil(allSlugs.length / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSlugs = allSlugs.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200 font-sans flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-5xl">
          <h1 className="text-4xl font-bold text-white mb-6">AI Audio Tools Directory</h1>
          <p className="text-gray-400 mb-12">
            Browse our complete directory of specific audio separation tools. Page {currentPage} of {totalPages}.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentSlugs.map((slug) => {
              const { title } = parseSlugToData(slug);
              return (
                <Link 
                  key={slug} 
                  href={`/tools/${slug}`}
                  className="text-sm text-gray-400 hover:text-[#1877F2] transition-colors truncate"
                  title={title}
                >
                  {title}
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="mt-16 flex items-center justify-center gap-4">
            <button
              onClick={() => router.push(`/tools/directory?page=${currentPage - 1}`)}
              disabled={currentPage === 1}
              className="px-6 py-2 bg-[#18181b] border border-[#27272a] rounded-full disabled:opacity-50 hover:bg-[#27272a] transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => router.push(`/tools/directory?page=${currentPage + 1}`)}
              disabled={currentPage === totalPages}
              className="px-6 py-2 bg-[#18181b] border border-[#27272a] rounded-full disabled:opacity-50 hover:bg-[#27272a] transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function DirectoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">Loading Directory...</div>}>
      <DirectoryContent />
    </Suspense>
  );
}
