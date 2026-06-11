import { Inter, Outfit } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import type { Metadata } from 'next';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Stemify AI | The World's Best AI Vocal Extractor",
  description: "Extract high-quality vocals, drums, bass, and instruments from any audio or video file instantly using deep learning.",
  keywords: ["vocal remover", "extract vocals", "AI stem separation", "isolate vocals", "karaoke maker", "free vocal remover", "audio separator"],
  openGraph: {
    title: "Stemify AI | Free Audio Separation",
    description: "Extract studio-quality vocals, drums, bass, and instruments from any audio or video file for free using advanced AI.",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#1877F2'
        }
      }}
    >
      <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
        <body className="flex flex-col min-h-screen bg-[#050505] text-[#E4E6EB] font-sans antialiased">
          <Navbar />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
