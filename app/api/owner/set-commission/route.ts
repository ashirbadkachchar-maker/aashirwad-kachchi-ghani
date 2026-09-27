import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SESSION_SECRET = process.env.OWNER_SESSION_SECRET || "change-this-in-vercel";

function verifySession(req: Request): boolean {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/owner_session=([^;]+)/);
  if (!match) return false;
  try {
    const decoded = Buffer.from(match[1], "base64").toString();
    return decoded.includes(SESSION_SECRET);
  } catch { return false; }
}

export async function POST(req: Request) {
  try {
    // 1. Session cookie check — PIN body me bhejne ki zarurat nahi
    if (!verifySession(req)) {
      return NextResponse.json({ error: "Unauthorized - login karo" }, { status: 401 });
    }

    const { value } = await req.json();
    const v = Number(value);
    if (isNaN(v) || v < 0 || v > 500) {
      return NextResponse.json({ error: "Sahi value dalo (0-500)" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
     .from("platform_settings")
     .upsert({ key: "commission_per_order", value: String(v) }, { onConflict: "key" });

    if (error) return NextResponse.json({ error: "Save fail" }, { status: 500 });
    return NextResponse.json({ ok: true, value: v });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
