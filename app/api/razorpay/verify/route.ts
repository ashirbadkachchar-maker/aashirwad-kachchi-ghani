import { NextResponse } from "next/server";
import crypto from "crypto";

const hits = new Map<string, { count: number; ts: number }>();
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.ts > 60000) { hits.set(ip, { count: 1, ts: now }); return true; }
  if (rec.count >= 20) return false;
  rec.count++;
  return true;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (!rateLimit(ip)) return NextResponse.json({ ok: false }, { status: 429 });

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return NextResponse.json({ ok: false }, { status: 500 });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id ||!razorpay_payment_id ||!razorpay_signature ||
        String(razorpay_order_id).length > 100 ||
        String(razorpay_payment_id).length > 100 ||
        String(razorpay_signature).length > 200) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");

    // timing-safe compare — timing attack se safe
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(String(razorpay_signature), "hex");
    const match = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!match) return NextResponse.json({ ok: false }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
