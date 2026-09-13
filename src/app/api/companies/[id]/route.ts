import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { assertSameOrigin } from "@/server/http/request";
import { db } from "@/server/db/client";
import { audit } from "@/server/audit/write";
export async function PATCH(request:Request,ctx:{params:Promise<{id:string}>}){try{assertSameOrigin(request)}catch{return NextResponse.json({error:"origin_not_allowed"},{status:403})} const u=await currentUser();if(!u)return NextResponse.json({error:"unauthorized"},{status:401});if(u.role==="viewer")return NextResponse.json({error:"forbidden"},{status:403});const {id}=await ctx.params;const b=await request.json().catch(()=>null) as any;if(typeof b?.active!=="boolean")return NextResponse.json({error:"invalid_request"},{status:400});await db().query(`UPDATE companies SET active=$1,updated_at=now() WHERE id=$2 AND deleted_at IS NULL`,[b.active,id]);await audit({actorUserId:u.id,companyId:id,action:"company.update_status",outcome:"success",metadata:{active:b.active}});return NextResponse.json({ok:true})}
