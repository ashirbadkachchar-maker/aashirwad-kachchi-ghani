"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function FeedbackPage() {
  const [orderNo, setOrderNo] = useState("");
  const [mobile, setMobile] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [its, setIts] = useState<any[]>([]);
  const [productId, setProductId] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const find = async () => {
    setErr(""); setOrder(null); setDone(false);
    const { data } = await supabase.from("orders").select("*")
      .eq("order_no", orderNo.trim().toUpperCase())
      .eq("customer_mobile", mobile.trim()).single();
    if (!data) { setErr("Order nahi mila. Order No aur mobile check karo."); return; }
    if (data.order_status !== "delivered") {
      setErr("Feedback delivery ke baad hi de sakte ho. Abhi status: " + data.order_status);
      return;
    }
    setOrder(data);
    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", data.id);
    setIts(items || []);
    if (items && items.length > 0) setProductId(items[0].product_id);
  };

  const submit = async () => {
    if (!review.trim()) return alert("Review likho");
    const { error } = await supabase.from("feedback").insert({
      order_id: order.id, customer_id: order.customer_id, customer_name: order.customer_name,
      product_id: productId, rating, review, is_public: true,
    });
    if (error) return alert("Error: " + error.message);
    setDone(true);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="text-lg font-bold">⭐ Feedback Do</h2>
      <p className="text-xs text-gray-500">Delivery ke baad apna review do — ye sabko dikhega!</p>

      {!order && !done && (
        <div className="bg-white rounded-2xl p-4 shadow border border-amber-100 space-y-2">
          <input value={orderNo} onChange={(e) => setOrderNo(e.target.value)}
            placeholder="Order No (jaise AKC-000001)"
            className="w-full border rounded-xl p-2 uppercase" />
          <input value={mobile} onChange={(e) => setMobile(e.target.value)}
            placeholder="Mobile number" maxLength={10} inputMode="numeric"
            className="w-full border rounded-xl p-2" />
          <button onClick={find} className="w-full bg-amber-500 text-white rounded-xl py-2 font-bold">
            Order Dhundo 🔍
          </button>
          {err && <p className="text-red-500 text-sm">{err}</p>}
        </div>
      )}

      {order && !done && (
        <div className="bg-white rounded-2xl p-4 shadow border border-amber-100 space-y-3">
          <p className="font-bold text-sm">{order.order_no} ✅ Delivered</p>
          <div>
            <p className="text-xs font-bold mb-1">Kis product ka review?</p>
            <select value={productId} onChange={(e) => setProductId(e.target.value)}
              className="w-full border rounded-xl p-2">
              {its.map((it) => (
                <option key={it.id} value={it.product_id}>{it.product_name} — {it.pack_size_kg}kg</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs font-bold mb-1">Rating</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((r) => (
                <button key={r} onClick={() => setRating(r)}
                  className={`text-3xl ${r <= rating ? "text-amber-500" : "text-gray-300"}`}>★</button>
              ))}
            </div>
          </div>
          <textarea value={review} onChange={(e) => setReview(e.target.value)}
            placeholder="Tel kaisa laga? Swad, packing, delivery..." rows={4}
            className="w-full border rounded-xl p-2" />
          <button onClick={submit} className="w-full bg-green-600 text-white rounded-2xl py-3 font-bold">
            Feedback Bhejo ⭐
          </button>
        </div>
      )}

      {done && (
        <div className="text-center py-10">
          <div className="text-6xl mb-3">🙏</div>
          <h2 className="text-xl font-bold text-green-700">Dhanyavaad!</h2>
          <p className="text-sm text-gray-500 mt-1">Aapka review sabko dikhega ⭐</p>
        </div>
      )}
    </div>
  );
}
