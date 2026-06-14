import { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogs } from "@/data/blogs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";

interface Props {
  params: {
    slug: string;
  };
}

// Generate static params for SEO
export function generateStaticParams() {
  return blogs.map((blog) => ({
    slug: blog.slug,
  }));
}

// Generate dynamic metadata for SEO
export function generateMetadata({ params }: Props): Metadata {
  const blog = blogs.find((b) => b.slug === params.slug);
  
  if (!blog) {
    return {
      title: "Blog Not Found | VocalBee",
    };
  }

  return {
    title: `${blog.title} | VocalBee Blog`,
    description: blog.excerpt,
    openGraph: {
      title: blog.title,
      description: blog.excerpt,
      type: "article",
      authors: [blog.author],
    }
  };
}

export default function BlogPost({ params }: Props) {
  const blog = blogs.find((b) => b.slug === params.slug);

  if (!blog) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#09090b] selection:bg-[#1877F2]/30 text-gray-200 font-sans flex flex-col">
      <Navbar />
      
      {/* Article JSON-LD Schema for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": blog.title,
            "description": blog.excerpt,
            "author": {
              "@type": "Person",
              "name": blog.author
            },
            "datePublished": new Date(blog.date).toISOString(),
          })
        }}
      />
      
      <main className="flex-grow pt-32 pb-24">
        <article className="container mx-auto px-6 max-w-3xl">
          <Link href="/blog" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-10">
            <ArrowLeft className="w-4 h-4" /> Back to all articles
          </Link>
          
          <div className="mb-12 border-b border-[#27272a] pb-10">
            <span className="px-3 py-1 text-sm font-semibold text-[#1877F2] bg-[#1877F2]/10 rounded-full mb-6 inline-block">
              {blog.category}
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-8 tracking-tight leading-tight">
              {blog.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-gray-400 text-sm">
              <span className="flex items-center gap-2"><User className="w-4 h-4" /> {blog.author}</span>
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {blog.date}</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {blog.readTime}</span>
            </div>
          </div>

          <div className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-a:text-[#1877F2] hover:prose-a:text-[#166fe5] prose-strong:text-white prose-li:marker:text-[#1877F2]">
            <ReactMarkdown>{blog.content}</ReactMarkdown>
          </div>
          
          <div className="mt-20 p-8 bg-[#18181b] border border-[#27272a] rounded-2xl text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to extract pristine vocals?</h3>
            <p className="text-gray-400 mb-8">Join thousands of producers and creators using VocalBee's advanced AI.</p>
            <Link 
              href="/" 
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-[#1877F2] rounded-full hover:bg-[#166fe5] transition-all hover:shadow-[0_0_20px_rgba(24,119,242,0.4)]"
            >
              Start Extracting Free
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
