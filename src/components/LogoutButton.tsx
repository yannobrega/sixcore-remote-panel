"use client";
import { useRouter } from "next/navigation";
export function LogoutButton(){const r=useRouter();return <button className="ghost small" onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});r.replace("/login");r.refresh()}}>Sair</button>}
