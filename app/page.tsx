"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "./components/SiteChrome";
type SizeOpt = { kg: number; price: number };
type Prod = { id: string; img: string; nameHi: string; nameEn: string; sizes: SizeOpt[] };
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
// --- Phase 2: smart cross-sell ---
const CROSS_SELL: Record<string, string[]> = {
  mustard: ["sesame", "gud"],
  sesame: ["mustard", "cheeni"],
  gud: ["sesame", "mustard"],
  cheeni: ["mustard", "sesame"],
  peanut: ["sesame", "gud"],
};
const BESTSELLERS = ["mustard", "sesame"];
function getBaseId(product_id: string): string {
  const id = String(product_id || "").toLowerCase();
  for (const base of ["mustard", "sesame", "gud", "cheeni", "peanut"]) {
    if (id === base || id.startsWith(base + "-")) return base;
  }
  return "";
}
// --- 4 auto-sliding tabs ---
const SLIDES = [
  { id: "mustard", img: "/products/mustard.webp", titleHi: "सरसों का तेल", titleEn: "Mustard Oil", subHi: "शुद्ध कच्ची घानी • कोल्हू में पिसाई", subEn: "Pure kachchi ghani • Traditionally pressed" },
  { id: "sesame", img: "/products/sesame.webp", titleHi: "तिल का तेल", titleEn: "Sesame Oil", subHi: "100% शुद्ध • कोई केमिकल नहीं", subEn: "100% pure • No chemicals" },
  { id: "gud", img: "/products/gud.webp", titleHi: "तिल गुड़ की कच्चर", titleEn: "Sesame Jaggery Chikki", subHi: "गुड़ की मिठास • सेहत का खजाना", subEn: "Jaggery sweetness • Healthy treat" },
  { id: "cheeni", img: "/products/cheeni.webp", titleHi: "तिल चीनी की कच्चर", titleEn: "Sesame Sugar Chikki", subHi: "कुरकुरी • स्वादिष्ट", subEn: "Crispy • Delicious" },
];
function HeroSlider() {
  const { lang } = useLang();
  const [idx, setIdx] = useState(0);
  const touchX = useRef<number | null>(null);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 3500);
    return () => clearInterval(t);
  }, []);
  const s = SLIDES[idx];
  return (
    <div className="relative rounded-3xl overflow-hidden shadow"
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx < -40) setIdx((i) => (i + 1) % SLIDES.length);
        else if (dx > 40) setIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length);
        touchX.current = null;
      }}>
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white flex items-center gap-4 min-h-[132px]">
        <div className="flex-1">
          <h2 className="text-xl font-bold leading-snug">{lang === "hi"? s.titleHi : s.titleEn}</h2>
          <p className="text-xs mt-1 opacity-95">{lang === "hi"? s.subHi : s.subEn}</p>
        </div>
        <img key={s.id} src={s.img} alt={s.titleHi} className="w-24 h-24 object-cover rounded-2xl bg-white/20" />
      </div>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
        {SLIDES.map((sl, i) => (
          <button key={sl.id} onClick={() => setIdx(i)} aria-label={"Slide " + (i + 1)}
            className={"h-2 rounded-full transition-all " + (i === idx? "w-6 bg-white" : "w-2 bg-white/50")} />
        ))}
      </div>
    </div>
  );
}
function ProductCard({ p, rating }: { p: Prod; rating?: { avg: number; count: number } }) {
  const { lang } = useLang();
  const [sel, setSel] = useState(0);
  const size = p.sizes[sel];
  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("akg_cart") || "[]");
    const pid = p.id + "-" + size.kg + "kg";
    const found = cart.find((c: any) => c.product_id === pid);
    if (found) found.qty += 1;
    else cart.push({ product_id: pid, name: lang === "hi"? p.nameHi : p.nameEn, pack_size_kg: size.kg, price: size.price, qty: 1 });
    localStorage.setItem("akg_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("akg-cart-updated"));
    alert(lang === "hi"? "कार्ट में जुड़ गया!" : "Added to cart!");
  };
  const stars = rating && rating.count > 0? Math.round(rating.avg) : 0;
  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 border border-amber-100 flex flex-col">
      <img src={p.img} alt={p.nameHi} className="w-full aspect-square object-cover rounded-xl mb-2" />
      <h3 className="font-bold text-sm leading-snug">{lang === "hi"? p.nameHi : p.nameEn}</h3>
      {stars > 0? (
        <p className="text-xs mt-0.5"><span className="text-amber-500 font-bold">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span><span className="text-gray-500"> {rating!.avg.toFixed(1)} ({rating!.count})</span></p>
      ) : (
        <p className="text-[11px] text-gray-400 mt-0.5">☆☆☆☆☆ {lang === "hi"? "नया" : "New"}</p>
      )}
      <div className="flex gap-1 mt-1.5 flex-wrap">
        {p.sizes.map((s, i) => (
          <button key={s.kg} onClick={() => setSel(i)} className={"text-[11px] px-2 py-0.5 rounded-full border font-semibold " + (i === sel? "bg-orange-500 text-white border-orange-500" : "border-amber-300 text-amber-700")}>{s.kg}kg</button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <p className="text-xl font-extrabold text-green-700">₹{size.price}</p>
        <span className="text-[10px] font-bold text-orange-600 bg-orange-100 rounded-full px-1.5 py-0.5">{lang === "hi"? "ऑफर" : "Offer"}</span>
      </div>
      <button onClick={addToCart} className="mt-2 w-full text-sm bg-orange-500 text-white rounded-xl py-2 font-bold active:scale-[0.98] transition">{lang === "hi"? "जोड़ें" : "Add"}</button>
    </div>
  );
}
function RecommendedForYou({ products, ratings }: { products: Prod[]; ratings: Record<string, { avg: number; count: number }> }) {
  const { lang } = useLang();
  const [cartIds, setCartIds] = useState<string[]>([]);
  useEffect(() => {
    const read = () => {
      try {
        const cart = JSON.parse(localStorage.getItem("akg_cart") || "[]");
        setCartIds((cart as any[]).map((c: any) => getBaseId(c.product_id)).filter(Boolean));
      } catch { setCartIds([]); }
    };
    read();
    window.addEventListener("akg-cart-updated", read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener("akg-cart-updated", read); window.removeEventListener("storage", read); };
  }, []);
  const picked: string[] = [];
  if (cartIds.length === 0) {
    picked.push(...BESTSELLERS);
  } else {
    const seen = new Set(cartIds);
    for (const id of cartIds) {
      for (const s of CROSS_SELL[id] || []) {
        if (!seen.has(s) &&!picked.includes(s)) picked.push(s);
      }
    }
  }
  const suggested = picked.map((id) => products.find((p) => p.id === id)).filter(Boolean).slice(0, 4) as Prod[];
  if (suggested.length === 0) return null;
  return (
    <div>
      <h2 className="text-base font-bold mb-1">✨ {lang === "hi"? "आपके लिए खास" : "Recommended For You"}</h2>
      <p className="text-[11px] text-gray-500 mb-2">{lang === "hi"? "इन्हें साथ में खरीदने वालों ने पसंद किया" : "Loved by customers who bought similar items"}</p>
      <div className="grid grid-cols-2 gap-3">{suggested.map((p) => (<ProductCard key={"rec-" + p.id} p={p} rating={ratings[p.id]} />))}</div>
    </div>
  );
}
export default function Home() {
  const { lang } = useLang();
  const [products, setProducts] = useState<Prod[]>(PRODUCTS);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  useEffect(() => {
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
    loadPrices(); loadRatings();
    const ch = supabase.channel("admin-price-live").on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadPrices()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  const FAYDE = lang === "hi"
? [{ icon: "❤️", title: "100% शुद्ध & प्राकृतिक", sub: "कोई प्रिजर्वेटिव नहीं • कोल्ड प्रेस्ड" }, { icon: "🌿", title: "ओमेगा-3 से भरपूर", sub: "दिल व इम्यूनिटी के लिए अच्छा" }]
    : [{ icon: "❤️", title: "100% Pure & Natural", sub: "No preservatives • Cold pressed" }, { icon: "🌿", title: "Rich in Omega-3", sub: "Good for heart & immunity" }];
  return (
    <div className="px-4 py-4 space-y-5">
      <HeroSlider />
      <div>
        <h2 className="text-base font-bold mb-2">{lang === "hi"? "तेल के फायदे" : "Oil Benefits"}</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {FAYDE.map((b) => (
            <div key={b.title} className="bg-white rounded-2xl p-3 shadow-sm border border-amber-100 flex items-center gap-2.5">
              <div className="text-2xl shrink-0">{b.icon}</div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs leading-snug">{b.title}</h3>
                <p className="text-[10px] text-gray-500 leading-snug">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-base font-bold mb-2">🛍️ {lang === "hi"? "हमारे उत्पाद" : "Shop Products"}</h2>
        <div className="grid grid-cols-2 gap-3">{products.map((p) => (<ProductCard key={p.id} p={p} rating={ratings[p.id]} />))}</div>
      </div>
      <RecommendedForYou products={products} ratings={ratings} />
      <footer className="text-center text-xs text-gray-400 pb-4">
        <a href="/admin" className="font-bold text-amber-600 text-sm">आशीर्वाद कच्चर</a>
        <p className="mt-0.5">{lang === "hi"? "शुद्ध तेल, हर घर" : "Pure Oil, Every Home"}</p>
      </footer>
    </div>
  );
}
