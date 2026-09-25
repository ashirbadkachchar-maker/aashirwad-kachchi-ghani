"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CartItem = { product_id: string; name: string; pack_size_kg: number; price: number; qty: number; };

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export default function Cart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState("");

  useEffect(() => { setCart(JSON.parse(localStorage.getItem("akg_cart") || "[]")); }, []);

  const save = (c: CartItem[]) => { setCart(c); localStorage.setItem("akg_cart", JSON.stringify(c)); };
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Payment verify hone KE BAAD hi order Supabase me save hoga
  const saveToSupabase = async (razorpayPaymentId: string) => {
    let customerId: string | null = null;
    const { data: existing } = await supabase.from("customers").select("id").eq("mobile", mobile).single();
    if (existing) {
      customerId = existing.id;
      await supabase.from("customers").update({ name, address, city, pincode }).eq("id", customerId);
    } else {
      const { data: ins, error } = await supabase.from("customers").insert({ name, mobile, address, city, pincode }).select("id").single();
      if (error) throw error;
      customerId = ins.id;
    }
    const { data: order, error: oErr } = await supabase.from("orders").insert({
      customer_id: customerId, customer_name: name, customer_mobile: mobile,
      shipping_address: `${address}, ${city} - ${pincode}`,
      total_amount: total, payment_status: "paid",
      razorpay_payment_id: razorpayPaymentId, order_status: "placed",
    }).select("id, order_no").single();
    if (oErr) throw oErr;
        // cart ke "mustard-1kg" jaise id ko products table ke asli uuid se map karo
    const { data: dbProds } = await supabase.from("products").select("id, oil_type, pack_size_kg");
    const NORM2 = (t: string) => {
      const s = (t || "").toLowerCase();
      if (s.includes("mustard") || s.includes("sarso") || s.includes("sarson") || s.includes("peanut")) return "mustard";
      if (s.includes("gud")) return "gud";
      if (s.includes("cheeni") || s.includes("chini")) return "cheeni";
      if (s.includes("sesame") || s.includes("til")) return "sesame";
      return s.trim();
    };
    const findUuid = (cartPid: string) => {
      const m = String(cartPid || "").match(/^(.+)-(\d+)kg$/);
      if (!m) return null;
      const hit = (dbProds || []).find((p: any) =>
        NORM2(p.oil_type) === NORM2(m[1]) && Number(p.pack_size_kg) === Number(m[2]));
      return hit? hit.id : null;
    };
    const { error: itemsErr } = await supabase.from("order_items").insert(cart.map(i => ({
      order_id: order.id, product_id: findUuid(i.product_id), product_name: i.name,
      pack_size_kg: i.pack_size_kg, qty: i.qty, price: i.price,
    })));
    if (itemsErr) throw itemsErr;
    await supabase.from("tracking_events").insert({
      order_id: order.id, status: "placed", note: "Payment ho gaya. Order mil gaya hai.",
    });
    save([]);
    setDone(order.order_no);
  };

  const payNow = async () => {
    if (cart.length === 0) return alert("Cart khaali hai!");
    if (!name.trim()) return alert("Naam likho");
    if (!/^[0-9]{10}$/.test(mobile)) return alert("10 digit ka mobile number likho");
    if (!address.trim()) return alert("Address likho");
    setPlacing(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Payment load nahi hua. Internet check karo.");

      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.map(i => ({ product_id: i.product_id, qty: i.qty })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order banane me error");

      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: "INR",
        name: "आशीर्बाद कच्चर",
        description: "कच्ची घानी शुद्ध तेल",
        order_id: data.orderId,
        prefill: { name, contact: mobile },
        theme: { color: "#f59e0b" },
        handler: async (resp: any) => {
          try {
            const v = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(resp),
            });
            const vd = await v.json();
            if (!vd.ok) throw new Error("Payment verify nahi hua");
            await saveToSupabase(resp.razorpay_payment_id);
          } catch (e: any) { alert("Error: " + e.message); }
          setPlacing(false);
        },
        modal: { ondismiss: () => setPlacing(false) },
      });
      rzp.open();
    } catch (e: any) {
      alert("Error: " + e.message);
      setPlacing(false);
    }
  };

  if (done) return (
    <div className="px-4 py-10 text-center">
      <div className="text-6xl mb-3">✅</div>
      <h2 className="text-xl font-bold text-green-700">Payment Successful!</h2>
      <p className="mt-2">Order No: <b>{done}</b></p>
      <p className="text-sm text-gray-500 mt-1">Track page par apna order track karo 📦</p>
    </div>
  );

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="text-lg font-bold">🛒 Mera Cart</h2>
      {cart.length === 0 && <p className="text-gray-500 text-sm">Cart khaali hai. Home se tel select karo!</p>}
      {cart.map((i, idx) => (
        <div key={idx} className="bg-white rounded-2xl p-3 shadow border border-amber-100 flex justify-between items-center">
          <div>
            <p className="font-bold text-sm">{i.name}</p>
            <p className="text-xs text-gray-500">{i.pack_size_kg} kg × ₹{i.price}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { const c = [...cart]; c[idx].qty = Math.max(1, c[idx].qty - 1); save(c); }} className="w-8 h-8 rounded-full bg-amber-100 font-bold">−</button>
            <span className="font-bold">{i.qty}</span>
            <button onClick={() => { const c = [...cart]; c[idx].qty += 1; save(c); }} className="w-8 h-8 rounded-full bg-amber-100 font-bold">+</button>
            <button onClick={() => save(cart.filter((_, j) => j !== idx))} className="ml-1">🗑️</button>
          </div>
        </div>
      ))}
      {cart.length > 0 && (
        <>
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
            <p className="font-bold text-lg">Total: <span className="text-green-700">₹{total}</span></p>
            <p className="text-xs text-gray-500">🔒 UPI / Card / Netbanking se secure payment</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow border border-amber-100 space-y-2">
            <h3 className="font-bold">📍 Delivery Details</h3>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Aapka naam" className="w-full border rounded-xl p-2" />
            <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="Mobile (10 digit)" maxLength={10} inputMode="numeric" className="w-full border rounded-xl p-2" />
            <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Poora address" className="w-full border rounded-xl p-2" />
            <div className="grid grid-cols-2 gap-2">
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="border rounded-xl p-2" />
              <input value={pincode} onChange={e => setPincode(e.target.value)} placeholder="Pincode" maxLength={6} inputMode="numeric" className="border rounded-xl p-2" />
            </div>
          </div>
          <button onClick={payNow} disabled={placing} className="w-full bg-green-600 text-white rounded-2xl py-3 font-bold text-lg">
            {placing ? "Payment ho raha hai..." : `💳 Payment Karo — ₹${total}`}
          </button>
        </>
      )}
    </div>
  );
}
