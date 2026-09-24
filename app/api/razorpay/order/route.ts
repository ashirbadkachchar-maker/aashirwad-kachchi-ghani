import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { items } = await req.json(); // [{product_id, qty}]
    if (!items || !Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: "Cart khaali hai" }, { status: 400 });

    // Price Supabase se verify karo (client ki bhej hui price par bharosa nahi)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const ids = items.map((i: any) => i.product_id);
    const { data: products, error } = await supabase
      .from("products").select("id, price").in("id", ids).eq("is_active", true);
    if (error || !products || products.length === 0)
      return NextResponse.json({ error: "Products nahi mile" }, { status: 400 });

    let total = 0;
    for (const it of items) {
      const p = products.find((x: any) => x.id === it.product_id);
      if (!p) return NextResponse.json({ error: "Galat product" }, { status: 400 });
      const qty = Math.max(1, Math.min(100, parseInt(it.qty) || 1));
      total += Number(p.price) * qty;
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
