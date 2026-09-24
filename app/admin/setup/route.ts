import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// @ts-ignore
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, mobile, password } = await req.json();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { count } = await supabase.from("admins").select("id", { count: "exact", head: true });
    if (count && count > 0) return NextResponse.json({ error: "Admin pehle se bana hai" }, { status: 400 });
    const hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from("admins").insert({ name, mobile, password_hash: hash }).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, admin: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
