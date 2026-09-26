"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const OWNER_ID = "owner";
const OWNER_PIN = "Abc@12345";

export default function OwnerDashboard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [oid, setOid] = useState("");
  const [opin, setOpin] = useState("");
  const [err, setErr] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [newComm, setNewComm] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("owner_ok") === "1") { setLoggedIn(true); load(); }
  }, []);

  const login = () => {
    if (oid.trim() === OWNER_ID && opin === OWNER_PIN) {
      sessionStorage.setItem("owner_ok", "1");
      setLoggedIn(true); setErr(""); load();
    } else setErr("❌ Galat ID ya PIN");
  };

  const load = async () => {
    const { data: s } = await supabase.from("platform_settings")
     .select("value").eq("key", "commission_per_order").single();
    if (s) setNewComm(s.value);
    const { data: c } = await supabase.from("commissions")
     .select("*").order("created_at", { ascending: false }).limit(1000);
    setRows(c || []);
  };

  const saveComm = async () => {
    const v = Number(newComm);
    if (isNaN(v) || v < 0) { alert("Sahi value dalo"); return; }
    if (!confirm(`Har order par commission ₹${v} set karein?`)) return;
    const { error } = await supabase.from("platform_settings")
     .update({ value: String(v), updated_at: new Date().toISOString() })
     .eq("key", "commission_per_order");
    if (error) alert("Error: " + error.message);
    else alert("✅ Commission save ho gaya — ab se har order par ₹" + v);
  };

  const logout = () => { sessionStorage.removeItem("owner_ok"); setLoggedIn(false); };

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

  const f = rows.filter((r) => {
    const d = r.created_at.slice(0, 10);
    return (!from || d >= from) && (!to || d <= to);
  });
  const totalComm = f.reduce((s, r) => s + Number(r.commission_amount), 0);
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const todayComm = rows.filter((r) => r.created_at.slice(0, 10) === today).reduce((s, r) => s + Number(r.commission_amount), 0);
  const monthComm = rows.filter((r) => r.created_at.slice(0, 7) === month).reduce((s, r) => s + Number(r.commission_amount), 0);

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
    <div className="min-h-screen bg-[#f4f4fa]">
      <style>{`@media print {.no-print { display: none!important; } body { background: #fff; } }`}</style>
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        <div className="no-print flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-indigo-900">💰 Commission Dashboard</h2>
            <p className="text-xs text-gray-500">Platform Owner • Sirf tumhare liye</p>
          </div>
          <button onClick={logout} className="text-xs bg-red-100 text-red-600 rounded-xl px-3 py-2 font-bold">Logout</button>
        </div>

        <div className="hidden print:block text-center mb-2">
          <h2 className="text-xl font-bold">Commission Report</h2>
          <p className="text-xs text-gray-500">Aashirwad Kachchi Ghani • Platform Owner</p>
        </div>

        <div className="no-print bg-white rounded-2xl p-4 shadow border border-indigo-100">
          <p className="text-sm font-bold mb-2">⚙️ Har order par commission (₹)</p>
          <div className="flex gap-2">
            <input type="number" value={newComm} onChange={(e) => setNewComm(e.target.value)}
              placeholder="e.g. 20" className="flex-1 border rounded-xl p-2 text-sm" />
            <button onClick={saveComm} className="bg-indigo-600 text-white rounded-xl px-4 text-sm font-bold">Save</button>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Deal fix hone ke baad yahan value daal do — uske baad har order par auto-record hoga.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[["Total Orders", f.length, "text-indigo-900"], ["Total Commission", "₹" + totalComm, "text-green-700"],
            ["Is Mahine", "₹" + monthComm, "text-amber-600"], ["Aaj", "₹" + todayComm, "text-blue-700"]].map(([l, v, c]) => (
            <div key={l as string} className="bg-white rounded-2xl p-3 shadow border text-center">
              <p className={`text-xl font-bold ${c}`}>{v}</p>
              <p className="text-xs text-gray-500">{l}</p>
            </div>
          ))}
        </div>

        <div className="no-print bg-white rounded-2xl p-3 shadow border flex gap-2 items-end">
          <label className="text-xs flex-1">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border rounded-lg p-1.5 mt-0.5" /></label>
          <label className="text-xs flex-1">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border rounded-lg p-1.5 mt-0.5" /></label>
          <button onClick={() => { setFrom(""); setTo(""); }} className="text-xs bg-gray-100 rounded-lg px-3 py-2 font-bold">Clear</button>
        </div>

        <div className="no-print flex gap-2">
          <button onClick={downloadCSV} className="flex-1 text-sm bg-green-100 text-green-700 rounded-xl px-3 py-2.5 font-bold">⬇️ Excel (CSV)</button>
          <button onClick={() => window.print()} className="flex-1 text-sm bg-indigo-100 text-indigo-700 rounded-xl px-3 py-2.5 font-bold">🖨️ PDF / Print</button>
        </div>

        <div className="bg-white rounded-2xl shadow border overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="bg-indigo-50 text-indigo-900">
              <th className="p-2 text-left">Date</th><th className="p-2 text-left">Order No</th>
              <th className="p-2 text-right">Order ₹</th><th className="p-2 text-right">Comm. ₹</th>
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
        <p className="no-print text-center text-[11px] text-gray-400 pb-6">🔒 Ye page kahin link nahi hai — sirf tumhe pata hai: <b>/owner</b></p>
      </div>
    </div>
  );
}
