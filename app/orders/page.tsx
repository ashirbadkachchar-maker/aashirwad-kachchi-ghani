"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "../components/SiteChrome";
const STATUS_HI: Record<string, string> = { placed: "ऑर्डर मिल गया", packed: "पैक हो गया", shipped: "रास्ते में है", delivered: "डिलीवर हो गया", cancelled: "रद्द हो गया" };
const STATUS_EN: Record<string, string> = { placed: "Order placed", packed: "Packed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
const STEPS = ["placed", "packed", "shipped", "delivered"];
export default function OrdersPage() {
  const { lang } = useLang();
  const [customer, setCustomer] = useState<any>(null);
  const [mobile, setMobile] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, any[]>>({});
  const [err, setErr] = useState("");
  useEffect(() => {
    const s = localStorage.getItem("akg_customer");
    if (s) { try { const c = JSON.parse(s); setCustomer(c); if(c.id) loadOrders(c.id); else if(c.mobile) loadByMobile(c.mobile); } catch {} }
  }, []);
  const loadOrders = async (cid: string) => {
    const { data } = await supabase.from("orders").select("id, order_no, total_amount, order_status, created_at, shipping_address").eq("customer_id", cid).order("created_at", { ascending: false });
    if (data) setOrders(data);
  };
  const loadByMobile = async (mob: string) => {
    const { data } = await supabase.from("orders").select("id, order_no, total_amount, order_status, created_at, shipping_address").eq("customer_mobile", mob).order("created_at", { ascending: false });
    if (data) setOrders(data);
  };
  const login = async () => {
    setErr("");
    if (!/^[0-9]{10}$/.test(mobile.trim())) { setErr(lang === "hi"? "10 digit ka mobile number likho" : "Enter 10-digit mobile number"); return; }
    const { data } = await supabase.from("customers").select("id, name, mobile").eq("mobile", mobile.trim()).single();
    if (!data) { setErr(lang === "hi"? "Is mobile se koi order nahi mila" : "No orders found"); return; }
    localStorage.setItem("akg_customer", JSON.stringify(data));
    setCustomer(data); loadOrders(data.id);
  };
  const logout = () => { localStorage.removeItem("akg_customer"); setCustomer(null); setOrders([]); setMobile(""); setOpenId(null); };
  const toggleItems = async (oid: string) => {
    if (openId === oid) { setOpenId(null); return; }
    setOpenId(oid);
    if (!items[oid]) {
      const { data } = await supabase.from("order_items").select("product_name, pack_size_kg, qty, price").eq("order_id", oid);
      setItems((p) => ({...p, [oid]: data || [] }));
    }
  };
  const S = lang === "hi"? STATUS_HI : STATUS_EN;
  if (!customer) {
    return (
      <div className="px-4 py-8 space-y-4">
        <h2 className="text-lg font-bold">📦 {lang === "hi"? "Mere Orders" : "My Orders"}</h2>
        <div className="bg-white rounded-2xl p-4 shadow border border-amber-100 space-y-2">
          <p className="text-sm text-gray-600">{lang === "hi"? "Mobile daalo — saare orders dikhenge" : "Enter mobile to see all orders"}</p>
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile (10 digit)" maxLength={10} inputMode="numeric" className="w-full border rounded-xl p-2" />
          <button onClick={login} className="w-full bg-orange-500 text-white rounded-xl py-2 font-bold">Login Karo 🔑</button>
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
            {o.order_status!== "cancelled" && (<div className="flex items-center mt-2 mb-1">{STEPS.map((s, i) => (<div key={s} className="flex-1 flex items-center"><div className={`w-5 h-5 rounded-full flex items-center justify-center text- font-bold ${i <= stepIdx? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}>{i <= stepIdx? "✓" : i + 1}</div>{i < STEPS.length - 1 && <div className={`flex-1 h-1 mx-0.5 rounded ${i < stepIdx? "bg-green-500" : "bg-gray-200"}`} />}</div>))}</div>)}
            {openId === o.id && (<div className="mt-2 pt-2 border-t border-amber-100 space-y-1">{(items[o.id] || []).map((it, j) => (<p key={j} className="text-xs text-gray-600">{it.product_name} ({it.pack_size_kg}kg) × {it.qty} — ₹{it.price * it.qty}</p>))}<p className="text-xs text-gray-500">📍 {o.shipping_address}</p></div>)}
          </div>
        );
      })}
    </div>
  );
}
