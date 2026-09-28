import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const NORM = (t: string) => {
  const s = (t || "").toLowerCase();
  if (s.includes("mustard") || s.includes("sarso") || s.includes("sarson") || s.includes("peanut")) return "mustard";
  if (s.includes("gud")) return "gud";
  if (s.includes("cheeni") || s.includes("chini")) return "cheeni";
  if (s.includes("sesame") || s.includes("til")) return "sesame";
  return s.trim();
};

const FALLBACK: Record<string, number> = {
  "mustard-1kg": 199, "mustard-2kg": 379, "mustard-5kg": 899,
  "sesame-1kg": 259, "sesame-2kg": 479, "sesame-5kg": 1099,
  "til-1kg": 259, "gud-1kg": 299, "gud-2kg": 549,
  "cheeni-1kg": 279, "cheeni-2kg": 519,
};

// spam rokne ke liye — 1 IP se 1 min me max 10 request
const hits = new Map<string, { count: number; ts: number }>();
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.ts > 60000) { hits.set(ip, { count: 1, ts: now }); return true; }
  if (rec.count >= 10) return false;
  rec.count++;
  return true;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (!rateLimit(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const { items } = await req.json();
    if (!items ||!Array.isArray(items) || items.length === 0 || items.length > 20)
      return NextResponse.json({ error: "Invalid cart" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: dbProducts } = await supabase
     .from("products")
     .select("id, oil_type, pack_size_kg, price")
     .eq("is_active", true);

    const byId: Record<string, number> = {};
    const byOilKg: Record<string, number> = {};

    (dbProducts || []).forEach((p: any) => {
      const price = Number(p.price);
      if (isNaN(price) || price <= 0) return;
      byId[String(p.id)] = price;
      byOilKg[(NORM(String(p.oil_type||"")) + "-" + String(p.pack_size_kg) + "kg").toLowerCase()] = price;
    });

    let total = 0;
    for (const it of items) {
      const pid = String(it.product_id||"").trim().slice(0,100);
      const qty = Math.max(1, Math.min(10, parseInt(it.qty)||1));
      let price = byId[pid]?? byOilKg[pid.toLowerCase()]?? FALLBACK[pid.toLowerCase()];
      if (!price) return NextResponse.json({ error: "Price not found" }, { status: 400 });
      if (price > 10000) return NextResponse.json({ error: "Price limit" }, { status: 400 });
      total += price * qty;
    }

    if (total > 50000 || total < 10) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const amountPaise = Math.round(total*100);
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId ||!secret) return NextResponse.json({ error: "Keys not set" }, { status: 500 });

    const auth = Buffer.from(`${keyId}:${secret}`).toString("base64");

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: `akg_${Date.now()}` }),
    });

    const order = await res.json();
    if (!res.ok) return NextResponse.json({ error: "Razorpay error" }, { status: 500 });

    return NextResponse.json({ orderId: order.id, amount: amountPaise, keyId });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
