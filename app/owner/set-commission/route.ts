import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const OWNER_PIN = "Abc@12345";

export async function POST(req: Request) {
  try {
    const { value, pin } = await req.json();
    if (pin !== OWNER_PIN)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const v = Number(value);
    if (isNaN(v) || v < 0)
      return NextResponse.json({ error: "Invalid value" }, { status: 400 });
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error } = await supabase.from("platform_settings")
      .update({ value: String(v), updated_at: new Date().toISOString() })
      .eq("key", "commission_per_order");
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
