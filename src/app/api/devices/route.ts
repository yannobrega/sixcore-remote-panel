import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { assertSameOrigin } from "@/server/http/request";
import { db } from "@/server/db/client";
import { audit } from "@/server/audit/write";
import { encryptCredential, generateDevicePassword } from "@/server/crypto/credential";
import { isIP } from "node:net";
export async function POST(request:Request){
 try{assertSameOrigin(request)}catch{return NextResponse.json({error:"origin_not_allowed"},{status:403})}
 const u=await currentUser();if(!u)return NextResponse.json({error:"unauthorized"},{status:401});if(u.role==="viewer")return NextResponse.json({error:"forbidden"},{status:403});
 const b=await request.json().catch(()=>null) as any; const name=b?.name?.trim(), companyId=b?.companyId, ip=b?.sstpIp?.trim();
 if(!name||!companyId||!ip||isIP(ip)!==4)return NextResponse.json({error:"invalid_request"},{status:400});
 const sshPort=Number(b.sshPort||22333), webfigPort=Number(b.webfigPort||1080); if(!Number.isInteger(sshPort)||sshPort<1||sshPort>65535||!Number.isInteger(webfigPort)||webfigPort<1||webfigPort>65535)return NextResponse.json({error:"invalid_port"},{status:400});
 const password=generateDevicePassword(); const c=encryptCredential(password); const identifier=b.identifier?.trim()||crypto.randomUUID();
 try{const r=await db().query(`INSERT INTO devices(company_id,name,identifier,sstp_ip,sstp_user,ssh_port,webfig_port,ssh_user,credential_ciphertext,credential_nonce,credential_tag,active,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,[companyId,name,identifier,ip,b.sstpUser?.trim()||name,sshPort,webfigPort,b.sshUser?.trim()||"c3.remote",c.ciphertext,c.nonce,c.tag,b.active!==false,b.notes?.trim()||null]);const id=r.rows[0].id;await audit({actorUserId:u.id,companyId,deviceId:id,action:"device.create",outcome:"success"});return NextResponse.json({ok:true,id,generatedPassword:password},{status:201});}catch(e:any){if(e?.code==="23505")return NextResponse.json({error:"duplicate_device"},{status:409});throw e}
}
