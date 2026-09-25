"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = { id: string; name: string; oil_type: string; pack_size_kg: number; price: number; mrp?: number; is_active: boolean; benefits?: string };
type Review = { id: string; customer_name: string; rating: number; review: string };

const CATS = [
  { type: "mustard", title: "सरसों तेल", icon: "🫗" },
  { type: "peanut", title: "मूंगफली तेल", icon: "🥜" },
  { type: "til", title: "तिल का तेल", icon: "🌿" },
  { type: "sesame", title: "तिल का तेल", icon: "🌿" },
  { type: "til_gud", title: "तिल कच्चर (गुड़)", icon: "🟤" },
  { type: "til_cheeni", title: "तिल कच्चर (चीनी)", icon: "⚪" },
  { type: "gud", title: "तिल कच्चर (गुड़)", icon: "🟤" },
  { type: "cheeni", title: "तिल कच्चर (चीनी)", icon: "⚪" },
];

const BENEFITS = [
  { icon: "🫗", title: "सरसों तेल (कच्ची घानी)", points: ["❤️ Omega-3 — dil ke liye faydemand", "🛡️ Immunity badhaye", "🍳 Asli sarson ka tez swad"] },
  { icon: "🌿", title: "तिल का तेल", points: ["✨ Calcium se bharpur", "💪 Haddiyon ke liye best", "🔥 Thand me garmahat"] },
  { icon: "🟤", title: "तिल कच्चर (गुड़)", points: ["🌾 Til + shuddh gud ka sangam", "🔥 Sardi me sharir ko garmahat", "🦴 Calcium & iron se bharpur"] },
  { icon: "⚪", title: "तिल कच्चर (चीनी)", points: ["🍬 Meetha swad, sabka pasandeeda", "⚡ Energy se bharpur nashta", "🌾 Til ke poshak tatva"] },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sel, setSel] = useState<Record<string, number>>({});

  const load = async () => {
    const { data: prod } = await supabase.from("products").select("*").eq("is_active", true).order("pack_size_kg");
    if (prod) setProducts(prod as Product[]);
    const { data: fb } = await supabase.from("feedback").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(10);
    if (fb) setReviews(fb as Review[]);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("live-products").on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const grouped: Record<string, Product[]> = {};
  products.forEach(p => {
    const key = p.oil_type || "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  const addToCart = (p: Product) => {
    const cart = JSON.parse(localStorage.getItem("akg_cart") || "[]");
    const found = cart.find((c:any) => c.product_id === p.id);
    if (found) found.qty += 1;
    else cart.push({ product_id: p.id, name: p.name, pack_size_kg: p.pack_size_kg, price: p.price, qty: 1 });
    localStorage.setItem("akg_cart", JSON.stringify(cart));
    alert("कार्ट में जुड़ गया! " + p.name + " " + p.pack_size_kg + "kg - ₹" + p.price);
  };

  return (
    <div className="min-h-screen bg-[#fef9ef]">
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-3xl font-extrabold text-center mt-4">आशीर्वाद कच्ची घानी</h1>
        <p className="text-center text-gray-600 mt-1">शुद्धता का आशीर्वाद, हर बूंद में</p>
        
        <h2 className="text-xl font-bold mt-8 mb-3">Shop Products <span className="text-xs font-normal text-green-600">(Live - Admin price change = instant update)</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Object.entries(grouped).map(([type, vars]) => {
            const list = vars.sort((a,b)=>a.pack_size_kg-b.pack_size_kg);
            const idx = sel[type] ?? 0;
            const curr = list[Math.min(idx, list.length-1)];
            const cat = CATS.find(c=>c.type===type);
            if (!curr) return null;
            return (
              <div key={type} className="bg-white rounded-[20px] p-4 shadow-sm border border-orange-100">
                <div className="flex items-center gap-2 font-bold text-[15px]"><span className="text-xl">{cat?.icon || "📦"}</span> {curr.name || cat?.title}</div>
                <div className="flex gap-2 mt-3">
                  {list.map((v,i)=>(
                    <button key={v.id} onClick={()=> setSel({...sel, [type]: i})} className={"px-3 py-1 rounded-full border text-sm font-medium " + (i===idx ? "bg-orange-500 text-white border-orange-500" : "bg-white border-gray-200")}>{v.pack_size_kg}kg</button>
                  ))}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold">₹{curr.price}</span>
                  {curr.mrp && curr.mrp > curr.price && <span className="line-through text-gray-400 text-sm">₹{curr.mrp}</span>}
                </div>
                <button onClick={()=> addToCart(curr)} className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 font-bold text-sm">Add - ₹{curr.price}</button>
              </div>
            );
          })}
        </div>

        <h2 className="text-xl font-bold mt-10 mb-3">Fayde</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BENEFITS.map((b,i)=>(
            <div key={i} className="bg-white rounded-2xl p-4 border">
              <div className="font-bold">{b.icon} {b.title}</div>
              <ul className="mt-2 text-sm text-gray-700 space-y-1">{b.points.map((p,j)=><li key={j}>{p}</li>)}</ul>
            </div>
          ))}
        </div>

        {reviews.length>0 && (
          <>
            <h2 className="text-xl font-bold mt-10 mb-3">Customer Reviews</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reviews.map(r=>(
                <div key={r.id} className="bg-white rounded-xl p-3 border text-sm"><b>{r.customer_name}</b> - ⭐{r.rating}<div className="mt-1 text-gray-600">{r.review}</div></div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
