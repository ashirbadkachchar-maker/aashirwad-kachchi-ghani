"use client";
import { useState } from "react";
import Link from "next/link";

export default function AdminSetup() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const setup = async () => {
    setErr(""); setMsg(""); setBusy(true);
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mobile, password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Setup fail");
      setMsg("Admin ban gaya! ✅ Ab login karo.");
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="px-4 py-10">
      <div className="bg-white rounded-3xl shadow p-6 border border-amber-100">
        <div className="text-4xl text-center mb-2">👨‍💼</div>
        <h2 className="text-xl font-bold text-center mb-1">Pehla Seller Account</h2>
        <p className="text-xs text-gray-500 text-center mb-4">Ye page sirf ek baar kaam karega</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aapka naam"
          className="w-full border rounded-xl p-3 mb-2" />
        <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile (10 digit)"
          maxLength={10} inputMode="numeric" className="w-full border rounded-xl p-3 mb-2" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 6 char)" className="w-full border rounded-xl p-3 mb-3" />
        {err && <p className="text-red-500 text-sm mb-2">{err}</p>}
        {msg && <p className="text-green-600 text-sm mb-2 font-bold">{msg}</p>}
        <button onClick={setup} disabled={busy}
          className="w-full bg-green-600 text-white rounded-2xl py-3 font-bold mb-3">
          {busy ? "Ban raha hai..." : "Admin Banao ✅"}
        </button>
        <Link href="/admin/login" className="block text-center text-sm text-amber-700 font-bold">
          Login page par jao →
        </Link>
      </div>
    </div>
  );
}
