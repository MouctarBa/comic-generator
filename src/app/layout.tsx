import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Comic Generator",
  description: "AI-powered comic book generator — OpenAI-first, model-agnostic",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-grid`}
        style={{ background: "var(--background)" }}
      >
        {/* Top gradient line */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

        <header className="glass sticky top-0 z-50 border-t-0 border-x-0">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center glow-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-gradient">
                Comic Generator
              </span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Projects
              </Link>
              <Link
                href="/new"
                className="btn-accent rounded-lg px-4 py-2 text-sm font-medium"
              >
                + New Comic
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>

        {/* Bottom gradient line */}
        <div className="fixed bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent pointer-events-none" />
      </body>
    </html>
  );
}
