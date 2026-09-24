import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "आशीर्बाद कच्चर - कच्ची घानी शुद्ध तेल",
  description: "कच्ची घानी शुद्ध तेल, भाटी प्रोडक्ट - सरसों तेल, मूंगफली तेल, तिल कच्चर (गुड़/चीनी). Online order, live tracking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body className="min-h-screen pb-20">
        <header className="sticky top-0 z-10 bg-amber-500 text-white shadow">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-2">
            <span className="text-2xl">🪔</span>
            <div>
              <h1 className="font-bold text-lg leading-tight">आशीर्बाद कच्चर</h1>
              <p className="text-xs opacity-90">कच्ची घानी शुद्ध तेल, भाटी प्रोडक्ट</p>
            </div>
          </div>
        </header>
        <main className="max-w-md mx-auto">{children}</main>
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="max-w-md mx-auto grid grid-cols-4 text-center text-xs">
            <Link href="/" className="py-3 font-semibold text-amber-700">🏠<br />Home</Link>
            <Link href="/cart" className="py-3 font-semibold text-amber-700">🛒<br />Cart</Link>
            <Link href="/track" className="py-3 font-semibold text-amber-700">📦<br />Track</Link>
            <Link href="/feedback" className="py-3 font-semibold text-amber-700">⭐<br />Review</Link>
          </div>
        </nav>
      </body>
    </html>
  );
}
