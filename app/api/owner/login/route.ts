import { NextResponse } from "next/server";

const OWNER_ID = process.env.OWNER_ID || "owner";
const OWNER_PIN = process.env.OWNER_PIN || "";
const SESSION_SECRET = process.env.OWNER_SESSION_SECRET || "change-this-in-vercel";

export async function POST(req: Request) {
  try {
    const { oid, opin } = await req.json();
    if (!OWNER_PIN) return NextResponse.json({ error: "OWNER_PIN set nahi hai" }, { status: 500 });
    if (!oid ||!opin) return NextResponse.json({ error: "ID / PIN bhejo" }, { status: 400 });

    if (oid.trim()!== OWNER_ID || opin!== OWNER_PIN) {
      await new Promise(r => setTimeout(r, 1000)); // brute-force slow
      return NextResponse.json({ error: "Galat ID ya PIN" }, { status: 401 });
    }

    const token = Buffer.from(`${oid}:${Date.now()}:${SESSION_SECRET}`).toString("base64");
    const res = NextResponse.json({ ok: true });
    res.cookies.set("owner_session", token, {
      httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 60 * 60 * 8,
    });
    return res;
  } catch { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
