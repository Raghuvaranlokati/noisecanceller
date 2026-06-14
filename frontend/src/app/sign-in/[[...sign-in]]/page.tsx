import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#050505]">
      {/* Back button */}
      <Link href="/" className="absolute top-6 left-6 text-gray-400 hover:text-white flex items-center gap-2 transition-colors z-50">
        <ArrowLeft className="w-5 h-5" /> Back to home
      </Link>

      {/* Left side: AI Graphic / Marketing */}
      <div className="hidden lg:flex flex-1 relative bg-[#111] border-r border-[#27272a] items-center justify-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-[#1877F2]/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#1877F2]/20 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Graphic */}
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center max-w-lg">
          <div className="w-24 h-24 bg-[#1877F2] rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(24,119,242,0.4)]">
            <span className="font-bold text-white text-5xl">V</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Welcome back to VocalHive</h1>
          <p className="text-xl text-gray-400 leading-relaxed">
            The world&apos;s most powerful AI vocal extractor and stem separation engine. Log in to continue splitting tracks.
          </p>
        </div>
      </div>

      {/* Right side: Clerk Component */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-[#050505]" />
        
        <div className="relative z-10 w-full max-w-md">
          <SignIn 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-[#111] border border-[#27272a] shadow-2xl rounded-2xl",
                headerTitle: "text-white font-bold text-2xl",
                headerSubtitle: "text-gray-400",
                formButtonPrimary: "bg-[#1877F2] hover:bg-[#166FE5] text-white py-3 shadow-[0_0_15px_rgba(24,119,242,0.3)]",
                socialButtonsBlockButton: "border-[#27272a] bg-[#18191A] hover:bg-[#242526] text-white",
                socialButtonsBlockButtonText: "text-white font-medium",
                formFieldLabel: "text-gray-300",
                formFieldInput: "bg-[#050505] border-[#27272a] text-white focus:border-[#1877F2]",
                footerActionText: "text-gray-400",
                footerActionLink: "text-[#1877F2] hover:text-[#166FE5] font-medium",
                dividerLine: "bg-[#27272a]",
                dividerText: "text-gray-500",
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
