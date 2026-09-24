"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const STEPS = [
  { key: "placed", label: "Order Mil Gaya", icon: "🧾" },
  { key: "packed", label: "Pack Ho Gaya", icon: "📦" },
  { key: "dispatched", label: "Bhej Diya", icon: "🚚" },
  { key: "in_transit", label: "Raste Me Hai", icon: "🛣️" },
  { key: "delivered", label: "Pahunch Gaya", icon: "✅" },
];

export default function Track() {
  const [orderNo, setOrderNo] = useState("");
  const [mobile, setMobile] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [err, setErr] = useState("");

  const search = async () => {
    setErr(""); setOrder(null);
    const { data, error } = await supabase.from("orders").select("*")
      .eq("order_no", orderNo.trim().toUpperCase()).eq("customer_mobile", mobile.trim()).single();
    if (error || !data) { setErr("Order nahi mila. Order No aur mobile check karo."); return; }
    setOrder(data);
    const { data: ev } = await supabase.from("tracking_events").select("*").eq("order_id", data.id).order("created_at", { ascending: true });
    setEvents(ev || []);
  };

  const currentIdx = STEPS.findIndex(s => s.key === order?.order_status);

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="text-lg font-bold">📦 Order Tracking</h2>
      <div className="bg-white rounded-2xl p-4 shadow border border-amber-100 space-y-2">
        <input value={orderNo} onChange={e => setOrderNo(e.target.value)} placeholder="Order No (jaise AKC-000001)" className="w-full border rounded-xl p-2 uppercase" />
        <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="Mobile number" maxLength={10} inputMode="numeric" className="w-full border rounded-xl p-2" />
        <button onClick={search} className="w-full bg-amber-500 text-white rounded-xl py-2 font-bold">Track Karo 🔍</button>
        {err && <p className="text-red-500 text-sm">{err}</p>}
      </div>
      {order && (
        <div className="bg-white rounded-2xl p-4 shadow border border-amber-100">
          <p className="font-bold">{order.order_no}</p>
          <p className="text-sm text-gray-500">₹{order.total_amount} • {order.customer_name}</p>
          <div className="mt-4">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${i <= currentIdx ? "bg-green-100 border-2 border-green-500" : "bg-gray-100"}`}>{s.icon}</div>
                  {i < STEPS.length - 1 && <div className={`w-1 ${i < currentIdx ? "bg-green-500" : "bg-gray-200"}`} style={{ minHeight: 24 }} />}
                </div>
                <div className="pb-4">
                  <p className={`font-bold text-sm ${i <= currentIdx ? "text-green-700" : "text-gray-400"}`}>{s.label}</p>
                  {events.filter(e => e.status === s.key).map(e => (
                    <p key={e.id} className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString("hi-IN")}{e.note ? ` • ${e.note}` : ""}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
