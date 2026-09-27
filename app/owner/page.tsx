"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const OWNER_ID = "owner";
const OWNER_PIN = "Abc@12345";

type TabKey = "orders" | "total" | "month" | "today";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "orders", label: "Total Orders", icon: "📦" },
  { key: "total", label: "Total Commission", icon: "💰" },
  { key: "month", label: "Is Mahine", icon: "📅" },
  { key: "today", label: "Aaj", icon: "☀️" },
];

export default function OwnerDashboard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [oid, setOid] = useState("");
  const [opin, setOpin] = useState("");
  const [err, setErr] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [newComm, setNewComm] = useState("");
  const [commValue, setCommValue] = useState("20");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState<TabKey>("total");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("owner_ok") === "1") { setLoggedIn(true); load(); }
  }, []);

  const login = () => {
    if (oid.trim() === OWNER_ID && opin === OWNER_PIN) {
      sessionStorage.setItem("owner_ok", "1");
      sessionStorage.setItem("owner_pin", opin);
      setLoggedIn(true); setErr(""); load();
    } else setErr("❌ Galat ID ya PIN");
  };

  const load = async () => {
    const { data: s } = await supabase.from("platform_settings")
.select("value").eq("key", "commission_per_order").single();
    if (s) { setNewComm(s.value); setCommValue(String(s.value)); }
    const { data: c } = await supabase.from("commissions")
.select("*").order("created_at", { ascending: false }).limit(1000);
    setRows(c || []);
  };

  const saveComm = async () => {
    const v = Number(newComm);
    if (isNaN(v) || v < 0) { alert("Sahi value dalo"); return; }
    if (!confirm(`Har order par commission ₹${v} set karein?`)) return;
    const res = await fetch("/api/owner/set-commission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: v, pin: sessionStorage.getItem("owner_pin") || "" }),
    });
    const j = await res.json();
    if (!res.ok) alert("Error: " + (j.error || "failed"));
    else {
      setCommValue(String(v));
      setShowModal(false);
      alert("✅ Commission save ho gaya — ab se har order par ₹" + v);
    }
  };

  const logout = () => {
    sessionStorage.removeItem("owner_ok");
    sessionStorage.removeItem("owner_pin");
    setLoggedIn(false);
  };

  if (!loggedIn) return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e] px-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl">
        <h2 className="text-lg font-bold text-center">🔐 Owner Login</h2>
        <p className="text-xs text-gray-500 text-center mb-4">Platform Commission Dashboard</p>
        <input value={oid} onChange={(e) => setOid(e.target.value)} placeholder="Owner ID"
          className="w-full border rounded-xl p-2.5 mb-2 text-sm" />
        <input type="password" value={opin} onChange={(e) => setOpin(e.target.value)} placeholder="PIN / Password"
          className="w-full border rounded-xl p-2.5 mb-3 text-sm" onKeyDown={(e) => e.key === "Enter" && login()} />
        {err && <p className="text-xs text-red-600 mb-2 text-center">{err}</p>}
        <button onClick={login} className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-bold text-sm">Login</button>
      </div>
    </div>
  );

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  // Tab ke hisaab se rows filter
  const tabRows = rows.filter((r) => {
    const d = r.created_at.slice(0, 10);
    if (tab === "month" && d.slice(0, 7)!== month) return false;
    if (tab === "today" && d!== today) return false;
    return true;
  });
  // Uske upar date filter
  const f = tabRows.filter((r) => {
    const d = r.created_at.slice(0, 10);
    return (!from || d >= from) && (!to || d <= to);
  });

  const tabSum = f.reduce((s, r) => s + Number(r.commission_amount), 0);
  const tabTitle = tab === "orders"? "Total Orders" : tab === "total"? "Total Commission" : tab === "month"? "Is Mahine" : "Aaj";
  const tabAmount = tab === "orders"? String(f.length) : "₹" + tabSum;

  const downloadCSV = () => {
    const head = ["Date", "Order No", "Order Amount", "Commission"];
    const lines = f.map((r) => [
      new Date(r.created_at).toLocaleString("hi-IN"), r.order_no, r.order_amount, r.commission_amount,
    ]);
    const csv = [head,...lines].map((r) => r.map((v) => `"${String(v?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "commission-report.csv"; a.click();
  };

  return (
    <div className="owner-page flex flex-col overflow-hidden bg-[#f4f4fa]">
      <style>{`
       .owner-page { height: 100vh; height: 100dvh; }
        @media print {
         .no-print { display: none!important; }
         .owner-page { height: auto!important; overflow: visible!important; }
          body { background: #fff; }
        }
      `}</style>

      <div className="max-w-md mx-auto w-full px-4 pt-4 pb-20 flex-1 min-h-0 flex flex-col">
        {/* Title row — fixed */}
        <div className="no-print flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold text-indigo-900">💰 Commission Dashboard</h2>
            <p className="text-xs text-gray-500">Platform Owner • Sirf tumhare liye</p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => { setNewComm(commValue); setShowModal(true); }}
              className="text-xs bg-indigo-100 text-indigo-700 rounded-xl px-3 py-2 font-bold">
              ⚙️ ₹{commValue}
            </button>
            <button onClick={logout} className="text-xs bg-red-100 text-red-600 rounded-xl px-3 py-2 font-bold">Logout</button>
          </div>
        </div>

        <div className="hidden print:block text-center mb-2">
          <h2 className="text-xl font-bold">Commission Report</h2>
          <p className="text-xs text-gray-500">Aashirwad Kachchi Ghani • Platform Owner</p>
        </div>

        {/* Card — flex column, table bachi hui jagah lega */}
        <div className="bg-white rounded-2xl p-4 shadow border border-indigo-100 mt-4 flex-1 min-h-0 flex flex-col">
          <p className="text-sm font-bold text-center text-indigo-900 shrink-0">{tabTitle}</p>
          <p className="text-3xl font-bold text-center text-green-700 my-1 shrink-0">{tabAmount}</p>

          {/* Date filter — From | To | Clear ek line me, barabar size */}
          <div className="no-print mt-2 shrink-0">
            <div className="grid grid-cols-3 gap-2">
              <div className="min-w-0">
                <p className="text-xs mb-0.5">From</p>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                  className="w-full min-w-0 block border rounded-lg p-1.5 text-xs" />
              </div>
              <div className="min-w-0">
                <p className="text-xs mb-0.5">To</p>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                  className="w-full min-w-0 block border rounded-lg p-1.5 text-xs" />
              </div>
              <div className="min-w-0">
                <p className="text-xs mb-0.5">&nbsp;</p>
                <button onClick={() => { setFrom(""); setTo(""); }}
                  className="w-full text-xs bg-gray-100 rounded-lg p-1.5 font-bold">Clear</button>
              </div>
            </div>
          </div>

          {/* Excel / PDF — fixed */}
          <div className="no-print flex gap-2 mt-2 shrink-0">
            <button onClick={downloadCSV} className="flex-1 text-sm bg-green-100 text-green-700 rounded-xl px-3 py-2 font-bold">⬇️ Excel (CSV)</button>
            <button onClick={() => window.print()} className="flex-1 text-sm bg-indigo-100 text-indigo-700 rounded-xl px-3 py-2 font-bold">🖨️ PDF / Print</button>
          </div>

          {/* Table — header fixed (har th par sticky), sirf body scroll */}
          <div className="mt-2 border rounded-xl flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-indigo-900">
                <th className="sticky top-0 z-10 bg-indigo-50 p-2 text-left">Date</th>
                <th className="sticky top-0 z-10 bg-indigo-50 p-2 text-left">Order No</th>
                <th className="sticky top-0 z-10 bg-indigo-50 p-2 text-right">Order ₹</th>
                <th className="sticky top-0 z-10 bg-indigo-50 p-2 text-right">Comm. ₹</th>
              </tr></thead>
              <tbody>
                {f.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{new Date(r.created_at).toLocaleDateString("hi-IN")}</td>
                    <td className="p-2 font-semibold">{r.order_no}</td>
                    <td className="p-2 text-right">₹{r.order_amount}</td>
                    <td className="p-2 text-right font-bold text-green-700">₹{r.commission_amount}</td>
                  </tr>
                ))}
                {f.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">Koi record nahi.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Neeche 4 tabs — fixed */}
      <div className="no-print fixed bottom-0 left-0 right-0 bg-white border-t flex shadow-lg z-40" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-center ${tab === t.key? "text-orange-600 font-bold" : "text-gray-500"}`}>
            <div className="text-xl">{t.icon}</div>
            <div className="text- mt-0.5">{t.label}</div>
          </button>
        ))}
      </div>

      {/* Commission dialogue box */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs space-y-3">
            <h3 className="font-bold text-center">⚙️ Har order par commission (₹)</h3>
            <input type="number" value={newComm} onChange={(e) => setNewComm(e.target.value)}
              placeholder="e.g. 20" className="w-full border rounded-xl p-2.5 text-center text-lg font-bold" />
            <p className="text- text-gray-500 text-center">Deal fix hone ke baad yahan value daal do — uske baad har order par auto-record hoga.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-100 rounded-xl py-2.5 font-bold text-sm">Cancel</button>
              <button onClick={saveComm}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 font-bold text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
