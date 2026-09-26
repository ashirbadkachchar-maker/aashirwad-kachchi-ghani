"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAdmin, logoutAdmin } from "@/lib/admin";

const STATUS_HI: Record<string, string> = {
  placed: "🧾 Naya Order",
  packed: "📦 Packed",
  dispatched: "🚚 Dispatched",
  in_transit: "🛣️ Raste Me",
  delivered: "✅ Delivered",
  cancelled: "❌ Cancelled",
};
const NEXT_STATUS = ["packed", "dispatched", "in_transit", "delivered"];

function AdminDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [admin, setAdmin] = useState<any>(null);
  const [tab, setTab] = useState<"orders" | "products" | "feedback">("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<Record<string, any[]>>({});
  const [products, setProducts] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const a = getAdmin();
    if (!a) { router.push("/admin/login"); return; }
    setAdmin(a);
    loadAll();
  }, []);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "orders" || t === "products" || t === "feedback") setTab(t);
  }, [searchParams]);

  const loadAll = async () => {
    const { data: o } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
    setOrders(o || []);
    const { data: p } = await supabase.from("products").select("*").order("oil_type").order("pack_size_kg");
    setProducts(p || []);
    const { data: f } = await supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(200);
    setFeedback(f || []);
  };

  const loadItems = async (orderId: string) => {
    if (items[orderId]) return;
    const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
    setItems((prev) => ({...prev, [orderId]: data || [] }));
  };

  const updateStatus = async (order: any, status: string) => {
    if (!confirm(`Order ${order.order_no} ko "${STATUS_HI[status]}" mark karein?`)) return;
    await supabase.from("orders").update({ order_status: status }).eq("id", order.id);
    await supabase.from("tracking_events").insert({
      order_id: order.id, status, note: "Seller ne update kiya",
    });
    loadAll();
  };

  const updateProduct = async (p: any) => {
    const { error } = await supabase.from("products").update({
      price: Number(p.price), stock_qty: parseInt(p.stock_qty) || 0, is_active: p.is_active,
    }).eq("id", p.id);
    if (error) alert("Error: " + error.message);
    else alert("Product update ho gaya ✅");
    loadAll();
  };

  const downloadCSV = () => {
    const rows = [["Order No", "Date", "Customer", "Mobile", "Address", "Amount", "Payment", "Status"]];
    orders.forEach((o) =>
      rows.push([
        o.order_no, new Date(o.created_at).toLocaleString("hi-IN"), o.customer_name,
        o.customer_mobile, o.shipping_address || "", o.total_amount, o.payment_status, o.order_status,
      ])
    );
    const csv = rows.map((r) => r.map((v) => `"${String(v?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "orders.csv";
    a.click();
  };

  if (!admin) return <p className="p-4">Loading...</p>;

  const shown = filter === "all"? orders : orders.filter((o) => o.order_status === filter);
  const totalSales = orders.filter((o) => o.payment_status === "paid")
   .reduce((s, o) => s + Number(o.total_amount), 0);
  const pending = orders.filter((o) => o.order_status === "placed").length;

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">👨‍💼 आशीर्बाद कच्चर</h2>
          <p className="text-xs text-gray-500">Seller Dashboard • Namaste, {admin.name}</p>
        </div>
        <button onClick={logoutAdmin} className="text-sm bg-red-100 text-red-600 rounded-xl px-3 py-2 font-bold">
          Logout
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 shadow border text-center">
          <p className="text-xl font-bold">{orders.length}</p>
          <p className="text-xs text-gray-500">Total Orders</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow border text-center">
          <p className="text-xl font-bold text-green-700">₹{totalSales}</p>
          <p className="text-xs text-gray-500">Total Sales</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow border text-center">
          <p className="text-xl font-bold text-amber-600">{pending}</p>
          <p className="text-xs text-gray-500">Naye Orders</p>
        </div>
      </div>

      {tab === "orders" && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[["all", "Sab"], ["placed", "Naye"], ["packed", "Packed"], ["dispatched", "Dispatched"],
              ["in_transit", "Raste Me"], ["delivered", "Delivered"]].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`whitespace-nowrap text-xs rounded-full px-3 py-1 font-bold ${filter === k? "bg-amber-500 text-white" : "bg-white border"}`}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={downloadCSV} className="text-sm bg-green-100 text-green-700 rounded-xl px-3 py-2 font-bold">
            ⬇️ Excel (CSV) Download
          </button>
          <div className="space-y-2">
            {shown.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl p-3 shadow border border-amber-100">
                <div className="flex justify-between items-center"
                  onClick={() => { setOpen(open === o.id? null : o.id); loadItems(o.id); }}>
                  <div>
                    <p className="font-bold text-sm">{o.order_no} <span className="text-green-700">₹{o.total_amount}</span></p>
                    <p className="text-xs text-gray-500">{o.customer_name} • {o.customer_mobile}</p>
                  </div>
                  <span className="text-xs font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-1">
                    {STATUS_HI[o.order_status]}
                  </span>
                </div>
                {open === o.id && (
                  <div className="mt-2 pt-2 border-t text-sm space-y-1">
                    <p className="text-xs text-gray-500">📍 {o.shipping_address}</p>
                    <p className="text-xs text-gray-500">💳 Payment: {o.payment_status}{o.razorpay_payment_id? ` (${o.razorpay_payment_id})` : ""}</p>
                    {(items[o.id] || []).map((it) => (
                      <p key={it.id} className="text-xs">• {it.product_name} — {it.pack_size_kg}kg × {it.qty} = ₹{it.price * it.qty}</p>
                    ))}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {NEXT_STATUS.filter((s) => s!== o.order_status).map((s) => (
                        <button key={s} onClick={() => updateStatus(o, s)}
                          className="text-xs bg-green-600 text-white rounded-xl px-3 py-2 font-bold">
                          {STATUS_HI[s]} ✓
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {shown.length === 0 && <p className="text-sm text-gray-500">Koi order nahi.</p>}
          </div>
        </>
      )}

      {tab === "products" && (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-3 shadow border border-amber-100">
              <p className="font-bold text-sm">{p.name} — {p.pack_size_kg}kg</p>
              <div className="grid grid-cols-3 gap-2 mt-2 items-end">
                <label className="text-xs">Price ₹
                  <input type="number" value={p.price}
                    onChange={(e) => setProducts(products.map((x) => x.id === p.id? {...x, price: e.target.value } : x))}
                    className="w-full border rounded-lg p-1" />
                </label>
                <label className="text-xs">Stock
                  <input type="number" value={p.stock_qty}
                    onChange={(e) => setProducts(products.map((x) => x.id === p.id? {...x, stock_qty: e.target.value } : x))}
                    className="w-full border rounded-lg p-1" />
                </label>
                <label className="text-xs">Active?
                  <input type="checkbox" checked={p.is_active}
                    onChange={(e) => setProducts(products.map((x) => x.id === p.id? {...x, is_active: e.target.checked } : x))}
                    className="w-5 h-5 block mt-1" />
                </label>
              </div>
              <button onClick={() => updateProduct(p)}
                className="mt-2 text-xs bg-amber-500 text-white rounded-xl px-3 py-2 font-bold">
                Save ✅
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "feedback" && (
        <div className="space-y-2">
          {feedback.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl p-3 shadow border border-amber-100">
              <p className="text-sm font-bold">{f.customer_name}{" "}
                <span className="text-amber-500">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</span>
              </p>
              <p className="text-sm text-gray-600">{f.review}</p>
              <p className="text-xs text-gray-400">{new Date(f.created_at).toLocaleString("hi-IN")}</p>
            </div>
          ))}
          {feedback.length === 0 && <p className="text-sm text-gray-500">Abhi koi feedback nahi.</p>}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<p className="p-4">Loading...</p>}>
      <AdminDashboardInner />
    </Suspense>
  );
}
