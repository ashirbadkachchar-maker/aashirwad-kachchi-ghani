"use client";
import { useEffect, useState } from "react";
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

export default function FeedbackPage() {
  const router = useRouter();
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [prodMap, setProdMap] = useState<Record<string, { label: string; baseId: string; img: string }>>({});

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
    };
    load();
  }, []);

  return (
    <div className="px-4 py-4 space-y-4 max-w- mx-auto">
      <h2 className="text-lg font-bold">💬 Sabhi Customer Reviews ({allReviews.length})</h2>
      <p className="text-xs text-gray-500">Delivery ke baad verified customers ke reviews — photo par click karke product dekho!</p>

      <div className="space-y-3 max-h- overflow-y-auto pr-1">
        {allReviews.map((r) => {
          const prod = prodMap[r.product_id];
          const baseId = prod?.baseId || "mustard";
          const img = prod?.img || IMG_MAP.mustard;
          const label = prod?.label || "Product";

          return (
            <div key={r.id} className="bg-white rounded-2xl p-3 shadow border border-amber-100">
              {/* PHOTO - star rating ke upar */}
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
                  <p className="text-xs text-green-700 font-semibold mt-0.5">📦 {label}</p>
                  <p className="text-sm text-gray-700 mt-1 leading-snug">{r.review}</p>
                </div>
              </div>
            </div>
          );
        })}
        {allReviews.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-10">Abhi koi review nahi — pehla review aap de sakte ho!</p>
        )}
      </div>
    </div>
  );
}
