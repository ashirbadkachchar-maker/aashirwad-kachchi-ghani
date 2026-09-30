"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "./SiteChrome";

type Prod = { id: string; img: string; nameHi: string; nameEn: string; sizes: { kg: number; price: number }[] };
const PRODUCTS: Prod[] = [
  { id: "mustard", img: "/products/mustard.webp", nameHi: "सरसों का तेल", nameEn: "Mustard Oil", sizes: [{ kg: 1, price: 199 }, { kg: 2, price: 379 }, { kg: 5, price: 899 }] },
  { id: "sesame", img: "/products/sesame.webp", nameHi: "तिल का तेल", nameEn: "Sesame Oil", sizes: [{ kg: 1, price: 259 }, { kg: 2, price: 479 }, { kg: 5, price: 1099 }] },
  { id: "gud", img: "/products/gud.webp", nameHi: "तिल गुड़ की कच्चर", nameEn: "Sesame Jaggery Chikki", sizes: [{ kg: 1, price: 299 }, { kg: 2, price: 549 }] },
  { id: "cheeni", img: "/products/cheeni.webp", nameHi: "तिल चीनी की कच्चर", nameEn: "Sesame Sugar Chikki", sizes: [{ kg: 1, price: 279 }, { kg: 2, price: 519 }] },
];
const NORM = (t: string) => {
  const s = (t || "").toLowerCase();
  if (s.includes("mustard") || s.includes("sarso") || s.includes("sarson")) return "mustard";
  if (s.includes("peanut") || s.includes("moongfali") || s.includes("mungfali")) return "peanut";
  if (s.includes("gud")) return "gud";
  if (s.includes("cheeni") || s.includes("chini")) return "cheeni";
  if (s.includes("sesame") || s.includes("til")) return "sesame";
  return s.trim();
};
const CROSS_SELL: Record<string, string[]> = {
  mustard: ["sesame", "gud"],
  sesame: ["mustard", "cheeni"],
  gud: ["sesame", "mustard"],
  cheeni: ["mustard", "sesame"],
  peanut: ["sesame", "gud"],
};
const BESTSELLERS = ["mustard", "sesame"];
function getBaseId(pid: string): string {
  const id = String(pid || "").toLowerCase();
  for (const b of ["mustard", "sesame", "gud", "cheeni", "peanut"]) {
    if (id === b || id.startsWith(b + "-")) return b;
  }
  return "";
}
function SuggestRow({ p, rating }: { p: Prod; rating?: { avg: number; count: number } }) {
  const { lang } = useLang();
  const [added, setAdded] = useState(false);
  const size = p.sizes[0];
  const stars = rating && rating.count > 0? Math.round(rating.avg) : 0;
  const add = () => {
    const cart = JSON.parse(localStorage.getItem("akg_cart") || "[]");
    const pid = p.id + "-" + size.kg + "kg";
    const found = cart.find((c: any) => c.product_id === pid);
    if (found) found.qty += 1;
    else cart.push({ product_id: pid, name: lang === "hi"? p.nameHi : p.nameEn, pack_size_kg: size.kg, price: size.price, qty: 1 });
    localStorage.setItem("akg_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("akg-cart-updated"));
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-amber-100 shadow-sm p-2.5">
      <img src={p.img} alt={p.nameHi} className="w-14 h-14 rounded-xl object-cover shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[13px] truncate">{lang === "hi"? p.nameHi : p.nameEn} <span className="font-semibold text-gray-400">• {size.kg}kg</span></p>
        <p className="text-sm font-bold text-green-700 leading-tight">₹{size.price}</p>
        {stars > 0? (
          <p className="text-[11px] leading-tight"><span className="text-amber-500 font-bold">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span><span className="text-gray-500"> {rating!.avg.toFixed(1)} ({rating!.count})</span></p>
        ) : (
          <p className="text-[11px] text-gray-400 leading-tight">☆☆☆☆☆ {lang === "hi"? "नया" : "New"}</p>
        )}
      </div>
      <button onClick={add} className={"shrink-0 text-[13px] font-bold px-4 py-2 rounded-xl text-white " + (added? "bg-green-600" : "bg-orange-500")}>
        {added? "✓" : (lang === "hi"? "+ जोड़ें" : "+ Add")}
      </button>
    </div>
  );
}
export default function CartSuggest() {
  const { lang } = useLang();
  const [products, setProducts] = useState<Prod[]>(PRODUCTS);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [cartIds, setCartIds] = useState<string[]>([]);
  useEffect(() => {
    const readCart = () => {
      try {
        const cart = JSON.parse(localStorage.getItem("akg_cart") || "[]");
        setCartIds((cart as any[]).map((c: any) => getBaseId(c.product_id)).filter(Boolean));
      } catch { setCartIds([]); }
    };
    const loadPrices = async () => {
      const { data: db } = await supabase.from("products").select("oil_type, pack_size_kg, price").eq("is_active", true);
      if (db && db.length > 0) {
        setProducts(PRODUCTS.map((base) => ({...base, sizes: base.sizes.map((sz) => {
          const match = (db as any[]).find((d: any) => NORM(String(d.oil_type)) === base.id && Number(d.pack_size_kg) === sz.kg);
          return match? {...sz, price: Number(match.price) } : sz; }), })));
      }
    };
    const loadRatings = async () => {
      const { data: fb } = await supabase.from("feedback").select("product_id, rating").eq("is_public", true).not("product_id", "is", null);
      const { data: prods } = await supabase.from("products").select("id, oil_type");
      const idToBase: Record<string, string> = {}; (prods || []).forEach((pd: any) => { idToBase[pd.id] = NORM(String(pd.oil_type)); });
      const agg: Record<string, { sum: number; count: number }> = {};
      (fb || []).forEach((f: any) => { const base = idToBase[f.product_id]; if (!base) return; if (!agg[base]) agg[base] = { sum: 0, count: 0 }; agg[base].sum += Number(f.rating) || 0; agg[base].count += 1; });
      const out: Record<string, { avg: number; count: number }> = {}; Object.keys(agg).forEach((k) => { out[k] = { avg: agg[k].sum / agg[k].count, count: agg[k].count }; }); setRatings(out);
    };
    readCart(); loadPrices(); loadRatings();
    window.addEventListener("akg-cart-updated", readCart);
    window.addEventListener("storage", readCart);
    return () => { window.removeEventListener("akg-cart-updated", readCart); window.removeEventListener("storage", readCart); };
  }, []);
  const picked: string[] = [];
  if (cartIds.length === 0) picked.push(...BESTSELLERS);
  else {
    const seen = new Set(cartIds);
    for (const id of cartIds) for (const s of CROSS_SELL[id] || []) if (!seen.has(s) &&!picked.includes(s)) picked.push(s);
  }
  const suggested = picked.map((id) => products.find((p) => p.id === id)).filter(Boolean).slice(0, 3) as Prod[];
  if (suggested.length === 0) return null;
  return (
    <div className="mb-4">
      <p className="text-sm font-bold mb-1.5">✨ {lang === "hi"? "आपके लिए खास — एक टैप में जोड़ें" : "Recommended for you — add in one tap"}</p>
      <div className="space-y-2">
        {suggested.map((p) => (<SuggestRow key={p.id} p={p} rating={ratings[p.id]} />))}
      </div>
    </div>
  );
}
