import { Check } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Simple, Transparent Pricing</h1>
        <p className="text-xl text-gray-400">Start for free, upgrade when you need more power.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Free Tier */}
        <div className="bg-[#111] border border-[#27272a] rounded-3xl p-8 hover:border-[#1877F2]/50 transition-colors">
          <h3 className="text-2xl font-bold mb-2">Free</h3>
          <p className="text-gray-400 mb-6">Perfect for trying out the AI.</p>
          <div className="text-4xl font-bold mb-8">$0<span className="text-lg text-gray-500 font-normal">/mo</span></div>
          <ul className="space-y-4 mb-8">
            <li className="flex gap-3 text-gray-300"><Check className="text-[#1877F2]" /> 10 minutes per month</li>
            <li className="flex gap-3 text-gray-300"><Check className="text-[#1877F2]" /> MP3/WAV export</li>
            <li className="flex gap-3 text-gray-300"><Check className="text-[#1877F2]" /> 2-Stem Separation (Vocals, Instrumental)</li>
            <li className="flex gap-3 text-gray-500"><Check className="text-gray-700" /> Slow Processing Queue</li>
          </ul>
          <button className="w-full py-3 rounded-xl font-bold bg-[#27272a] text-white hover:bg-gray-700 transition-colors">Current Plan</button>
        </div>

        {/* Pro Tier */}
        <div className="bg-[#111] border-2 border-[#1877F2] rounded-3xl p-8 relative transform md:-translate-y-4 shadow-[0_0_40px_rgba(24,119,242,0.15)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1877F2] text-white px-4 py-1 rounded-full text-sm font-bold">MOST POPULAR</div>
          <h3 className="text-2xl font-bold mb-2">Pro</h3>
          <p className="text-gray-400 mb-6">For musicians and creators.</p>
          <div className="text-4xl font-bold mb-8">$15<span className="text-lg text-gray-500 font-normal">/mo</span></div>
          <ul className="space-y-4 mb-8">
            <li className="flex gap-3 text-gray-300"><Check className="text-[#1877F2]" /> 300 minutes per month</li>
            <li className="flex gap-3 text-gray-300"><Check className="text-[#1877F2]" /> Lossless WAV/FLAC export</li>
            <li className="flex gap-3 text-gray-300"><Check className="text-[#1877F2]" /> 4-Stem Separation (Vocals, Drums, Bass, Other)</li>
            <li className="flex gap-3 text-gray-300"><Check className="text-[#1877F2]" /> Studio Denoise feature</li>
            <li className="flex gap-3 text-gray-300"><Check className="text-[#1877F2]" /> Priority Fast Processing</li>
          </ul>
          <button className="w-full py-3 rounded-xl font-bold bg-[#1877F2] text-white hover:bg-[#166FE5] transition-colors shadow-[0_0_15px_rgba(24,119,242,0.4)]">Upgrade to Pro</button>
        </div>

        {/* Studio Tier */}
        <div className="bg-[#111] border border-[#27272a] rounded-3xl p-8 hover:border-[#1877F2]/50 transition-colors">
          <h3 className="text-2xl font-bold mb-2">Studio</h3>
          <p className="text-gray-400 mb-6">For professional studios and DJs.</p>
          <div className="text-4xl font-bold mb-8">$39<span className="text-lg text-gray-500 font-normal">/mo</span></div>
          <ul className="space-y-4 mb-8">
            <li className="flex gap-3 text-gray-300"><Check className="text-[#1877F2]" /> 1000 minutes per month</li>
            <li className="flex gap-3 text-gray-300"><Check className="text-[#1877F2]" /> Batch Processing</li>
            <li className="flex gap-3 text-gray-300"><Check className="text-[#1877F2]" /> API Access</li>
            <li className="flex gap-3 text-gray-300"><Check className="text-[#1877F2]" /> Commercial Use License</li>
          </ul>
          <button className="w-full py-3 rounded-xl font-bold bg-[#27272a] text-white hover:bg-gray-700 transition-colors">Contact Sales</button>
        </div>
      </div>
    </div>
  );
}
