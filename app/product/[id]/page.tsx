"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const iconFor = (t: string) =>
  ({ mustard: "🫗", peanut: "🥜", til_gud: "🟤", til_cheeni: "⚪" } as Record<string, string>)[t] || "🫗";

export default function ProductDetail() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [p, setP] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("products").select("*").eq("id", id).single();
      if (data) setP(data);
      const { data: fb } = await supabase.from("feedback").select("*").eq("product_id", id).eq("is_public", true).order("created_at", { ascending: false });
      if (fb) setReviews(fb);
    })();
  }, [id]);

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("akg_cart") || "[]");
    const found = cart.find((c: any) => c.product_id === p.id);
    if (found) found.qty += qty;
    else cart.push({ product_id: p.id, name: p.name, pack_size_kg: p.pack_size_kg, price: p.price, qty });
    localStorage.setItem("akg_cart", JSON.stringify(cart));
    router.push("/cart");
  };

  if (!p) return <p className="p-4">Loading...</p>;

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="bg-white rounded-3xl shadow p-6 border border-amber-100 text-center">
        <div className="text-6xl mb-2">{iconFor(p.oil_type)}</div>
        <h2 className="text-xl font-bold">{p.name}</h2>
        <p className="text-gray-500">{p.pack_size_kg} kg Pack</p>
        <p className="mt-2"><span className="text-2xl font-bold text-green-700">₹{p.price}</span> <span className="line-through text-gray-400">₹{p.mrp}</span></p>
        <p className="text-sm text-gray-600 mt-3 text-left">🌿 <b>Fayde:</b> {p.benefits}</p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-full bg-amber-100 text-xl font-bold">−</button>
          <span className="text-xl font-bold">{qty}</span>
          <button onClick={() => setQty(qty + 1)} className="w-10 h-10 rounded-full bg-amber-100 text-xl font-bold">+</button>
        </div>
        <button onClick={addToCart} className="w-full mt-4 bg-amber-500 text-white rounded-2xl py-3 font-bold text-lg">Cart me Daalo 🛒</button>
      </div>
      <div>
        <h3 className="font-bold mb-2">⭐ Reviews</h3>
        {reviews.length === 0 && <p className="text-sm text-gray-500">Abhi koi review nahi.</p>}
        {reviews.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl p-3 shadow border border-amber-100 mb-2">
            <p className="text-sm font-bold">{r.customer_name} <span className="text-amber-500">{"★".repeat(r.rating)}</span></p>
            <p className="text-sm text-gray-600">{r.review}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
