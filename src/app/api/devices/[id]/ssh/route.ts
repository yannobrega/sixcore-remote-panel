import { NextResponse } from "next/server";
import { currentUser } from "../../../../../server/auth/session";
import { db } from "../../../../../server/db/client";
import { decryptCredential } from "../../../../../server/crypto/credential";
import { createGatewaySshSession } from "../../../../../server/gateway/client";
import { assertSameOrigin } from "../../../../../server/http/request";
import { audit } from "../../../../../server/audit/write";

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 }); }
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const result = await db().query(`SELECT id,company_id,sstp_ip,ssh_port,ssh_user,credential_ciphertext,credential_nonce,credential_tag FROM devices WHERE id=$1 AND active=true AND deleted_at IS NULL`, [id]);
  const device = result.rows[0];
  if (!device) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!device.credential_ciphertext || !device.credential_nonce || !device.credential_tag) return NextResponse.json({ error: "missing_ssh_credential" }, { status: 409 });

  const inserted = await db().query(`INSERT INTO remote_sessions(user_id,company_id,device_id,kind,status) VALUES($1,$2,$3,'ssh','pending') RETURNING id`, [user.id, device.company_id, device.id]);
  const sessionId = inserted.rows[0].id as string;
  try {
    const password = decryptCredential({ ciphertext: device.credential_ciphertext, nonce: device.credential_nonce, tag: device.credential_tag });
    const gateway = await createGatewaySshSession({ sessionId, userId: user.id, clientIp: clientIp(request), realIp: device.sstp_ip, port: device.ssh_port, username: device.ssh_user, password });
    await audit({ actorUserId: user.id, companyId: device.company_id, deviceId: device.id, action: "ssh.session.create", outcome: "success", metadata: { sessionId } });
    return NextResponse.json({ ok: true, sessionId, token: gateway.token, expiresAt: gateway.expiresAt, websocketUrl: gateway.websocketUrl });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "ssh_session_create_failed";
    await db().query(`UPDATE remote_sessions SET status='failed',ended_at=now(),duration_seconds=0,end_reason=$2 WHERE id=$1`, [sessionId, reason]);
    await audit({ actorUserId: user.id, companyId: device.company_id, deviceId: device.id, action: "ssh.session.create", outcome: "failed", metadata: { sessionId, reason } });
    return NextResponse.json({ error: reason }, { status: 502 });
  }
}
