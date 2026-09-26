"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "../components/SiteChrome";
const STATUS_HI: Record<string, string> = { placed: "ऑर्डर मिल गया", packed: "पैक हो गया", shipped: "रास्ते में है", delivered: "डिलीवर हो गया", cancelled: "रद्द हो गया" };
const STATUS_EN: Record<string, string> = { placed: "Order placed", packed: "Packed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
const STEPS = ["placed", "packed", "shipped", "delivered"];
const NORM = (t: string) => {
  const s = (t || "").toLowerCase();
  if (s.includes("mustard") || s.includes("sarso") || s.includes("sarson")) return "mustard";
  if (s.includes("peanut") || s.includes("moongfali") || s.includes("mungfali")) return "peanut";
  if (s.includes("gud")) return "gud";
  if (s.includes("cheeni") || s.includes("chini")) return "cheeni";
  if (s.includes("sesame") || s.includes("til")) return "sesame";
  return s.trim();
};
export default function OrdersPage() {
  const { lang } = useLang();
  const [customer, setCustomer] = useState<any>(null);
  const [mobile, setMobile] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, any[]>>({});
  const [err, setErr] = useState("");
  const [stars, setStars] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState<Record<string, string>>({});
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [savingReview, setSavingReview] = useState(false);
  useEffect(() => {
    const s = localStorage.getItem("akg_customer");
    if (s) { try { const c = JSON.parse(s); setCustomer(c); if(c.id) loadOrders(c.id); } catch {} }
  }, []);
  const loadOrders = async (cid: string) => {
    const { data } = await supabase.from("orders").select("id, order_no, total_amount, order_status, created_at, shipping_address").eq("customer_id", cid).order("created_at", { ascending: false });
    if (data) setOrders(data);
  };
  const login = async () => {
    setErr("");
    if (!/^[0-9]{10}$/.test(mobile.trim())) { setErr(lang === "hi"? "10 digit ka mobile number likho" : "Enter 10-digit mobile"); return; }
    const { data } = await supabase.from("customers").select("id, name, mobile").eq("mobile", mobile.trim()).single();
    if (!data) { setErr(lang === "hi"? "Is mobile se koi order nahi mila" : "No orders found"); return; }
    localStorage.setItem("akg_customer", JSON.stringify(data));
    setCustomer(data); loadOrders(data.id);
  };
  const logout = () => { localStorage.removeItem("akg_customer"); setCustomer(null); setOrders([]); setMobile(""); setOpenId(null); setStars({}); setReviewText({}); setReviewed({}); };
  const toggleItems = async (oid: string) => {
    if (openId === oid) { setOpenId(null); return; }
    setOpenId(oid);
    if (localStorage.getItem("akg_reviewed_" + oid)) setReviewed((p) => ({...p, [oid]: true}));
    if (!items[oid]) {
      const { data } = await supabase.from("order_items").select("product_name, pack_size_kg, qty, price").eq("order_id", oid);
      setItems((p) => ({...p, [oid]: data || [] }));
    }
  };
  const submitReview = async (oid: string) => {
    const s = stars[oid] || 0;
    if (!s ||!customer) return;
    setSavingReview(true);
    let orderItems = items[oid] || [];
    if (orderItems.length === 0) {
      const { data } = await supabase.from("order_items").select("product_name, pack_size_kg, qty, price").eq("order_id", oid);
      orderItems = data || [];
    }
    const { data: prods } = await supabase.from("products").select("id, oil_type");
    const txt = (reviewText[oid] || "").trim();
    const rows = orderItems.map((it: any) => {
      const base = NORM(String(it.product_name || ""));
      const match = (prods || []).find((p: any) => NORM(String(p.oil_type)) === base);
      const pname = `${it.product_name || ""}${it.pack_size_kg? ` (${it.pack_size_kg}kg)` : ""}`.trim();
      return {
        customer_name: customer.name,
        rating: s,
        review: pname? `[${pname}] ${txt}` : txt,
        product_id: match? match.id : null,
        is_public: true,
      };
    });
    const toInsert = rows.length > 0? rows : [{
      customer_name: customer.name,
      rating: s,
      review: txt,
      product_id: null,
      is_public: true,
    }];
    const { error } = await supabase.from("feedback").insert(toInsert);
    setSavingReview(false);
    if (!error) {
      localStorage.setItem("akg_reviewed_" + oid, "1");
      setReviewed((p) => ({...p, [oid]: true}));
    } else {
      alert("Review save nahi hua, phir try karo");
    }
  };
  const S = lang === "hi"? STATUS_HI : STATUS_EN;
  if (!customer) {
    return (
      <div className="px-4 py-8 space-y-4">
        <h2 className="text-lg font-bold">📦 {lang === "hi"? "Mere Orders" : "My Orders"}</h2>
        <div className="bg-white rounded-2xl p-4 shadow border border-amber-100 space-y-2">
          <p className="text-sm text-gray-600">{lang === "hi"? "Apna mobile number daalo — saare orders yahin dikhenge" : "Enter mobile to see all orders here"}</p>
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile (10 digit)" maxLength={10} inputMode="numeric" className="w-full border rounded-xl p-2" />
          <button onClick={login} className="w-full bg-orange-500 text-white rounded-xl py-2 font-bold">{lang === "hi"? "Login Karo 🔑" : "Login 🔑"}</button>
          {err && <p className="text-red-500 text-sm">{err}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex justify-between items-center"><h2 className="text-lg font-bold">📦 {lang === "hi"? "Mere Orders" : "My Orders"}</h2><button onClick={logout} className="text-xs text-red-600 font-bold border border-red-200 rounded-full px-3 py-1">Logout</button></div>
      <p className="text-sm text-gray-600">👤 {customer.name} • {customer.mobile}</p>
      {orders.length === 0 && <p className="text-sm text-gray-500">{lang === "hi"? "Abhi koi order nahi hai" : "No orders yet"}</p>}
      {orders.map((o) => {
        const stepIdx = STEPS.indexOf(o.order_status);
        return (
          <div key={o.id} className="bg-white rounded-2xl p-3 shadow border border-amber-100">
            <button onClick={() => toggleItems(o.id)} className="w-full text-left">
              <div className="flex justify-between items-center"><p className="font-bold text-sm">{o.order_no}</p><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${o.order_status === "delivered"? "bg-green-100 text-green-700" : o.order_status === "cancelled"? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>{S[o.order_status] || o.order_status}</span></div>
              <p className="text-xs text-gray-500 mt-0.5">{new Date(o.created_at).toLocaleDateString("en-IN")} • ₹{o.total_amount}</p>
            </button>
            {o.order_status!== "cancelled" && (<div className="flex items-center mt-2 mb-1">{STEPS.map((s, i) => (<div key={s} className="flex-1 flex items-center"><div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= stepIdx? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}>{i <= stepIdx? "✓" : i + 1}</div>{i < STEPS.length - 1 && <div className={`flex-1 h-1 mx-0.5 rounded ${i < stepIdx? "bg-green-500" : "bg-gray-200"}`} />}</div>))}</div>)}
            {openId === o.id && (
              <div className="mt-2 pt-2 border-t border-amber-100 space-y-1">
                {(items[o.id] || []).map((it, j) => (<p key={j} className="text-xs text-gray-600">{it.product_name} ({it.pack_size_kg}kg) × {it.qty} — ₹{it.price * it.qty}</p>))}
                <p className="text-xs text-gray-500">📍 {o.shipping_address}</p>
                <div className="pt-2 mt-1 border-t border-amber-100">
                  {reviewed[o.id]? (
                    <p className="text-center text-green-600 font-bold text-sm py-1">🙏 Review ke liye dhanyavaad!</p>
                  ) : (
                    <div className="space-y-2 py-1">
                      <p className="font-bold text-sm text-center">Apna review do ⭐</p>
                      <div className="flex justify-center gap-1">
                        {[1,2,3,4,5].map((s) => (
                          <button key={s} onClick={() => setStars((p) => ({...p, [o.id]: s}))} className="text-3xl">{s <= (stars[o.id] || 0)? "⭐" : "☆"}</button>
                        ))}
                      </div>
                      <input value={reviewText[o.id] || ""} onChange={(e) => setReviewText((p) => ({...p, [o.id]: e.target.value}))} placeholder="Kuch kehna ho to likho (optional)" className="w-full border rounded-xl p-2 text-sm" />
                      <button onClick={() => submitReview(o.id)} disabled={!(stars[o.id] > 0) || savingReview} className="w-full bg-orange-500 text-white rounded-xl py-2 font-bold text-sm disabled:opacity-50">{savingReview? "Ruko..." : "Review Bhejo"}</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
