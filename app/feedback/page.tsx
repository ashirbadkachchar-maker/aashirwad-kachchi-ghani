"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PROD_NAME: Record<string, string> = {
  mustard: "सरसों का तेल",
  sesame: "तिल का तेल",
  gud: "तिल-गुड़ कच्चर",
  cheeni: "तिल-चीनी कच्चर",
};
const IMG_MAP: Record<string, string> = {
  mustard: "/products/mustard.webp",
  sesame: "/products/sesame.webp",
  gud: "/products/gud.webp",
  cheeni: "/products/cheeni.webp",
  peanut: "/products/mustard.webp",
};
const NORM = (t: string) => {
  const s = (t || "").toLowerCase();
  if (s.includes("mustard") || s.includes("sarso") || s.includes("sarson") || s.includes("peanut")) return "mustard";
  if (s.includes("gud")) return "gud";
  if (s.includes("cheeni") || s.includes("chini")) return "cheeni";
  if (s.includes("sesame") || s.includes("til")) return "sesame";
  return s.trim();
};
// ek browser = ek vote (dobara vote nahi)
const getVoter = () => {
  let v = localStorage.getItem("akg_voter");
  if (!v) {
    v = "v" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("akg_voter", v);
  }
  return v;
};

export default function FeedbackPage() {
  const router = useRouter();
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [prodMap, setProdMap] = useState<Record<string, { label: string; baseId: string; img: string }>>({});
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [myVotes, setMyVotes] = useState<Record<string, boolean>>({});
  const [starFilter, setStarFilter] = useState(0);
  const [sortBy, setSortBy] = useState<"new" | "helpful">("new");

  useEffect(() => {
    const load = async () => {
      const { data: fb } = await supabase
       .from("feedback")
       .select("id, customer_name, rating, review, product_id, created_at")
       .eq("is_public", true)
       .order("created_at", { ascending: false })
       .limit(100);

      const { data: prods } = await supabase.from("products").select("id, oil_type, pack_size_kg");
      const map: Record<string, { label: string; baseId: string; img: string }> = {};
      (prods || []).forEach((p: any) => {
        const baseId = NORM(p.oil_type);
        map[p.id] = {
          label: (PROD_NAME[baseId] || p.oil_type) + " (" + p.pack_size_kg + "kg)",
          baseId,
          img: IMG_MAP[baseId] || "/products/mustard.webp",
        };
      });
      setProdMap(map);
      if (fb) setAllReviews(fb);

      const { data: v } = await supabase.from("feedback_votes").select("feedback_id");
      const vc: Record<string, number> = {};
      (v || []).forEach((x: any) => { const k = String(x.feedback_id); vc[k] = (vc[k] || 0) + 1; });
      setVotes(vc);
      try { setMyVotes(JSON.parse(localStorage.getItem("akg_my_votes") || "{}")); } catch {}
    };
    load();
  }, []);

  const toggleHelpful = async (fid: any) => {
    const key = String(fid);
    if (myVotes[key]) return;
    const { error } = await supabase.from("feedback_votes").insert({ feedback_id: key, voter: getVoter() });
    if (!error) {
      setVotes((p) => ({...p, [key]: (p[key] || 0) + 1 }));
      const nm = {...myVotes, [key]: true };
      setMyVotes(nm);
      localStorage.setItem("akg_my_votes", JSON.stringify(nm));
    }
  };

  const avg = useMemo(() => {
    if (!allReviews.length) return 0;
    return allReviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / allReviews.length;
  }, [allReviews]);

  const shown = useMemo(() => {
    const list = starFilter === 0? [...allReviews] : allReviews.filter((r) => Number(r.rating) === starFilter);
    if (sortBy === "helpful") list.sort((a, b) => (votes[String(b.id)] || 0) - (votes[String(a.id)] || 0));
    return list;
  }, [allReviews, starFilter, sortBy, votes]);

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("hi-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return ""; }
  };

  return (
    <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold">💬 Sabhi Customer Reviews ({allReviews.length})</h2>

      {allReviews.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
          <p className="text-3xl font-bold text-amber-600">{avg.toFixed(1)}</p>
          <div>
            <p className="text-amber-500 font-bold">{"★".repeat(Math.round(avg))}{"☆".repeat(5 - Math.round(avg))}</p>
            <p className="text-[11px] text-gray-500">{allReviews.length} verified reviews par based</p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">Delivery ke baad verified customers ke reviews — photo par click karke product dekho!</p>

      <div className="flex gap-1.5 flex-wrap items-center">
        {[0, 5, 4, 3, 2, 1].map((s) => (
          <button key={s} onClick={() => setStarFilter(s)}
            className={"text-xs px-3 py-1.5 rounded-full border font-bold " + (starFilter === s? "bg-orange-500 text-white border-orange-500" : "border-amber-300 text-amber-700 bg-white")}>
            {s === 0? "Sab" : `${s}★`}
          </button>
        ))}
        <button onClick={() => setSortBy(sortBy === "new"? "helpful" : "new")}
          className="text-xs px-3 py-1.5 rounded-full border font-bold border-amber-300 text-amber-700 bg-white ml-auto">
          {sortBy === "new"? "🆕 Naye pehle" : "👍 Helpful pehle"}
        </button>
      </div>

      <div className="space-y-3">
        {shown.map((r) => {
          const prod = prodMap[r.product_id];
          const baseId = prod?.baseId || "mustard";
          const img = prod?.img || IMG_MAP.mustard;
          const label = prod?.label || "Product";
          const key = String(r.id);
          const hc = votes[key] || 0;
          const mine =!!myVotes[key];
          return (
            <div key={r.id} className="bg-white rounded-2xl p-3 shadow border border-amber-100">
              <div className="flex gap-3">
                <img
                  src={img}
                  alt={label}
                  onClick={() => router.push(`/?go=${baseId}`)}
                  className="w-20 h-20 rounded-xl object-cover cursor-pointer hover:opacity-80 border border-amber-200 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-sm truncate">{r.customer_name || "Customer"}</p>
                    <p className="text-amber-500 text-sm shrink-0">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                  </div>
                  <p className="text-[11px] text-green-700 font-bold mt-0.5">✓ Verified Kharidar</p>
                  <p className="text-xs text-green-700 font-semibold mt-0.5">📦 {label}</p>
                  <p className="text-sm text-gray-700 mt-1 leading-snug">{r.review}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[11px] text-gray-400">{fmtDate(r.created_at)}</p>
                    <button onClick={() => toggleHelpful(r.id)} disabled={mine}
                      className={"text-[11px] font-bold px-2.5 py-1 rounded-full border " + (mine? "bg-green-100 border-green-300 text-green-700" : "border-amber-300 text-amber-700 bg-white")}>
                      👍 Helpful{hc > 0? ` (${hc})` : ""}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {shown.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-10">
            {allReviews.length === 0? "Abhi koi review nahi — pehla review aap de sakte ho!" : "Is rating ka koi review nahi mila."}
          </p>
        )}
      </div>
    </div>
  );
}
