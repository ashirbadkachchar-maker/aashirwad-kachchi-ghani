"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getAdmin } from "@/lib/admin";
export type Lang = "hi" | "en";
const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "hi", setLang: () => {} });
export const useLang = () => useContext(LangCtx);
export default function SiteChrome({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("hi");
  const pathname = usePathname();
  const [customer, setCustomer] = useState<any>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);
  const [activeHref, setActiveHref] = useState("");
  const isAdminPage = pathname.startsWith("/admin");
  useEffect(() => {
    const read = () => {
      const s = localStorage.getItem("akg_customer");
      setCustomer(s? JSON.parse(s) : null);
      try { setAdminUser(getAdmin()); } catch { setAdminUser(null); }
    };
    read();
    window.addEventListener("focus", read);
    return () => window.removeEventListener("focus", read);
  }, [pathname]);
  useEffect(() => {
    setActiveHref(window.location.pathname + window.location.search);
  }, [pathname]);
  useEffect(() => {
    const readCart = () => {
      try {
        const cart = JSON.parse(localStorage.getItem("akg_cart") || "[]");
        setCartCount(cart.reduce((t: number, c: any) => t + (Number(c.qty) || 0), 0));
      } catch { setCartCount(0); }
    };
    readCart();
    window.addEventListener("focus", readCart);
    window.addEventListener("storage", readCart);
    return () => {
      window.removeEventListener("focus", readCart);
      window.removeEventListener("storage", readCart);
    };
  }, [pathname]);
  useEffect(() => { const s = localStorage.getItem("akg_lang"); if (s === "en" || s === "hi") setLang(s); }, []);
  const change = (l: Lang) => { setLang(l); localStorage.setItem("akg_lang", l); };
  const nav = isAdminPage? [
    { href: "/admin", icon: "🏠", hi: "Home", en: "Home" },
    { href: "/admin?tab=orders", icon: "📋", hi: "Orders", en: "Orders" },
    { href: "/admin?tab=products", icon: "🫗", hi: "Products", en: "Products" },
    { href: "/admin?tab=feedback", icon: "⭐", hi: "Feedback", en: "Feedback" },
  ] : [
    { href: "/", icon: "🏠", hi: "होम", en: "Home" },
    { href: "/cart", icon: "🛒", hi: "कार्ट", en: "Cart" },
    { href: "/orders", icon: "📦", hi: "आर्डर", en: "Orders" },
    { href: "/feedback", icon: "⭐", hi: "रिव्यू", en: "Review" },
  ];
  return (
    <LangCtx.Provider value={{ lang, setLang: change }}>
      <header className="sticky top-0 z-20 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow">
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center gap-3">
          <img src="/logo.png" alt="Aashirwad Kachchar logo" className="w-11 h-11 rounded-full bg-white object-cover shadow" />
          <div className="flex-1">
            <h1 className="font-bold text-lg leading-tight">{lang === "hi"? "आशीर्वाद कच्चर" : "Aashirwad Kachchar"}</h1>
            <p className="text-[11px] opacity-90">{lang === "hi"? "शुद्ध तेल, हर घर" : "Pure Oil, Every Home"}</p>
          </div>
          {isAdminPage && adminUser? (
            <span className="bg-white/25 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap">
              {"👤 " + String(adminUser.name).split(" ")[0]}
            </span>
          ) : (
            <Link href="/orders" className="bg-white/25 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap">
              {customer? "👤 " + String(customer.name).split(" ")[0] : "🔑 " + (lang === "hi"? "लॉगिन" : "Login")}
            </Link>
          )}
          <button onClick={() => change(lang === "hi"? "en" : "hi")} className="bg-white/25 rounded-full p-1 text-xs font-bold flex items-center" aria-label="Language toggle">
            <span className={"px-2 py-0.5 rounded-full " + (lang === "hi"? "bg-white text-orange-600" : "text-white")}>हिं</span>
            <span className={"px-2 py-0.5 rounded-full " + (lang === "en"? "bg-white text-orange-600" : "text-white")}>EN</span>
          </button>
        </div>
      </header>
      <main className="max-w-md mx-auto bg-[#FFF8F0] min-h-screen">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
        <div className="max-w-md mx-auto grid grid-cols-4 text-center text-[11px]">
          {nav.map((n) => {
            const active = activeHref === n.href;
            return (
              <Link key={n.href} href={n.href} onClick={() => setActiveHref(n.href)} className={"py-2.5 font-semibold " + (active? "text-orange-600" : "text-gray-500")}>
                <span className="relative inline-block text-xl">
                  {n.icon}
                  {!isAdminPage && n.href === "/cart" && cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {cartCount > 99? "99+" : cartCount}
                    </span>
                  )}
                </span>
                <br />{lang === "hi"? n.hi : n.en}
              </Link>
            );
          })}
        </div>
      </nav>
    </LangCtx.Provider>
  );
}
