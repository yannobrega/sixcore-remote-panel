import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { assertSameOrigin } from "@/server/http/request";
import { db } from "@/server/db/client";
import { audit } from "@/server/audit/write";
export async function POST(request:Request){
  try{assertSameOrigin(request)}catch{return NextResponse.json({error:"origin_not_allowed"},{status:403})}
  const user=await currentUser(); if(!user)return NextResponse.json({error:"unauthorized"},{status:401}); if(user.role==="viewer")return NextResponse.json({error:"forbidden"},{status:403});
  const b=await request.json().catch(()=>null) as any; if(!b?.legalName?.trim()||!b?.tradeName?.trim())return NextResponse.json({error:"invalid_request"},{status:400});
  try{const r=await db().query(`INSERT INTO companies(legal_name,trade_name,tax_id,contract_active,active,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,[b.legalName.trim(),b.tradeName.trim(),b.taxId?.trim()||null,b.contractActive!==false,b.active!==false,b.notes?.trim()||null]); const id=r.rows[0].id; await audit({actorUserId:user.id,companyId:id,action:"company.create",outcome:"success"}); return NextResponse.json({ok:true,id},{status:201});}catch(e:any){if(e?.code==="23505")return NextResponse.json({error:"duplicate_company"},{status:409}); throw e}
}
