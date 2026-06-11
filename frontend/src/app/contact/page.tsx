import { Mail, MapPin, Phone } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Contact Us</h1>
        <p className="text-xl text-gray-400">We&apos;d love to hear from you. Please fill out this form.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
        {/* Contact Info */}
        <div className="space-y-8">
          <div className="bg-[#111] border border-[#27272a] rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6">Get in touch</h3>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-[#1877F2]/10 p-3 rounded-lg">
                  <Mail className="text-[#1877F2] w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Chat to sales</h4>
                  <p className="text-gray-400 text-sm mb-1">Speak to our friendly team.</p>
                  <a href="mailto:sales@stemify.ai" className="text-[#1877F2] font-medium">sales@stemify.ai</a>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-[#1877F2]/10 p-3 rounded-lg">
                  <MessageSquare className="text-[#1877F2] w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Support</h4>
                  <p className="text-gray-400 text-sm mb-1">We&apos;re here to help.</p>
                  <a href="mailto:support@stemify.ai" className="text-[#1877F2] font-medium">support@stemify.ai</a>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-[#1877F2]/10 p-3 rounded-lg">
                  <MapPin className="text-[#1877F2] w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Office</h4>
                  <p className="text-gray-400 text-sm mb-1">Come say hello at our office HQ.</p>
                  <span className="text-[#1877F2] font-medium">100 AI Avenue, San Francisco CA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-[#111] border border-[#27272a] rounded-2xl p-8">
          <form className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">First name</label>
                <input type="text" className="w-full bg-black border border-[#27272a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#1877F2] transition-colors" placeholder="First name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Last name</label>
                <input type="text" className="w-full bg-black border border-[#27272a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#1877F2] transition-colors" placeholder="Last name" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input type="email" className="w-full bg-black border border-[#27272a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#1877F2] transition-colors" placeholder="you@company.com" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
              <textarea rows={4} className="w-full bg-black border border-[#27272a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#1877F2] transition-colors" placeholder="Leave us a message..."></textarea>
            </div>
            
            <button type="button" className="w-full bg-[#1877F2] text-white font-bold py-4 rounded-xl hover:bg-[#166FE5] transition-colors shadow-[0_0_15px_rgba(24,119,242,0.3)]">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Just adding the missing icon import
import { MessageSquare } from 'lucide-react';
