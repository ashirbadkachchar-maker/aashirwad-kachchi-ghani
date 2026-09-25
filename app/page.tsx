"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "./components/SiteChrome";

type Review = { id: string; customer_name: string; rating: number; review: string };
type DBProd = { id: string; name?: string; oil_type: string; pack_size_kg: number; price: number; mrp?: number; is_active: boolean };
type SizeOpt = { kg: number; price: number; dbId: string; mrp?: number };
type Prod = { id: string; img: string; nameHi: string; nameEn: string; sizes: SizeOpt[] };

const IMG: Record<string, string> = {
  mustard: "/products/mustard.webp",
  sesame: "/products/sesame.webp",
  til: "/products/sesame.webp",
  gud: "/products/gud.webp",
  cheeni: "/products/cheeni.webp",
  peanut: "/products/mustard.webp",
};

const NAME_HI: Record<string, string> = {
  mustard: "सरसों का तेल",
  sesame: "तिल का तेल",
  til: "तिल का तेल",
  peanut: "मूंगफली तेल",
  gud: "तिल गुड़ की कच्चर",
  til_gud: "तिल गुड़ की कच्चर",
  cheeni: "तिल चीनी की कच्चर",
  til_cheeni: "तिल चीनी की कच्चर",
};

const NAME_EN: Record<string, string> = {
  mustard: "Mustard Oil",
  sesame: "Sesame Oil",
  til: "Sesame Oil",
  peanut: "Peanut Oil",
  gud: "Sesame Jaggery Chikki",
  til_gud: "Sesame Jaggery Chikki",
  cheeni: "Sesame Sugar Chikki",
  til_cheeni: "Sesame Sugar Chikki",
};

// normalize oil_type -> group key
const NORM = (t: string) => {
  const s = (t||"").toLowerCase().trim();
  if (["mustard","sarso","sarson","peanut"].includes(s)) return "mustard";
  if (["sesame","til"].includes(s)) return "sesame";
  if (["gud","til_gud","til-gud"].includes(s)) return "gud";
  if (["cheeni","chini","til_cheeni","til-cheeni"].includes(s)) return "cheeni";
  return s;
};

function ProductCard({ p, onAdd }: { p: Prod; onAdd: (dbId: string, nameHi: string, nameEn: string, kg: number, price: number) => void }) {
  const { lang } = useLang();
  const [sel, setSel] = useState(0);
  const curr = p.sizes[sel];
  if (!curr) return null;
  return (
    <div className="bg-white rounded-2xl shadow p-3 border border-amber-100 flex flex-col">
      <img src={p.img} alt={p.nameHi} className="w-full aspect-square object-cover rounded-xl mb-2" />
      <h3 className="font-bold text-sm">{lang === "hi" ? p.nameHi : p.nameEn}</h3>
      <div className="flex gap-1 mt-1.5 flex-wrap">
        {p.sizes.map((s, i) => (
          <button key={s.kg} onClick={() => setSel(i)} className={"text-[11px] px-2 py-0.5 rounded-full border font-semibold " + (i === sel ? "bg-orange-500 text-white border-orange-500" : "border-amber-300 text-amber-700")}>
            {s.kg}kg
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-lg font-bold text-green-700">₹{curr.price}</p>
      {curr.mrp && curr.mrp > curr.price && <p className="text-[11px] line-through text-gray-400">₹{curr.mrp}</p>}
      <button onClick={() => onAdd(curr.dbId, p.nameHi, p.nameEn, curr.kg, curr.price)} className="mt-2 w-full text-sm bg-orange-500 text-white rounded-xl py-2 font-bold">Add ⊕</button>
    </div>
  );
}

export default function Home() {
  const { lang } = useLang();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);

  const load = async () => {
    const { data: fb } = await supabase.from("feedback").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(10);
    if (fb) setReviews(fb as Review[]);

    const { data: db } = await supabase.from("products").select("*").eq("is_active", true).order("pack_size_kg", { ascending: true });
    if (db && (db as DBProd[]).length > 0) {
      const grouped: Record<string, DBProd[]> = {};
      (db as DBProd[]).forEach((d) => {
        const key = NORM(d.oil_type);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(d);
      });
      const mapped: Prod[] = Object.entries(grouped).map(([key, list]) => {
        const first = list[0];
        const sizes: SizeOpt[] = list
          .sort((a, b) => a.pack_size_kg - b.pack_size_kg)
          .map((x) => ({ kg: Number(x.pack_size_kg), price: Number(x.price), dbId: x.id, mrp: x.mrp ? Number(x.mrp) : undefined }));
        return {
          id: key,
          img: IMG[key] || "/products/mustard.webp",
          nameHi: NAME_HI[key] || first.name || key,
          nameEn: NAME_EN[key] || first.name || key,
          sizes,
        };
      });
      setProducts(mapped);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("live-products-price").on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const FAYDE = lang === "hi"
    ? [{ icon: "❤️", title: "100% शुद्ध & प्राकृतिक", sub: "कोई प्रिजर्वेटिव नहीं • कोल्ड प्रेस्ड" }, { icon: "🌿", title: "ओमेगा-3 से भरपूर", sub: "दिल व इम्यूनिटी के लिए अच्छा" }]
    : [{ icon: "❤️", title: "100% Pure & Natural", sub: "No preservatives • Cold pressed" }, { icon: "🌿", title: "Rich in Omega-3", sub: "Good for heart & immunity" }];

  const addToCart = (dbId: string, nameHi: string, nameEn: string, kg: number, price: number) => {
    const cart = JSON.parse(localStorage.getItem("akg_cart") || "[]");
    // IMPORTANT: ab product_id = Supabase UUID bhej rahe hain, taaki route-order live price nikaal sake
    const found = cart.find((c: any) => c.product_id === dbId);
    if (found) found.qty += 1;
    else cart.push({ product_id: dbId, name: lang === "hi" ? nameHi : nameEn, pack_size_kg: kg, price, qty: 1, dbId });
    localStorage.setItem("akg_cart", JSON.stringify(cart));
    alert(lang === "hi" ? "कार्ट में जुड़ गया! 🛒" : "Added to cart! 🛒");
  };

  return (
    <div className="px-4 py-4 space-y-5">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-5 text-white flex items-center gap-4 shadow">
        <div className="flex-1">
          <h2 className="text-xl font-bold leading-snug">{lang === "hi" ? "शुद्ध कच्ची घानी तेल" : "Pure Kachchi Ghani Oil"}</h2>
          <p className="text-xs mt-1 opacity-95">{lang === "hi" ? "बिना केमिकल, कोल्हू में पिसाई" : "No chemicals, traditionally pressed"}</p>
        </div>
        <img src="/products/sesame.webp" alt="oil" className="w-24 h-24 object-cover rounded-2xl bg-white/20" />
      </div>
      <div>
        <h2 className="text-base font-bold mb-2">🌿 {lang === "hi" ? "तेल के फायदे" : "Oil Benefits"}</h2>
        <div className="grid grid-cols-2 gap-3">
          {FAYDE.map((b) => (
            <div key={b.title} className="bg-white rounded-2xl p-4 shadow border border-amber-100">
              <div className="text-3xl mb-1">{b.icon}</div>
              <h3 className="font-bold text-sm">{b.title}</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">{b.sub}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-base font-bold mb-2">🛍️ Shop Products <span className="text-[10px] font-normal text-green-600">• Live from Admin</span></h2>
        {products.length === 0 && <p className="text-sm text-gray-500">Products load ho rahe hain... Admin me product active hai na check karo.</p>}
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (<ProductCard key={p.id} p={p} onAdd={addToCart} />))}
        </div>
      </div>
      <div>
        <h2 className="text-base font-bold mb-2">⭐ Customer Reviews</h2>
        {reviews.length === 0 && (<p className="text-sm text-gray-500">{lang === "hi" ? "Abhi koi review nahi — pehla review aap de sakte ho!" : "No reviews yet — be the first!"}</p>)}
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-3 shadow border border-amber-100">
              <p className="text-sm font-bold">{r.customer_name} <span className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span></p>
              <p className="text-sm text-gray-600">{r.review}</p>
            </div>
          ))}
        </div>
      </div>
      <footer className="text-center text-xs text-gray-400 pb-4">आशीर्वाद कच्चर • {lang === "hi" ? "शुद्ध तेल, हर घर" : "Pure Oil, Every Home"}</footer>
    </div>
  );
}
