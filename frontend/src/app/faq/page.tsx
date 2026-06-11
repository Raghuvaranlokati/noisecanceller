import { HelpCircle, Mail, MessageSquare } from 'lucide-react';

export default function FAQPage() {
  const faqs = [
    {
      q: "How does the AI stem separation work?",
      a: "Our system uses advanced deep learning models (like Demucs) to analyze the audio waveform and isolate specific frequencies and patterns associated with vocals, drums, bass, and other instruments."
    },
    {
      q: "Is it completely free?",
      a: "Yes! We offer a generous free tier that allows you to extract basic stems from your files at zero cost. For professional features like lossless WAV export, 4-stem separation, and priority queues, we offer a Pro plan."
    },
    {
      q: "What file formats are supported?",
      a: "We currently support MP3, WAV, FLAC, M4A, OGG, and most standard video formats (MP4, MKV, AVI). The AI will extract the audio automatically from video files."
    },
    {
      q: "Are my files secure?",
      a: "Absolutely. Your files are processed on secure cloud GPUs and are automatically deleted from our servers shortly after processing is complete. We do not store or claim ownership of your music."
    },
    {
      q: "Can I use the extracted stems commercially?",
      a: "The copyright of the extracted stems remains with the original copyright holder. You must obtain permission from the copyright owner before using the stems for commercial purposes."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Frequently Asked Questions</h1>
        <p className="text-xl text-gray-400">Everything you need to know about the product and billing.</p>
      </div>

      <div className="space-y-8">
        {faqs.map((faq, idx) => (
          <div key={idx} className="bg-[#111] border border-[#27272a] rounded-2xl p-6 hover:border-[#1877F2]/30 transition-colors">
            <h3 className="text-xl font-bold mb-3 flex items-start gap-3">
              <HelpCircle className="text-[#1877F2] mt-1 flex-shrink-0" />
              {faq.q}
            </h3>
            <p className="text-gray-400 leading-relaxed ml-9">{faq.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-20 bg-gradient-to-br from-[#111] to-[#1a1a1a] border border-[#27272a] rounded-3xl p-10 text-center">
        <MessageSquare className="w-12 h-12 text-[#1877F2] mx-auto mb-6" />
        <h3 className="text-2xl font-bold mb-4">Still have questions?</h3>
        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">Can't find the answer you're looking for? Please chat to our friendly team.</p>
        <a href="/contact" className="inline-flex items-center gap-2 bg-[#1877F2] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#166FE5] transition-colors">
          <Mail className="w-5 h-5" /> Get in touch
        </a>
      </div>
    </div>
  );
}
