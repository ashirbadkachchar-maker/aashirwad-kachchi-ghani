"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TabKey = "orders" | "total" | "month" | "today";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "orders", label: "Total Orders", icon: "📦" },
  { key: "total", label: "Total Commission", icon: "💰" },
  { key: "month", label: "Is Mahine", icon: "📅" },
  { key: "today", label: "Aaj", icon: "☀️" },
];

export default function OwnerPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [lid, setLid] = useState("");
  const [lpw, setLpw] = useState("");
  const [tab, setTab] = useState<TabKey>("total");
  const [records, setRecords] = useState<any[]>([]);
  const [comm, setComm] = useState("20");
  const [modal, setModal] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("owner_pin") === "Abc@12345") setLoggedIn(true);
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    const load = async () => {
      const { data: s } = await supabase.from("platform_settings")
       .select("value").eq("key", "commission_per_order").single();
      if (s?.value) setComm(String(s.value));
      const { data: r } = await supabase.from("commissions")
       .select("*").order("created_at", { ascending: false });
      setRecords(r || []);
    };
    load();
  }, [loggedIn]);

  const doLogin = () => {
    if (lid === "owner" && lpw === "Abc@12345") {
      sessionStorage.setItem("owner_pin", "Abc@12345");
      setLoggedIn(true);
    } else alert("Galat ID ya password");
  };

  const logout = () => {
    sessionStorage.removeItem("owner_pin");
    setLoggedIn(false);
  };

  const now = new Date();
  const isThisMonth = (d: string) => {
    const x = new Date(d);
    return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear();
  };
  const isToday = (d: string) => new Date(d).toDateString() === now.toDateString();

  const totalOrders = records.length;
  const totalComm = records.reduce((a, r) => a + Number(r.commission_amount || 0), 0);
  const monthComm = records.filter(r => isThisMonth(r.created_at))
   .reduce((a, r) => a + Number(r.commission_amount || 0), 0);
  const todayComm = records.filter(r => isToday(r.created_at))
   .reduce((a, r) => a + Number(r.commission_amount || 0), 0);

  let list = [...records];
  let tabTitle = "", tabAmount = "";
  if (tab === "orders") { tabTitle = "Total Orders"; tabAmount = String(totalOrders); }
  else if (tab === "total") { tabTitle = "Total Commission"; tabAmount = "₹" + totalComm; }
  else if (tab === "month") {
    tabTitle = "Is Mahine"; tabAmount = "₹" + monthComm;
    list = list.filter(r => isThisMonth(r.created_at));
  } else {
    tabTitle = "Aaj"; tabAmount = "₹" + todayComm;
    list = list.filter(r => isToday(r.created_at));
  }

  if (from) list = list.filter(r => new Date(r.created_at) >= new Date(from));
  if (to) list = list.filter(r => new Date(r.created_at) <= new Date(to + "T23:59:59"));

  const saveComm = async () => {
    const v = Number(newVal);
    if (isNaN(v) || v < 0) { setMsg("Sahi value daalo"); return; }
    const res = await fetch("/api/owner/set-commission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: v, pin: sessionStorage.getItem("owner_pin") || "" }),
    });
    const j = await res.json();
    if (j.ok) {
      setComm(String(v));
      setModal(false);
      setMsg("Commission save ho gaya — ab se har order par ₹" + v);
      setTimeout(() => setMsg(""), 3000);
    } else setMsg(j.error || "Save nahi hua");
  };

  const downloadCSV = () => {
    const rows: string[][] = [["Order No", "Date", "Order Amount", "Commission"]];
    list.forEach(r => rows.push([
      String(r.order_no || ""),
      new Date(r.created_at).toLocaleString("en-IN"),
      String(r.order_amount || 0),
      String(r.commission_amount || 0)
    ]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "commission-" + tab + ".csv";
    a.click();
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50 p-4">
        <div className="bg-white rounded-3xl shadow p-6 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-center">🔒 Owner Login</h1>
          <input className="w-full border rounded-2xl p-3" placeholder="ID"
            value={lid} onChange={e => setLid(e.target.value)} />
          <input className="w-full border rounded-2xl p-3" placeholder="Password" type="password"
            value={lpw} onChange={e => setLpw(e.target.value)} />
          <button onClick={doLogin}
            className="w-full bg-orange-500 text-white rounded-2xl p-3 font-bold">Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header — login/lang toggle hataya, commission button lagaya */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 flex items-center justify-between text-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="w-12 h-12 rounded-full bg-white/20 object-cover" />
          <div>
            <h1 className="text-xl font-bold">आशीर्वाद कच्चर</h1>
            <p className="text-xs opacity-90">शुद्ध तेल, हर घर</p>
          </div>
        </div>
        <button onClick={() => { setNewVal(comm); setModal(true); }}
          className="bg-white/20 rounded-full px-4 py-2 text-sm font-bold">
          ⚙️ ₹{comm}
        </button>
      </div>

      {/* Title */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-indigo-900">💰 Commission Dashboard</h2>
          <p className="text-sm text-gray-500">Platform Owner • Sirf tumhare liye</p>
        </div>
        <button onClick={logout}
          className="bg-red-100 text-red-600 rounded-2xl px-4 py-2 font-bold text-sm">Logout</button>
      </div>

      {msg && <div className="mx-4 mb-2 bg-green-100 text-green-700 rounded-2xl p-3 text-sm font-bold">{msg}</div>}

      {/* Beech ka dynamic card — tab ka naam + amount + poori list */}
      <div className="mx-4 bg-white rounded-3xl shadow p-5">
        <h3 className="text-lg font-bold text-center">{tabTitle}</h3>
        <p className="text-4xl font-bold text-center text-indigo-900 my-2">{tabAmount}</p>
        <div className="mt-3 max-h-80 overflow-y-auto divide-y">
          {list.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Koi record nahi</p>}
          {list.map(r => (
            <div key={r.id} className="py-2 flex justify-between text-sm">
              <div>
                <p className="font-bold">{r.order_no}</p>
                <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString("en-IN")}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600">₹{r.order_amount}</p>
                <p className="font-bold text-green-700">+₹{r.commission_amount}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Date filter — size fix (50-50, no overlap) */}
      <div className="mx-4 mt-4 bg-white rounded-3xl shadow p-4">
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <label className="text-sm font-bold">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full bg-gray-100 rounded-2xl p-3 mt-1" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-sm font-bold">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="w-full bg-gray-100 rounded-2xl p-3 mt-1" />
          </div>
        </div>
        <button onClick={() => { setFrom(""); setTo(""); }}
          className="mt-2 w-full bg-gray-100 rounded-2xl p-2 font-bold text-sm">Clear</button>
      </div>

      {/* Excel / PDF */}
      <div className="mx-4 mt-4 flex gap-2">
        <button onClick={downloadCSV}
          className="flex-1 bg-green-100 text-green-700 rounded-2xl p-3 font-bold">⬇️ Excel (CSV)</button>
        <button onClick={() => window.print()}
          className="flex-1 bg-indigo-100 text-indigo-700 rounded-2xl p-3 font-bold">🖨️ PDF / Print</button>
      </div>

      {/* Neeche 4 tabs — sirf naam, koi number nahi */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex shadow-lg">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-center ${tab === t.key? "text-orange-600 font-bold" : "text-gray-500"}`}>
            <div className="text-2xl">{t.icon}</div>
            <div className="text-xs mt-1">{t.label}</div>
          </button>
        ))}
      </div>

      {/* Commission dialogue box */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-center">⚙️ Har order par commission (₹)</h3>
            <input type="number" value={newVal} onChange={e => setNewVal(e.target.value)}
              className="w-full border rounded-2xl p-3 text-xl font-bold text-center" placeholder="20" />
            <p className="text-xs text-gray-500 text-center">
              Deal fix hone ke baad yahan value daal do — uske baad har order par auto-record hoga.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setModal(false)}
                className="flex-1 bg-gray-100 rounded-2xl p-3 font-bold">Cancel</button>
              <button onClick={saveComm}
                className="flex-1 bg-indigo-600 text-white rounded-2xl p-3 font-bold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
