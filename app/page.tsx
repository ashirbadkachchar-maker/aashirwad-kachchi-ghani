"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "./components/SiteChrome";
type Review = { id: string; customer_name: string; rating: number; review: string };
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
    alert(lang === "hi"? "कार्ट में जुड़ गया!" : "Added to cart!");
  };
  const stars = rating && rating.count > 0? Math.round(rating.avg) : 0;
  return (
    <div className="bg-white rounded-2xl shadow p-3 border border-amber-100 flex flex-col">
      <img src={p.img} alt={p.nameHi} className="w-full aspect-square object-cover rounded-xl mb-2" />
      <h3 className="font-bold text-sm">{lang === "hi"? p.nameHi : p.nameEn}</h3>
      {stars > 0? (
        <p className="text-xs mt-0.5">
          <span className="text-amber-500 font-bold">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
          <span className="text-gray-500"> {rating!.avg.toFixed(1)} ({rating!.count})</span>
        </p>
      ) : (
        <p className="text- text-gray-400 mt-0.5">☆☆☆☆☆ {lang === "hi"? "नया" : "New"}</p>
      )}
      <div className="flex gap-1 mt-1.5 flex-wrap">
        {p.sizes.map((s, i) => (
          <button key={s.kg} onClick={() => setSel(i)} className={"text- px-2 py-0.5 rounded-full border font-semibold " + (i === sel? "bg-orange-500 text-white border-orange-500" : "border-amber-300 text-amber-700")}>{s.kg}kg</button>
        ))}
      </div>
      <p className="mt-1.5 text-lg font-bold text-green-700">₹{size.price} <span className="text- font-semibold text-gray-500">{lang === "hi"? "ऑफर प्राइस" : "Offer Price"}</span></p>
      <button onClick={addToCart} className="mt-2 w-full text-sm bg-orange-500 text-white rounded-xl py-2 font-bold">Add</button>
    </div>
  );
}
export default function Home() {
  const { lang } = useLang();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Prod[]>(PRODUCTS);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [custMobile, setCustMobile] = useState("");
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("feedback").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(10);
      if (data) setReviews(data);
    })();
    const loadPrices = async () => {
      const { data: db } = await supabase.from("products").select("oil_type, pack_size_kg, price").eq("is_active", true);
      if (db && db.length > 0) {
        setProducts(
          PRODUCTS.map((base) => ({
         ...base,
            sizes: base.sizes.map((sz) => {
              const match = (db as any[]).find((d: any) => NORM(String(d.oil_type)) === base.id && Number(d.pack_size_kg) === sz.kg);
              return match? {...sz, price: Number(match.price) } : sz;
            }),
          }))
        );
      }
    };
    loadPrices();
    const loadRatings = async () => {
      const { data: fb } = await supabase.from("feedback").select("product_id, rating").eq("is_public", true).not("product_id", "is", null);
      const { data: prods } = await supabase.from("products").select("id, oil_type");
      const idToBase: Record<string, string> = {};
      (prods || []).forEach((pd: any) => { idToBase[pd.id] = NORM(String(pd.oil_type)); });
      const agg: Record<string, { sum: number; count: number }> = {};
      (fb || []).forEach((f: any) => {
        const base = idToBase[f.product_id];
        if (!base) return;
        if (!agg[base]) agg[base] = { sum: 0, count: 0 };
        agg[base].sum += Number(f.rating) || 0;
        agg[base].count += 1;
      });
      const out: Record<string, { avg: number; count: number }> = {};
      Object.keys(agg).forEach((k) => { out[k] = { avg: agg[k].sum / agg[k].count, count: agg[k].count }; });
      setRatings(out);
    };
    loadRatings();
    // login customer ke saare orders
    const s = localStorage.getItem("akg_customer");
    if (s) {
      try {
        const c = JSON.parse(s);
        if (c.mobile) {
          setCustMobile(c.mobile);
          supabase.from("orders").select("id, order_no, total_amount, order_status, created_at").eq("customer_mobile", c.mobile).order("created_at", { ascending: false }).limit(10).then(({ data }) => { if (data) setMyOrders(data); });
        }
      } catch {}
    }
    const ch = supabase.channel("admin-price-live").on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadPrices()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  const FAYDE = lang === "hi"
 ? [{ icon: "❤", title: "100% शुद्ध & प्राकृतिक", sub: "कोई प्रिजर्वेटिव नहीं • कोल्ड प्रेस्ड" }, { icon: "🌿", title: "ओमेगा-3 से भरपूर", sub: "दिल व इम्यूनिटी के लिए अच्छा" }]
    : [{ icon: "❤", title: "100% Pure & Natural", sub: "No preservatives • Cold pressed" }, { icon: "🌿", title: "Rich in Omega-3", sub: "Good for heart & immunity" }];
  return (
    <div className="px-4 py-4 space-y-5">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-5 text-white flex items-center gap-4 shadow">
        <div className="flex-1">
          <h2 className="text-xl font-bold leading-snug">{lang === "hi"? "शुद्ध कच्ची घानी तेल - भाटी प्रोडक्ट्स" : "Pure Kachchi Ghani Oil - Bhati Products"}</h2>
          <p className="text-xs mt-1 opacity-95">{lang === "hi"? "बिना केमिकल, कोल्हू में पिसाई | जोधपुर रोड, भोपालगढ़" : "No chemicals, traditionally pressed | Jodhpur Road, Bhopalgarh"}</p>
        </div>
        <img src="/products/sesame.webp" alt="oil" className="w-24 h-24 object-cover rounded-2xl bg-white/20" />
      </div>
      {custMobile && myOrders.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-2">📦 {lang === "hi"? "Mere Orders" : "My Orders"} ({myOrders.length})</h2>
          <div className="space-y-2 max-h- overflow-y-auto pr-1">
            {myOrders.map((o) => (
              <a key={o.id} href={`/track?order_no=${o.order_no}`} className="bg-white rounded-2xl p-3 shadow border border-amber-100 flex justify-between items-center block">
                <div><p className="font-bold text-sm">{o.order_no}</p><p className="text- text-gray-500">{new Date(o.created_at).toLocaleDateString("hi-IN")}</p></div>
                <div className="text-right"><p className="font-bold text-sm text-green-700">₹{o.total_amount}</p><p className="text- px-2 py-0.5 rounded-full bg-amber-100 inline-block">{o.order_status}</p></div>
              </a>
            ))}
          </div>
          <a href="/orders" className="text-xs text-orange-600 font-bold mt-1 inline-block">{lang === "hi"? "Saare orders dekho →" : "View all orders →"}</a>
        </div>
      )}
      <div>
        <h2 className="text-base font-bold mb-2">{lang === "hi"? "तेल के फायदे" : "Oil Benefits"}</h2>
        <div className="grid grid-cols-2 gap-3">
          {FAYDE.map((b) => (
            <div key={b.title} className="bg-white rounded-2xl p-4 shadow border border-amber-100">
              <div className="text-3xl mb-1">{b.icon}</div>
              <h3 className="font-bold text-sm">{b.title}</h3>
              <p className="text- text-gray-500 mt-0.5">{b.sub}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-base font-bold mb-2">Shop Products</h2>
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (<ProductCard key={p.id} p={p} rating={ratings[p.id]} />))}
        </div>
      </div>
      <footer className="text-center text-xs text-gray-400 pb-4">आशीर्वाद कच्चर • {lang === "hi"? "शुद्ध तेल, हर घर" : "Pure Oil, Every Home"}</footer>
    </div>
  );
}
