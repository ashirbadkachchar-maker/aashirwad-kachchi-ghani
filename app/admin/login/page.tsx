"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const login = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Login fail");
      localStorage.setItem("akg_admin", JSON.stringify(d.admin));
      router.push("/admin");
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="px-4 py-10">
      <div className="bg-white rounded-3xl shadow p-6 border border-amber-100">
        <div className="text-4xl text-center mb-2">🔐</div>
        <h2 className="text-xl font-bold text-center mb-4">Seller Login</h2>
        <input
          value={mobile} onChange={(e) => setMobile(e.target.value)}
          placeholder="Mobile number" maxLength={10} inputMode="numeric"
          className="w-full border rounded-xl p-3 mb-2"
        />
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" className="w-full border rounded-xl p-3 mb-3"
        />
        {err && <p className="text-red-500 text-sm mb-2">{err}</p>}
        <button onClick={login} disabled={busy}
          className="w-full bg-amber-500 text-white rounded-2xl py-3 font-bold">
          {busy ? "Login ho raha hai..." : "Login 🔓"}
        </button>
      </div>
    </div>
  );
}
