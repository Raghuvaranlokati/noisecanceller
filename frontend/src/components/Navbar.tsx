"use client";
import Link from 'next/link';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [searchId, setSearchId] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      router.push(`/?taskId=${searchId.trim()}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 text-[#E4E6EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <img src="/logo.svg" alt="VocalBee Logo" className="w-10 h-10 group-hover:scale-105 transition-transform" />
              <span className="font-bold text-2xl tracking-tight text-[#E4E6EB]">VocalBee</span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-sm font-medium hover:text-white transition-colors">Home</Link>

          </div>
          
          {/* Search Box */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="w-full relative">
              <input 
                type="text" 
                placeholder="Enter Task ID from Email..." 
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-full bg-[#18191A] border border-white/10 rounded-full py-2 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-[#1877F2]"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1877F2]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </button>
            </form>
          </div>
          
          {/* CTA Buttons & User Profile */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoaded && !isSignedIn && (
              <>
                <SignInButton mode="modal">
                  <button className="text-sm font-medium text-[#B0B3B8] hover:text-[#E4E6EB] transition-colors">Log in</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-[#1877F2] hover:bg-[#166FE5] text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-[0_0_15px_rgba(24,119,242,0.3)]">
                    Get Started
                  </button>
                </SignUpButton>
              </>
            )}
            {isLoaded && isSignedIn && (
              <>

                <Link href="/history" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors mr-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  History
                </Link>
                <UserButton 
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-10 h-10",
                    }
                  }}
                />
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 hover:text-white focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#111] border-b border-white/10 absolute w-full">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link href="/" onClick={() => setIsOpen(false)} className="text-[#E4E6EB] hover:text-white block px-3 py-2 rounded-md text-base font-medium">Home</Link>

            
            <div className="px-3 py-3">
              <form onSubmit={handleSearch} className="w-full relative">
                <input 
                  type="text" 
                  placeholder="Task ID..." 
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="w-full bg-[#18191A] border border-white/10 rounded-full py-2 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-[#1877F2]"
                />
                <button type="submit" onClick={() => setIsOpen(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1877F2]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </button>
              </form>
            </div>
            <div className="pt-4 border-t border-white/10 flex flex-col gap-3 px-3">
              {isLoaded && !isSignedIn && (
                <>
                  <SignInButton mode="modal">
                    <button className="w-full text-left text-base font-medium text-[#B0B3B8] py-2">Log in</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="w-full text-center bg-[#1877F2] text-white px-4 py-2 rounded-full font-bold">Get Started</button>
                  </SignUpButton>
                </>
              )}
              {isLoaded && isSignedIn && (
                <>
                  <div className="flex items-center gap-3 py-2">
                    <UserButton />
                    <span className="text-gray-300 font-medium">My Account</span>
                  </div>

                  <Link href="/history" onClick={() => setIsOpen(false)} className="w-full text-left text-base font-medium text-[#E4E6EB] py-2">History</Link>
                  <Link href="/" onClick={() => setIsOpen(false)} className="w-full text-center bg-[#1877F2] text-white px-4 py-2 rounded-full font-bold inline-block mt-2">Extract Now</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
