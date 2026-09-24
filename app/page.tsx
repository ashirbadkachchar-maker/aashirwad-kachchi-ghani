"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Product = { id: string; name: string; oil_type: string; pack_size_kg: number; price: number; mrp: number; benefits: string; };
type Review = { id: string; customer_name: string; rating: number; review: string; };

const CATS = [
  { type: "mustard", title: "सरसों तेल", icon: "🫗" },
  { type: "peanut", title: "मूंगफली तेल", icon: "🥜" },
  { type: "til_gud", title: "तिल कच्चर (गुड़)", icon: "🟤" },
  { type: "til_cheeni", title: "तिल कच्चर (चीनी)", icon: "⚪" },
];
const iconFor = (t: string) => CATS.find((c) => c.type === t)?.icon || "🫗";

const BENEFITS = [
  { icon: "🫗", title: "सरसों तेल (कच्ची घानी)",
    points: ["❤️ Omega-3 — dil ke liye faydemand", "🛡️ Immunity badhaye", "🍳 Asli sarson ka tez swad"] },
  { icon: "🥜", title: "मूंगफली तेल (कोल्ड प्रेस्ड)",
    points: ["✨ Vitamin E se bharpur", "🔥 High smoke point — talne ke liye best", "💪 MUFA — heart friendly"] },
  { icon: "🟤", title: "तिल कच्चर (गुड़)",
    points: ["🌾 Til + shuddh gud ka sangam", "🔥 Sardi me sharir ko garmahat", "🦴 Calcium & iron se bharpur"] },
  { icon: "⚪", title: "तिल कच्चर (चीनी)",
    points: ["🍬 Meetha swad, sabka pasandeeda", "⚡ Energy se bharpur nashta", "🌾 Til ke poshak tatva"] },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("products").select("*").eq("is_active", true).order("pack_size_kg");
      if (data) setProducts(data);
      const { data: fb } = await supabase.from("feedback").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(10);
      if (fb) setReviews(fb);
    })();
  }, []);

  const addToCart = (p: Product) => {
    const cart = JSON.parse(localStorage.getItem("akg_cart") || "[]");
    const found = cart.find((c: any) => c.product_id === p.id);
    if (found) found.qty += 1;
    else cart.push({ product_id: p.id, name: p.name, pack_size_kg: p.pack_size_kg, price: p.price, qty: 1 });
    localStorage.setItem("akg_cart", JSON.stringify(cart));
    alert("Cart me add ho gaya! 🛒");
  };

  const card = (p: Product) => (
    <div key={p.id} className="bg-white rounded-2xl shadow p-4 border border-amber-100">
      <div className="text-4xl mb-2">{iconFor(p.oil_type)}</div>
      <h3 className="font-bold text-sm">{p.name}</h3>
      <p className="text-xs text-gray-500">{p.pack_size_kg} kg Pack</p>
      <p className="mt-1"><span className="text-lg font-bold text-green-700">₹{p.price}</span> <span className="line-through text-xs text-gray-400">₹{p.mrp}</span></p>
      <div className="flex gap-2 mt-3">
        <Link href={`/product/${p.id}`} className="flex-1 text-center text-xs border border-amber-500 text-amber-700 rounded-xl py-2 font-semibold">Details</Link>
        <button onClick={() => addToCart(p)} className="flex-1 text-xs bg-amber-500 text-white rounded-xl py-2 font-bold">Add 🛒</button>
      </div>
    </div>
  );

  return (
    <div className="px-4 py-4 space-y-6">
      <div className="bg-gradient-to-r from-amber-500 to-yellow-400 rounded-3xl p-6 text-white text-center">
        <div className="text-5xl mb-2">🪔</div>
        <h2 className="text-2xl font-bold">कच्ची घानी शुद्ध तेल</h2>
        <p className="text-sm mt-1 opacity-95">भाटी प्रोडक्ट — bina chemical, seedha aapke ghar</p>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-2">🌿 Hamare Products ke Fayde</h2>
        <div className="grid grid-cols-2 gap-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="bg-white rounded-2xl p-4 shadow border border-amber-100">
              <div className="text-3xl mb-1">{b.icon}</div>
              <h3 className="font-bold text-sm">{b.title}</h3>
              <ul className="text-xs text-gray-600 mt-1 space-y-1">
                {b.points.map((pt) => <li key={pt}>{pt}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {CATS.map((c) => {
        const list = products.filter((p) => p.oil_type === c.type);
        if (list.length === 0) return null;
        return (
          <div key={c.type}>
            <h2 className="text-lg font-bold mb-2">{c.icon} {c.title}</h2>
            <div className="grid grid-cols-2 gap-3">{list.map(card)}</div>
          </div>
        );
      })}

      <div>
        <h2 className="text-lg font-bold mb-2">⭐ Customer Reviews (Sabke liye open)</h2>
        {reviews.length === 0 && <p className="text-sm text-gray-500">Abhi koi review nahi — pehla review aap de sakte ho!</p>}
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-3 shadow border border-amber-100">
              <p className="text-sm font-bold">{r.customer_name} <span className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span></p>
              <p className="text-sm text-gray-600">{r.review}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center text-xs text-gray-400 pb-4">आशीर्बाद कच्चर • कच्ची घानी शुद्ध तेल, भाटी प्रोडक्ट</footer>
    </div>
  );
}
