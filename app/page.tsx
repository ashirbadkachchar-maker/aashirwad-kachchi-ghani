"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = { 
  id: string; 
  name: string; 
  oil_type: string; 
  pack_size_kg: number; 
  price: number; 
  mrp?: number;
  is_active?: boolean;
};

const CATS: Record<string, { title: string; icon: string }> = {
  mustard: { title: "सरसों का तेल", icon: "🫗" },
  peanut: { title: "मूंगफली तेल", icon: "🥜" },
  til: { title: "तिल का तेल", icon: "🌿" },
  sesame: { title: "तिल का तेल", icon: "🌿" },
  til_gud: { title: "तिल कच्चर (गुड़)", icon: "🟤" },
  til_cheeni: { title: "तिल कच्चर (चीनी)", icon: "⚪" },
  gud: { title: "तिल कच्चर (गुड़)", icon: "🟤" },
  cheeni: { title: "तिल कच्चर (चीनी)", icon: "⚪" },
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selIdx, setSelIdx] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("pack_size_kg", { ascending: true });
    if (!error && data) {
      setProducts(data as Product[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    // realtime: admin price change turant dikhega
    const ch = supabase.channel("products-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        fetchProducts();
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // oil_type se group karo
  const grouped: Record<string, Product[]> = {};
  products.forEach(p => {
    const key = p.oil_type || "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  const addToCart = (variant: Product) => {
    const cart = JSON.parse(localStorage.getItem("akg_cart") || "[]");
    const found = cart.find((c: any) => c.product_id === variant.id);
    if (found) found.qty += 1;
    else cart.push({ 
      product_id: variant.id, 
      name: variant.name, 
      pack_size_kg: variant.pack_size_kg, 
      price: variant.price, 
      qty: 1 
    });
    localStorage.setItem("akg_cart", JSON.stringify(cart));
    alert("कार्ट में जुड़ गया! - " + variant.name + " " + variant.pack_size_kg + "kg");
  };

  if (loading) return <div className="p-10 text-center">Loading products...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Shop Products - Live Price from Admin</h1>
      <p className="text-sm text-gray-500 mb-6">Admin ( /admin ) me price change karte hi yahan turant update hoga (realtime).</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(grouped).map(([type, variants]) => {
          const v = variants.sort((a,b)=>a.pack_size_kg-b.pack_size_kg);
          const idx = selIdx[type] || 0;
          const selected = v[Math.min(idx, v.length-1)] || v[0];
          const cat = CATS[type] || { title: type, icon: "📦" };
          return (
            <div key={type} className="border rounded-2xl p-4 shadow-sm">
              <div className="text-lg font-bold">{cat.icon} {cat.title}</div>
              <div className="flex gap-2 mt-3">
                {v.map((vv, i) => (
                  <button 
                    key={vv.id}
                    onClick={()=> setSelIdx({...selIdx, [type]: i})}
                    className={"px-3 py-1 rounded-full border text-sm " + (i===idx ? "bg-orange-500 text-white border-orange-500" : "bg-white")}
                  >
                    {vv.pack_size_kg}kg
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <span className="text-xl font-bold">₹{selected?.price}</span>
                {selected?.mrp && selected.mrp > selected.price && (
                  <span className="ml-2 line-through text-gray-400 text-sm">₹{selected.mrp}</span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">{selected?.name}</div>
              <button 
                onClick={()=> selected && addToCart(selected)}
                className="mt-3 w-full bg-orange-500 text-white rounded-xl py-2 font-bold"
              >
                Add - ₹{selected?.price}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
