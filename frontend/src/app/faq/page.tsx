import { Metadata } from "next";
import { faqs } from "@/data/faqs";
import FAQAccordion from "@/components/FAQAccordion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | VocalBee",
  description: "Find answers to all your questions about VocalBee's AI audio separation, vocal extraction, pricing, and API.",
};

export default function FAQPage() {
  // Group FAQs by category
  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  return (
    <div className="min-h-screen bg-[#09090b] selection:bg-[#1877F2]/30 text-gray-200 font-sans flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
              Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1877F2] to-[#0A53BE]">Questions</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to know about how VocalBee extracts pristine stems from your audio.
            </p>
          </div>

          <div className="space-y-16">
            {categories.map((category) => (
              <div key={category} className="scroll-mt-32" id={category.toLowerCase()}>
                <h2 className="text-3xl font-bold text-white mb-8 border-b border-[#27272a] pb-4">
                  {category}
                </h2>
                <FAQAccordion faqs={faqs.filter(faq => faq.category === category)} />
              </div>
            ))}
          </div>

          <div className="mt-20 p-10 bg-[#18181b] border border-[#27272a] rounded-2xl text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Still have questions?</h3>
            <p className="text-gray-400 mb-8">Can't find the answer you're looking for? Reach out to our support team.</p>
            <a 
              href="mailto:support@vocalbee.vercel.app" 
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-[#1877F2] rounded-full hover:bg-[#166fe5] transition-all hover:shadow-[0_0_20px_rgba(24,119,242,0.4)]"
            >
              Contact Support
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
