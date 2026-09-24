import "./globals.css";
import type { Metadata } from "next";
import SiteChrome from "./components/SiteChrome";
export const metadata: Metadata = {
  title: "आशीर्वाद कच्चर - कच्ची घानी शुद्ध तेल",
  description: "कच्ची घानी शुद्ध तेल — सरसों तेल, तिल तेल, तिल कच्चर (गुड़/चीनी). Online order, live tracking.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body className="min-h-screen pb-20 bg-[#FFF8F0]">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
