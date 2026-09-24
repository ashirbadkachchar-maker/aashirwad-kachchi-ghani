import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, mobile, password } = await req.json();
    if (!name?.trim() || !/^[0-9]{10}$/.test(mobile || "") || (password || "").length < 6)
      return NextResponse.json(
        { error: "Naam, 10-digit mobile aur kam se kam 6-char password likho" },
        { status: 400 }
      );

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { count } = await supabase.from("admins").select("id", { count: "exact", head: true });
    if ((count || 0) > 0)
      return NextResponse.json({ error: "Admin pehle se bana hai. Setup band hai." }, { status: 403 });

    const hash = await bcrypt.hash(password, 10);
    const { error } = await supabase.from("admins").insert({ name, mobile, password_hash: hash });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
