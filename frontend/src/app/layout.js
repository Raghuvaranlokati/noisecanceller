import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata = {
  title: "Vocal Extractor AI | Free Professional Audio Separation",
  description: "Extract studio-quality vocals, drums, bass, and instruments from any audio or video file for free using advanced AI. No paywalls, 100% free forever.",
  keywords: ["vocal remover", "extract vocals", "AI stem separation", "isolate vocals", "karaoke maker", "free vocal remover", "audio separator"],
  openGraph: {
    title: "Vocal Extractor AI | Free Audio Separation",
    description: "Extract studio-quality vocals, drums, bass, and instruments from any audio or video file for free using advanced AI.",
    type: "website",
    url: "https://noisecanceller.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vocal Extractor AI",
    description: "Remove vocals and isolate instruments for free using AI.",
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
