import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const NORM = (t: string) => {
  const s = (t||"").toLowerCase().trim();
  if (["mustard","sarso","sarson","peanut"].includes(s)) return "mustard";
  if (["sesame","til"].includes(s)) return "sesame";
  if (["gud","til_gud","til-gud"].includes(s)) return "gud";
  if (["cheeni","chini","til_cheeni","til-cheeni"].includes(s)) return "cheeni";
  return s;
};

// backup only if DB fail ho jaye
const FALLBACK: Record<string, number> = {
  "mustard-1kg": 199, "mustard-2kg": 379, "mustard-5kg": 899,
  "sesame-1kg": 259, "sesame-2kg": 479, "sesame-5kg": 1099,
  "til-1kg": 259, "gud-1kg": 299, "gud-2kg": 549,
  "cheeni-1kg": 279, "cheeni-2kg": 519,
};

export async function POST(req: Request) {
  try {
    const { items } = await req.json();
    if (!items || !Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: "Cart khaali hai" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Live products - sab fields lo
    const { data: dbProducts, error } = await supabase.from("products").select("id, oil_type, pack_size_kg, price");
    if (error) console.log("Supabase fetch error", error);

    const byId: Record<string, number> = {};
    const byOilKg: Record<string, number> = {};

    (dbProducts || []).forEach((p: any) => {
      const price = Number(p.price);
      byId[String(p.id)] = price;
      const norm = NORM(String(p.oil_type||""));
      const key = norm + "-" + String(p.pack_size_kg) + "kg";
      byOilKg[key.toLowerCase()] = price;
      // sarso alias ke liye bhi
      byOilKg[(p.oil_type||"").toLowerCase() + "-" + String(p.pack_size_kg) + "kg"] = price;
    });

    let total = 0;
    for (const it of items) {
      const pid = String(it.product_id || "").trim();
      const qty = Math.max(1, Math.min(100, parseInt(it.qty) || 1));
      // 1) pehle UUID se, 2) phir oilType-kg se, 3) phir fallback
      let price = byId[pid] ?? byOilKg[pid.toLowerCase()] ?? FALLBACK[pid.toLowerCase()];
      if (!price) {
        return NextResponse.json({ error: "Galat product: '" + pid + "' ka daam nahi mila. Admin me product active hai kya?" }, { status: 400 });
      }
      total += price * qty;
    }

    const amountPaise = Math.round(total * 100);

    const auth = Buffer.from(
      (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "") + ":" + (process.env.RAZORPAY_KEY_SECRET || "")
    ).toString("base64");

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Razorpay keys Vercel me set nahi hain" }, { status: 500 });
    }

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + auth },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: "akg_" + Date.now() }),
    });
    const order = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: order.error?.description || "Razorpay error: " + JSON.stringify(order) }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: amountPaise,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
