import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { order_id, order_no, order_amount } = await req.json();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: s } = await supabase.from("platform_settings")
     .select("value").eq("key", "commission_per_order").single();
    const perOrder = Number(s?.value || 0);
    if (perOrder <= 0) return NextResponse.json({ ok: true, skipped: true });
    const { data: ex } = await supabase.from("commissions")
     .select("id").eq("order_id", order_id).limit(1);
    if (ex && ex.length) return NextResponse.json({ ok: true, dup: true });
    await supabase.from("commissions").insert({
      order_id, order_no,
      order_amount: Number(order_amount) || 0,
      commission_amount: perOrder,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
