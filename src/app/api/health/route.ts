import { NextResponse } from "next/server";import { db } from "@/server/db/client";
export async function GET(){try{await db().query("SELECT 1");return NextResponse.json({ok:true,service:"sixcore-remote-panel",version:"1.0.0",database:"ok",timestamp:new Date().toISOString()})}catch{return NextResponse.json({ok:false,service:"sixcore-remote-panel",version:"1.0.0",database:"error"},{status:503})}}
