import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSeoSlugs, parseSlugToData } from "@/data/seoMatrix";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Upload, Zap, ShieldCheck, Settings2, ArrowRight } from "lucide-react";

interface Props {
  params: {
    slug: string;
  };
}

// Generate dynamic metadata for Google
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Check if it's a valid slug (optional: we can skip checking to allow any keyword combination, but checking ensures 404s for invalid ones)
  const { title } = parseSlugToData(params.slug);

  return {
    title: `${title} | VocalBee Free AI Tool`,
    description: `Use VocalBee's advanced AI to ${title.toLowerCase()} instantly. High-quality, fast, and completely free. Start extracting now.`,
    keywords: [title.toLowerCase(), params.slug.replace(/-/g, ' '), "vocal remover", "ai stem separation"],
  };
}

export default function SeoLandingPage({ params }: Props) {
  const { title, originalSlug } = parseSlugToData(params.slug);

  return (
    <div className="min-h-screen bg-[#09090b] selection:bg-[#1877F2]/30 text-gray-200 font-sans flex flex-col overflow-x-hidden">
      <Navbar />

      <main className="flex-grow pt-32 pb-24">
        {/* Hero Section */}
        <section className="relative pb-20 md:pt-10 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#1877F2]/10 rounded-full blur-[120px] opacity-50 pointer-events-none" />
          
          <div className="container mx-auto px-6 relative z-10 max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#18181b] border border-[#27272a] mb-8">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-gray-300">VocalBee AI Engine is Online</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
              The Best AI Tool to <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1877F2] to-[#0A53BE]">{title}</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Don't waste time with complicated software. Upload your file and let our next-generation neural networks {title.toLowerCase()} in seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/sign-in" 
                className="w-full sm:w-auto px-10 py-5 text-xl font-bold text-white bg-[#1877F2] rounded-full hover:bg-[#166fe5] transition-all hover:shadow-[0_0_30px_rgba(24,119,242,0.4)] flex items-center justify-center gap-3 group"
              >
                Upload File Now
                <Upload className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
              </Link>
            </div>
            <p className="mt-6 text-sm text-gray-500">
              No credit card required. Free tier available forever.
            </p>
          </div>
        </section>

        {/* Dynamic SEO Content Section */}
        <section className="py-24 bg-[#09090b] relative z-10 border-t border-[#27272a]">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-8">Why use VocalBee to {title.toLowerCase()}?</h2>
            
            <div className="prose prose-invert prose-lg max-w-none text-gray-400">
              <p>
                When you are looking to <strong>{title.toLowerCase()}</strong>, quality is everything. Old software relied on phase cancellation or basic EQ filters, which left behind underwater-sounding artifacts and destroyed the audio quality.
              </p>
              <p>
                VocalBee utilizes a state-of-the-art deep learning model trained on millions of hours of studio-grade stems. Our AI understands exactly what human voices, drums, and specific instruments sound like. This means when you need to {title.toLowerCase()}, the neural network perfectly isolates the frequencies without harming the rest of the mix.
              </p>
              
              <h3 className="text-2xl font-bold text-white mt-12 mb-6">How it works in 3 easy steps:</h3>
              <ol className="space-y-4">
                <li><strong>Upload Your File:</strong> We support MP3, WAV, FLAC, and even MP4 video files.</li>
                <li><strong>Select Extraction:</strong> Choose your desired stem separation model (2-stem or 4-stem).</li>
                <li><strong>Download Stems:</strong> Our cloud GPUs will process your track in under 30 seconds. Download the pristine audio instantly.</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-8 hover:border-[#1877F2]/50 transition-colors">
                <Zap className="w-10 h-10 text-[#1877F2] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Lightning Fast</h3>
                <p className="text-gray-400 text-sm">Process standard 3-minute tracks in less than 30 seconds.</p>
              </div>
              <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-8 hover:border-[#1877F2]/50 transition-colors">
                <Settings2 className="w-10 h-10 text-[#1877F2] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Lossless Quality</h3>
                <p className="text-gray-400 text-sm">Download your stems in uncompressed WAV format for zero quality loss.</p>
              </div>
              <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-8 hover:border-[#1877F2]/50 transition-colors">
                <ShieldCheck className="w-10 h-10 text-[#1877F2] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">100% Private</h3>
                <p className="text-gray-400 text-sm">Your files are encrypted and automatically deleted after processing.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
