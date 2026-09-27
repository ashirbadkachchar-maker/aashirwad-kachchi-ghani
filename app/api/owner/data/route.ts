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

export async function GET(req: Request) {
  if (!verifySession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: s } = await supabase.from("platform_settings").select("value").eq("key", "commission_per_order").single();
  const { data: c } = await supabase.from("commissions").select("*").order("created_at", { ascending: false }).limit(1000);
  return NextResponse.json({ commission: s?.value?? "20", commissions: c || [] });
}
