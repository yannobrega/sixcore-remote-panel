import { NextResponse } from "next/server";
import { currentUser, revokeAllSessions } from "@/server/auth/session";
import { assertSameOrigin } from "@/server/http/request";
import { audit } from "@/server/audit/write";
export async function POST(request:Request) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({error:"origin_not_allowed"},{status:403}); }
  const user = await currentUser(); if (!user) return NextResponse.json({error:"unauthorized"},{status:401});
  await revokeAllSessions(user.id); await audit({actorUserId:user.id,action:"auth.sessions.revoke_all",outcome:"success"});
  return NextResponse.json({ok:true});
}
