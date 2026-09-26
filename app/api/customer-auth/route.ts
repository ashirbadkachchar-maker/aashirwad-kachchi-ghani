import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

async function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(pw, salt, 64)) as Buffer;
  return `scrypt:${salt}:${buf.toString("hex")}`;
}
async function checkPassword(pw: string, stored: string) {
  const parts = String(stored || "").split(":");
  if (parts.length!== 3 || parts[0]!== "scrypt") return false;
  const buf = (await scryptAsync(pw, parts[1], 64)) as Buffer;
  const hb = Buffer.from(parts[2], "hex");
  return hb.length === buf.length && timingSafeEqual(hb, buf);
}

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY Vercel me set nahi hai");
    const b = await req.json();
    const { action } = b;
    const mobile = String(b.mobile || "").trim();
    const password = String(b.password || "");
    if (!/^[0-9]{10}$/.test(mobile)) return NextResponse.json({ error: "10 digit ka mobile number likho" }, { status: 400 });
    const S = db();

    if (action === "check") {
      const { data } = await S.from("customers").select("id, name, password_hash").eq("mobile", mobile).single();
      if (!data) return NextResponse.json({ exists: false, hasPassword: false });
      return NextResponse.json({ exists: true, hasPassword:!!data.password_hash, name: data.name });
    }

    if (["register", "login", "set_password", "get_profile", "update_profile"].includes(action) && password.length < 4)
      return NextResponse.json({ error: "Password kam se kam 4 akshar ka rakho" }, { status: 400 });

    if (action === "register") {
      const { data: ex } = await S.from("customers").select("id").eq("mobile", mobile).single();
      if (ex) return NextResponse.json({ error: "Is mobile se account pehle se hai. Login karo." }, { status: 400 });
      const { data, error } = await S.from("customers").insert({
        name: b.name || "", mobile, address: b.address || "", city: b.city || "", pincode: b.pincode || "",
        password_hash: await hashPassword(password),
      }).select("id, name, mobile").single();
      if (error) throw error;
      return NextResponse.json({ ok: true, customer: data });
    }

    const { data: cust } = await S.from("customers").select("id, name, mobile, password_hash").eq("mobile", mobile).single();
    if (!cust) return NextResponse.json({ error: "Is mobile se koi account nahi mila" }, { status: 404 });

    if (action === "set_password") {
      if (cust.password_hash) return NextResponse.json({ error: "Password pehle se set hai. Login karo." }, { status: 400 });
      const { error } = await S.from("customers").update({ password_hash: await hashPassword(password) }).eq("id", cust.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, customer: { id: cust.id, name: cust.name, mobile: cust.mobile } });
    }

    if (!cust.password_hash) return NextResponse.json({ error: "Pehli baar password banao", needSet: true }, { status: 401 });
    const match = await checkPassword(password, cust.password_hash);
    if (!match) return NextResponse.json({ error: "Galat password. Phir try karo." }, { status: 401 });

    if (action === "login") return NextResponse.json({ ok: true, customer: { id: cust.id, name: cust.name, mobile: cust.mobile } });

    if (action === "get_profile") {
      const { data: full } = await S.from("customers").select("name, address, city, pincode").eq("id", cust.id).single();
      return NextResponse.json({ ok: true, profile: full });
    }

    if (action === "update_profile") {
      const { error } = await S.from("customers").update({
        name: b.name || cust.name, address: b.address || "", city: b.city || "", pincode: b.pincode || "",
      }).eq("id", cust.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, customer: { id: cust.id, name: b.name || cust.name, mobile: cust.mobile } });
    }

    return NextResponse.json({ error: "Galat action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
