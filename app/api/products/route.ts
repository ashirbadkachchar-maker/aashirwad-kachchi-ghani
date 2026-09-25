import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase.from("products").select("id, oil_type, pack_size_kg, price, is_active").eq("is_active", true);
  return NextResponse.json({ products: data || [] });
}
