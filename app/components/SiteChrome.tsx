"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
export type Lang = "hi" | "en";
const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "hi", setLang: () => {} });
export const useLang = () => useContext(LangCtx);
export default function SiteChrome({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("hi");
  const pathname = usePathname();
    const [customer, setCustomer] = useState<any>(null);
  useEffect(() => {
    const read = () => {
      const s = localStorage.getItem("akg_customer");
      setCustomer(s? JSON.parse(s) : null);
    };
    read();
    window.addEventListener("focus", read);
    return () => window.removeEventListener("focus", read);
  }, [pathname]);
  useEffect(() => { const s = localStorage.getItem("akg_lang"); if (s === "en" || s === "hi") setLang(s); }, []);
  const change = (l: Lang) => { setLang(l); localStorage.setItem("akg_lang", l); };
  const nav = [
    { href: "/", icon: "\uD83C\uDFE0", hi: "होम", en: "Home" },
    { href: "/cart", icon: "\uD83D\uDED2", hi: "कार्ट", en: "Cart" },
    { href: "/track", icon: "\uD83D\uDCE6", hi: "ट्रैक", en: "Track" },
    { href: "/feedback", icon: "⭐", hi: "रिव्यू", en: "Review" },
  ];
  return (
    <LangCtx.Provider value={{ lang, setLang: change }}>
      <header className="sticky top-0 z-20 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow">
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center gap-3">
          <img src="/logo.png" alt="Aashirwad Kachchar logo" className="w-11 h-11 rounded-full bg-white object-cover shadow" />
          <div className="flex-1">
            <h1 className="font-bold text-lg leading-tight">{lang === "hi" ? "आशीर्वाद कच्चर" : "Aashirwad Kachchar"}</h1>
            <p className="text-[11px] opacity-90">{lang === "hi" ? "शुद्ध तेल, हर घर" : "Pure Oil, Every Home"}</p>
          </div>
                    <Link href="/orders" className="bg-white/25 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap">
            {customer? "👤 " + String(customer.name).split(" ")[0] : "🔑 " + (lang === "hi"? "लॉगिन" : "Login")}
          </Link>
          <button onClick={() => change(lang === "hi" ? "en" : "hi")} className="bg-white/25 rounded-full p-1 text-xs font-bold flex items-center" aria-label="Language toggle">
            <span className={"px-2 py-0.5 rounded-full " + (lang === "hi" ? "bg-white text-orange-600" : "text-white")}>हिं</span>
            <span className={"px-2 py-0.5 rounded-full " + (lang === "en" ? "bg-white text-orange-600" : "text-white")}>EN</span>
          </button>
        </div>
      </header>
      <main className="max-w-md mx-auto bg-[#FFF8F0] min-h-screen">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
        <div className="max-w-md mx-auto grid grid-cols-4 text-center text-[11px]">
          {nav.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href} className={"py-2.5 font-semibold " + (active ? "text-orange-600" : "text-gray-500")}>
                <span className="text-xl">{n.icon}</span><br />{lang === "hi" ? n.hi : n.en}
              </Link>
            );
          })}
        </div>
      </nav>
    </LangCtx.Provider>
  );
}
