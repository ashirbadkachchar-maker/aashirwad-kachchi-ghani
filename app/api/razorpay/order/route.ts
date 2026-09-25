import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Backup price list (agar Supabase se na mile to)
const PRICE_MAP: Record<string, number> = {
  "mustard-1kg": 199, "mustard-2kg": 379, "mustard-5kg": 899,
  "sarso-1kg": 199, "sarso-2kg": 379, "sarso-5kg": 899,
  "sarson-1kg": 199, "sarson-2kg": 379, "sarson-5kg": 899,
  "sesame-1kg": 259, "sesame-2kg": 479, "sesame-5kg": 1099,
  "til-1kg": 259, "til-2kg": 479, "til-5kg": 1099,
  "gud-1kg": 299, "gud-2kg": 549,
  "til-gud-1kg": 299, "til-gud-2kg": 549,
  "cheeni-1kg": 279, "cheeni-2kg": 519,
  "til-cheeni-1kg": 279, "til-cheeni-2kg": 519,
};

export async function POST(req: Request) {
  try {
    const { items } = await req.json();
    if (!items || !Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: "Cart khaali hai" }, { status: 400 });

    // Supabase se live prices (service_role = RLS bypass)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: dbProducts } = await supabase.from("products").select("id, price");
    const dbMap: Record<string, number> = {};
    (dbProducts || []).forEach((p: any) => { dbMap[String(p.id)] = Number(p.price); });

    let total = 0;
    for (const it of items) {
      const pid = String(it.product_id || "").trim();
      // Pehle Supabase, phir backup PRICE_MAP
      const price = dbMap[pid] ?? PRICE_MAP[pid.toLowerCase()];
      if (!price)
        return NextResponse.json(
          { error: "Galat product: '" + pid + "' ka daam nahi mila" },
          { status: 400 }
        );
      const qty = Math.max(1, Math.min(100, parseInt(it.qty) || 1));
      total += price * qty;
    }
    const amountPaise = Math.round(total * 100);

    const auth = Buffer.from(
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID + ":" + process.env.RAZORPAY_KEY_SECRET
    ).toString("base64");

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + auth },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: "akc_" + Date.now() }),
    });
    const order = await res.json();
    if (!res.ok)
      return NextResponse.json({ error: order.error?.description || "Razorpay error" }, { status: 500 });

    return NextResponse.json({
      orderId: order.id,
      amount: amountPaise,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
