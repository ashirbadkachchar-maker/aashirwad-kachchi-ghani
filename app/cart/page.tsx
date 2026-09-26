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
  const [password, setPassword] = useState("");
  const [custState, setCustState] = useState<null | { exists: boolean; hasPassword: boolean }>(null);
  const [verified, setVerified] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState("");
  const [custMsg, setCustMsg] = useState("");
  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem("akg_cart") || "[]"));
    const s = localStorage.getItem("akg_customer");
    if (s) { try { const c = JSON.parse(s); setMobile(c.mobile || ""); } catch {} }
  }, []);

  const authApi = async (body: any) => {
    const res = await fetch("/api/customer-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json();
    return { ok: res.ok, d };
  };

  const checkMobile = async () => {
    setCustMsg("");
    setVerified(false);
    setCustState(null);
    if (!/^[0-9]{10}$/.test(mobile)) { setCustMsg("⚠️ 10 digit ka mobile number likho"); return; }
    const { ok, d } = await authApi({ action: "check", mobile });
    if (!ok) { setCustMsg("⚠️ " + (d.error || "Check nahi ho paya")); return; }
    if (!d.exists) {
      setCustState({ exists: false, hasPassword: false });
      setCustMsg("🆕 Naya customer — neeche details + password bharke order karo.");
    } else if (d.hasPassword) {
      setCustState({ exists: true, hasPassword: true });
      setCustMsg("👋 Welcome back, " + (d.name || "") + "! Apna password daalo taaki details bhar jayein.");
    } else {
      setCustState({ exists: true, hasPassword: false });
      setCustMsg("👋 Welcome back, " + (d.name || "") + "! Pehli baar password banao (min 4 akshar).");
    }
  };

  const verifyPassword = async () => {
    if (password.length < 4) { setCustMsg("⚠️ Password kam se kam 4 akshar ka rakho"); return; }
    const action = custState?.hasPassword? "login" : "set_password";
    const { ok, d } = await authApi({ action, mobile, password });
    if (!ok) { setCustMsg("⚠️ " + (d.error || "Password sahi nahi hai")); return; }
    const p = await authApi({ action: "get_profile", mobile, password });
    if (p.ok && p.d.profile) {
      const pr = p.d.profile;
      setName(pr.name || ""); setAddress(pr.address || ""); setCity(pr.city || ""); setPincode(pr.pincode || "");
    }
    localStorage.setItem("akg_customer", JSON.stringify(d.customer));
    setVerified(true);
    setCustMsg("✅ Password sahi! Details bhar diye hain.");
  };

  const save = (c: CartItem[]) => { setCart(c); localStorage.setItem("akg_cart", JSON.stringify(c)); };
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Payment verify hone KE BAAD hi order Supabase me save hoga
  const saveToSupabase = async (razorpayPaymentId: string) => {
    if (!custState) throw new Error("Pehle mobile likh ke Check dabao");
    if (!custState.exists && password.length < 4) throw new Error("Naya password banao (min 4 akshar)");
    if (custState.exists &&!verified) throw new Error("Pehle password verify karo");
    let customerId: string | null = null;
    if (!custState.exists) {
      const { ok, d } = await authApi({ action: "register", mobile, name, password, address, city, pincode });
      if (!ok) throw new Error(d.error || "Customer banane me error");
      customerId = d.customer.id;
    } else {
      const { ok, d } = await authApi({ action: "update_profile", mobile, password, name, address, city, pincode });
      if (!ok) throw new Error(d.error || "Profile update me error");
      customerId = d.customer.id;
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
    localStorage.setItem("akg_customer", JSON.stringify({ id: customerId, name, mobile }));
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
    if (!custState) return alert("Pehle mobile number likh ke 🔍 Check dabao");
    if (!custState.exists && password.length < 4) return alert("Naya password banao (min 4 akshar)");
    if (custState.exists &&!verified) return alert("Pehle password verify karo (✅ Verify dabao)");
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
            <button onClick={() => save(cart.filter((_, j) => j!== idx))} className="ml-1">🗑️</button>
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
                       <div className="flex gap-2">
              <input value={mobile} onChange={e => { setMobile(e.target.value); setCustState(null); setVerified(false); }} placeholder="Mobile (10 digit) — isi se login hoga" maxLength={10} inputMode="numeric" className="flex-1 border rounded-xl p-2" />
              <button onClick={checkMobile} className="bg-orange-500 text-white rounded-xl px-3 font-bold text-sm whitespace-nowrap">🔍 Check</button>
            </div>
            {custState && (
              <div className="flex gap-2">
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={custState.exists? (custState.hasPassword? "Apna password daalo" : "Naya password banao (min 4 akshar)") : "Password banao (min 4 akshar)"} className="flex-1 border rounded-xl p-2" />
                {custState.exists &&!verified && <button onClick={verifyPassword} className="bg-green-600 text-white rounded-xl px-3 font-bold text-sm whitespace-nowrap">✅ Verify</button>}
              </div>
            )}
            {custMsg && <p className="text-xs text-gray-600">{custMsg}</p>}
            <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Poora address" className="w-full border rounded-xl p-2" />
            <div className="grid grid-cols-2 gap-2">
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="border rounded-xl p-2" />
              <input value={pincode} onChange={e => setPincode(e.target.value)} placeholder="Pincode" maxLength={6} inputMode="numeric" className="border rounded-xl p-2" />
            </div>
          </div>
          <button onClick={payNow} disabled={placing} className="w-full bg-green-600 text-white rounded-2xl py-3 font-bold text-lg">
            {placing? "Payment ho raha hai..." : `💳 Payment Karo — ₹${total}`}
          </button>
        </>
      )}
    </div>
  );
}
