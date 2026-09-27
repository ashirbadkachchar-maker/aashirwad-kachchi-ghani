import { NextResponse } from "next/server";
const SESSION_SECRET = process.env.OWNER_SESSION_SECRET || "change-this-in-vercel";
export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/owner_session=([^;]+)/);
  let ok = false;
  if (m) { try { ok = Buffer.from(m[1], "base64").toString().includes(SESSION_SECRET); } catch {} }
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true });
}
