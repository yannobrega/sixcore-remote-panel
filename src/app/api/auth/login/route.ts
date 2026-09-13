import { NextResponse } from "next/server";
import { authenticate } from "@/server/auth/login";
import { createSession } from "@/server/auth/session";
import { audit } from "@/server/audit/write";
import { assertSameOrigin } from "@/server/http/request";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error:"origin_not_allowed" }, { status:403 }); }
  const body = await request.json().catch(() => null) as { email?:string; password?:string } | null;
  const email = body?.email?.trim() || "";
  const password = body?.password || "";
  if (!email || !password || email.length > 320 || password.length > 256) return NextResponse.json({ error:"invalid_request" }, { status:400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const result = await authenticate(email, password, ip);
  if (!result.ok) {
    await audit({ action:"auth.login", outcome:"failure", metadata:{ reason:result.reason, email:email.toLowerCase() }, ipAddress:ip });
    return NextResponse.json({ error: result.reason === "locked" ? "temporarily_locked" : "invalid_credentials" }, { status: result.reason === "locked" ? 429 : 401 });
  }
  await createSession(result.user.id, ip, request.headers.get("user-agent"));
  await audit({ actorUserId:result.user.id, action:"auth.login", outcome:"success", ipAddress:ip });
  return NextResponse.json({ ok:true });
}
