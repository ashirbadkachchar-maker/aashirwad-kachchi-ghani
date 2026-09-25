import { NextResponse } from "next/server";

// Saare possible product IDs ke daam (tumhare refactor ke baad ke IDs bhi cover)
// product_id format: {id}-{kg}kg  e.g. "mustard-1kg", "til-1kg", "gud-2kg"
const PRICE_MAP: Record<string, number> = {
  // Sarson / Mustard oil
  "mustard-1kg": 199, "mustard-2kg": 379, "mustard-5kg": 899,
  "sarso-1kg": 199, "sarso-2kg": 379, "sarso-5kg": 899,
  "sarson-1kg": 199, "sarson-2kg": 379, "sarson-5kg": 899,
  // Til / Sesame oil
  "sesame-1kg": 259, "sesame-2kg": 479, "sesame-5kg": 1099,
  "til-1kg": 259, "til-2kg": 479, "til-5kg": 1099,
  "tiltel-1kg": 259, "tiltel-2kg": 479, "tiltel-5kg": 1099,
  // Gud kachchar
  "gud-1kg": 299, "gud-2kg": 549,
  "til-gud-1kg": 299, "til-gud-2kg": 549, "tilgud-1kg": 299, "tilgud-2kg": 549,
  // Cheeni kachchar
  "cheeni-1kg": 279, "cheeni-2kg": 519,
  "til-cheeni-1kg": 279, "til-cheeni-2kg": 519, "tilcheeni-1kg": 279, "tilcheeni-2kg": 519,
  "chini-1kg": 279, "chini-2kg": 519,
};

export async function POST(req: Request) {
  try {
    const { items } = await req.json(); // [{product_id, qty}]
    if (!items || !Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: "Cart khaali hai" }, { status: 400 });

    let total = 0;
    for (const it of items) {
      const pid = String(it.product_id || "").toLowerCase().trim();
      const price = PRICE_MAP[pid];
      if (!price)
        return NextResponse.json(
          { error: "Galat product: '" + it.product_id + "' nahi mila. Screenshot bhejo." },
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
