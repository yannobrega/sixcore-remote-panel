import { NextResponse } from "next/server";
import { currentUser, revokeAllSessions } from "@/server/auth/session";
import { assertSameOrigin } from "@/server/http/request";
import { db } from "@/server/db/client";
import { hashPassword, verifyPassword } from "@/server/crypto/password";
import { audit } from "@/server/audit/write";
export async function POST(request:Request) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({error:"origin_not_allowed"},{status:403}); }
  const user=await currentUser(); if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
  const body=await request.json().catch(()=>null) as {currentPassword?:string;newPassword?:string}|null;
  if(!body?.currentPassword||!body?.newPassword)return NextResponse.json({error:"invalid_request"},{status:400});
  const r=await db().query<{password_hash:string}>(`SELECT password_hash FROM users WHERE id=$1`,[user.id]);
  if(!r.rows[0]||!(await verifyPassword(body.currentPassword,r.rows[0].password_hash))) return NextResponse.json({error:"invalid_current_password"},{status:401});
  let hashed:string; try { hashed=await hashPassword(body.newPassword); } catch { return NextResponse.json({error:"password_too_short"},{status:400}); }
  await db().query(`UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2`,[hashed,user.id]);
  await audit({actorUserId:user.id,action:"auth.password.change",outcome:"success"}); await revokeAllSessions(user.id);
  return NextResponse.json({ok:true});
}
