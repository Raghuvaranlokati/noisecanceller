import Link from 'next/link';
import { Mail, Globe, Hash, Users } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#050505] border-t border-white/5 pt-16 pb-8 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-[#1877F2] rounded-lg flex items-center justify-center">
                <span className="font-bold text-white text-lg">V</span>
              </div>
              <span className="font-bold text-white text-xl tracking-tight">VocalHive</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Next-generation AI audio separation. Extract pristine vocals and stems from any track instantly.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6">Product</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors text-sm">Features</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors text-sm">Pricing</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors text-sm">API</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors text-sm">Integrations</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6">Resources</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors text-sm">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors text-sm">Tutorials</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors text-sm">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors text-sm">Community</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6">Company</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors text-sm">About Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors text-sm">Careers</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors text-sm">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#1877F2] transition-colors text-sm">Terms of Service</a></li>
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
