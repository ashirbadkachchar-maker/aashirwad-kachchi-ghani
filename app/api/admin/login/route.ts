import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { mobile, password } = await req.json();
    if (!mobile || !password)
      return NextResponse.json({ error: "Mobile/password likho" }, { status: 400 });

    // service_role sirf server par — password_hash kabhi client ko nahi jata
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: admin } = await supabase.from("admins").select("*").eq("mobile", mobile).single();
    if (!admin) return NextResponse.json({ error: "Admin nahi mila" }, { status: 401 });

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return NextResponse.json({ error: "Galat password" }, { status: 401 });

    return NextResponse.json({
      ok: true,
      admin: { id: admin.id, name: admin.name, mobile: admin.mobile },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
