import Link from 'next/link';
import { Mail, Globe, Hash, Users } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#050505] border-t border-white/5 pt-16 pb-8 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-[#1877F2] rounded-lg flex items-center justify-center">
                <span className="font-bold text-white text-xl">S</span>
              </div>
              <span className="font-bold text-white text-xl tracking-tight">Stemify AI</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              The world&apos;s most advanced AI stem separation tool. Extract vocals, drums, and instruments with studio-grade precision for free.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors"><Globe className="w-5 h-5" /></a>
              <a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors"><Hash className="w-5 h-5" /></a>
              <a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors"><Users className="w-5 h-5" /></a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm tracking-wider uppercase">Products</h3>
            <ul className="space-y-3">
              <li><Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">Vocal Remover</Link></li>
              <li><Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">Stem Splitter</Link></li>
              <li><Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">Noise Canceller</Link></li>
              <li><Link href="/pricing" className="text-gray-400 hover:text-white text-sm transition-colors">API Access</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm tracking-wider uppercase">Company</h3>
            <ul className="space-y-3">
              <li><Link href="/faq" className="text-gray-400 hover:text-white text-sm transition-colors">About Us</Link></li>
              <li><Link href="/pricing" className="text-gray-400 hover:text-white text-sm transition-colors">Pricing</Link></li>
              <li><Link href="/faq" className="text-gray-400 hover:text-white text-sm transition-colors">Careers</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white text-sm transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm tracking-wider uppercase">Support</h3>
            <ul className="space-y-3">
              <li><Link href="/faq" className="text-gray-400 hover:text-white text-sm transition-colors">Help Center</Link></li>
              <li><Link href="/faq" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</Link></li>
              <li><Link href="/faq" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</Link></li>
              <li><a href="mailto:support@vocalextractor.ai" className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-2"><Mail className="w-4 h-4" /> support@example.com</a></li>
            </ul>
          </div>
          
        </div>
        
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Stemify AI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <span className="text-gray-500 text-sm">Status: All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
