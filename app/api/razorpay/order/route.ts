import { NextResponse } from "next/server";

// Dashboard ke products ke sahi daam (server-side list, client isko badal nahi sakta)
const PRICE_MAP: Record<string, number> = {
  "mustard-1kg": 199, "mustard-2kg": 379, "mustard-5kg": 899,
  "sesame-1kg": 259, "sesame-2kg": 479, "sesame-5kg": 1099,
  "gud-1kg": 299, "gud-2kg": 549,
  "cheeni-1kg": 279, "cheeni-2kg": 519,
};

export async function POST(req: Request) {
  try {
    const { items } = await req.json(); // [{product_id, qty}]
    if (!items || !Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: "Cart khaali hai" }, { status: 400 });

    // Price server-side PRICE_MAP se verify karo (client ki bhej hui price par bharosa nahi)
    let total = 0;
    for (const it of items) {
      const price = PRICE_MAP[it.product_id];
      if (!price) return NextResponse.json({ error: "Galat product" }, { status: 400 });
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
