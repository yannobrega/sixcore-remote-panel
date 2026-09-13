import { NextResponse } from "next/server";
import { currentUser, revokeCurrentSession } from "@/server/auth/session";
import { assertSameOrigin } from "@/server/http/request";
import { audit } from "@/server/audit/write";
export async function POST(request:Request) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({error:"origin_not_allowed"},{status:403}); }
  const user = await currentUser();
  if (user) await audit({actorUserId:user.id,action:"auth.logout",outcome:"success"});
  await revokeCurrentSession();
  return NextResponse.json({ok:true});
}
