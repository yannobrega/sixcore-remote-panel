import { NextResponse } from "next/server";
import { currentUser } from "../../../../../server/auth/session";
import { db } from "../../../../../server/db/client";
import { assertSameOrigin } from "../../../../../server/http/request";
import { audit } from "../../../../../server/audit/write";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 }); }
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({})) as { state?: string; reason?: string };
  const row = await db().query(`SELECT id,device_id,company_id,status,started_at FROM remote_sessions WHERE id=$1 AND user_id=$2 AND kind='ssh'`, [id, user.id]);
  const session = row.rows[0];
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (body.state === "active" && session.status === "pending") {
    await db().query(`UPDATE remote_sessions SET status='active' WHERE id=$1`, [id]);
    await audit({ actorUserId: user.id, companyId: session.company_id, deviceId: session.device_id, action: "ssh.session.start", outcome: "success", metadata: { sessionId: id } });
    return NextResponse.json({ ok: true });
  }
  if (["ended", "failed"].includes(body.state || "") && ["pending", "active"].includes(session.status)) {
    const reason = String(body.reason || (body.state === "ended" ? "closed" : "failed")).slice(0, 128);
    await db().query(`UPDATE remote_sessions SET status=$2,ended_at=now(),duration_seconds=greatest(0,extract(epoch FROM (now()-started_at))::int),end_reason=$3 WHERE id=$1`, [id, body.state, reason]);
    await audit({ actorUserId: user.id, companyId: session.company_id, deviceId: session.device_id, action: "ssh.session.end", outcome: body.state === "ended" ? "success" : "failed", metadata: { sessionId: id, reason } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true, unchanged: true });
}
