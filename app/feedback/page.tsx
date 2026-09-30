"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "../components/SiteChrome";

const PROD_NAME_HI: Record<string, string> = {
  mustard: "सरसों का तेल",
  sesame: "तिल का तेल",
  gud: "तिल-गुड़ कच्चर",
  cheeni: "तिल-चीनी कच्चर",
};
const PROD_NAME_EN: Record<string, string> = {
  mustard: "Mustard Oil",
  sesame: "Sesame Oil",
  gud: "Sesame Jaggery Chikki",
  cheeni: "Sesame Sugar Chikki",
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
const CHIP_PRODUCTS = [
  { baseId: "mustard", img: "/products/mustard.webp" },
  { baseId: "sesame", img: "/products/sesame.webp" },
  { baseId: "gud", img: "/products/gud.webp" },
  { baseId: "cheeni", img: "/products/cheeni.webp" },
];
const getVoter = () => {
  let v = localStorage.getItem("akg_voter");
  if (!v) {
    v = "v" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("akg_voter", v);
  }
  return v;
};

export default function FeedbackPage() {
  const ctx: any = useLang();
  const lang = ctx?.lang || "hi";
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [prodMap, setProdMap] = useState<Record<string, { baseId: string; img: string; pack: any }>>({});
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [myVotes, setMyVotes] = useState<Record<string, boolean>>({});
  const [starFilter, setStarFilter] = useState(0);
  const [sortBy, setSortBy] = useState<"new" | "helpful">("new");
  const [prodFilter, setProdFilter] = useState("");

  const PN = lang === "hi"? PROD_NAME_HI : PROD_NAME_EN;

  useEffect(() => {
    const load = async () => {
      const { data: fb } = await supabase
      .from("feedback")
      .select("id, customer_name, rating, review, product_id, created_at, photo_url")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(100);

      const { data: prods } = await supabase.from("products").select("id, oil_type, pack_size_kg");
      const map: Record<string, { baseId: string; img: string; pack: any }> = {};
      (prods || []).forEach((p: any) => {
        const baseId = NORM(p.oil_type);
        map[p.id] = { baseId, img: IMG_MAP[baseId] || "/products/mustard.webp", pack: p.pack_size_kg };
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

  const baseOf = (r: any) => prodMap[r.product_id]?.baseId || "mustard";

  const prodFiltered = useMemo(() => {
    if (!prodFilter) return allReviews;
    return allReviews.filter((r) => baseOf(r) === prodFilter);
  }, [allReviews, prodFilter, prodMap]);

  const avg = useMemo(() => {
    if (!prodFiltered.length) return 0;
    return prodFiltered.reduce((s, r) => s + (Number(r.rating) || 0), 0) / prodFiltered.length;
  }, [prodFiltered]);

  const shown = useMemo(() => {
    const list = starFilter === 0? [...prodFiltered] : prodFiltered.filter((r) => Number(r.rating) === starFilter);
    if (sortBy === "helpful") list.sort((a, b) => (votes[String(b.id)] || 0) - (votes[String(a.id)] || 0));
    return list;
  }, [prodFiltered, starFilter, sortBy, votes]);

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString(lang === "hi"? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return ""; }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* sticky filter block — scroll me nahi chhupega */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-4 pt-3 pb-2.5 border-b border-amber-100 shadow-sm space-y-2.5">
        <h2 className="text-base font-bold">💬 {lang === "hi"? "Sabhi Customer Reviews" : "All Customer Reviews"} ({allReviews.length})</h2>
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          <button onClick={() => setProdFilter("")} className="flex flex-col items-center gap-0.5 shrink-0 w-16">
            <span className={"w-11 h-11 rounded-xl border-2 flex items-center justify-center text-[10px] font-bold " + (prodFilter === ""? "border-orange-500 ring-2 ring-orange-200 bg-orange-100 text-orange-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{lang === "hi"? "सभी" : "All"}</span>
            <span className="text-[9px] font-bold text-gray-600 leading-tight text-center h-7">{lang === "hi"? "सभी" : "All"}</span>
          </button>
          {CHIP_PRODUCTS.map((c) => {
            const active = prodFilter === c.baseId;
            return (
              <button key={c.baseId} onClick={() => setProdFilter(c.baseId)} className="flex flex-col items-center gap-0.5 shrink-0 w-16">
                <img src={c.img} alt={PN[c.baseId]} className={"w-11 h-11 rounded-xl object-cover border-2 " + (active? "border-orange-500 ring-2 ring-orange-200" : "border-amber-200")} />
                <span className="text-[9px] font-bold text-gray-600 leading-tight text-center h-7 overflow-hidden">{PN[c.baseId]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          {[0, 5, 4, 3, 2, 1].map((s) => (
            <button key={s} onClick={() => setStarFilter(s)}
              className={"text-xs px-3 py-1.5 rounded-full border font-bold " + (starFilter === s? "bg-orange-500 text-white border-orange-500" : "border-amber-300 text-amber-700 bg-white")}>
              {s === 0? (lang === "hi"? "Sab" : "All") : `${s}★`}
            </button>
          ))}
          <button onClick={() => setSortBy(sortBy === "new"? "helpful" : "new")}
            className="text-xs px-3 py-1.5 rounded-full border font-bold border-amber-300 text-amber-700 bg-white ml-auto">
            {sortBy === "new"? (lang === "hi"? "🆕 Naye pehle" : "🆕 Newest first") : (lang === "hi"? "👍 Helpful pehle" : "👍 Most helpful")}
          </button>
        </div>
      </div>

      {/* scrolling content */}
      <div className="px-4 py-4 space-y-3">
        {prodFiltered.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2 flex items-center gap-2.5">
            <p className="text-2xl font-bold text-amber-600">{avg.toFixed(1)}</p>
            <div>
              <p className="text-amber-500 font-bold">{"★".repeat(Math.round(avg))}{"☆".repeat(5 - Math.round(avg))}</p>
              <p className="text-[11px] text-gray-500">{prodFilter? `${PN[prodFilter]} — ` : ""}{prodFiltered.length} {lang === "hi"? "verified reviews par based" : "verified reviews"}</p>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500">{lang === "hi"? "Product par click karke uske reviews dekho!" : "Click a product to see its reviews!"}</p>

        <div className="space-y-3">
          {shown.map((r) => {
            const prod = prodMap[r.product_id];
            const baseId = prod?.baseId || "mustard";
            const label = (PN[baseId] || baseId) + (prod?.pack? ` (${prod.pack}kg)` : "");
            const key = String(r.id);
            const hc = votes[key] || 0;
            const mine =!!myVotes[key];
            return (
              <div key={r.id} className="bg-white rounded-2xl p-3 shadow border border-amber-100">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-bold text-sm truncate">{r.customer_name || "Customer"}</p>
                  <p className="text-amber-500 text-sm shrink-0">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                </div>
                <p className="text-[11px] text-green-700 font-bold mt-0.5">{lang === "hi"? "✓ Verified Kharidar" : "✓ Verified Buyer"}</p>
                <p className="text-xs text-green-700 font-semibold mt-0.5">📦 {label}</p>
                <p className="text-sm text-gray-700 mt-1 leading-snug">{r.review}</p>
                {r.photo_url && (
                  <img src={r.photo_url} alt="customer photo" className="w-24 h-24 rounded-xl object-cover border border-amber-200 mt-2" />
                )}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-gray-400">{fmtDate(r.created_at)}</p>
                  <button onClick={() => toggleHelpful(r.id)} disabled={mine}
                    className={"text-[11px] font-bold px-2.5 py-1 rounded-full border " + (mine? "bg-green-100 border-green-300 text-green-700" : "border-amber-300 text-amber-700 bg-white")}>
                    👍 Helpful{hc > 0? ` (${hc})` : ""}
                  </button>
                </div>
              </div>
            );
          })}
          {shown.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-10">
              {allReviews.length === 0
              ? (lang === "hi"? "Abhi koi review nahi — pehla review aap de sakte ho!" : "No reviews yet — be the first to review!")
                : prodFilter && prodFiltered.length === 0
                ? (lang === "hi"? "Is product ka abhi koi review nahi hai." : "No reviews for this product yet.")
                  : (lang === "hi"? "Is rating ka koi review nahi mila." : "No reviews found with this rating.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
