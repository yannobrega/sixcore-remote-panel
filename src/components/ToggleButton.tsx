"use client";
import { useRouter } from "next/navigation";
export function ToggleButton({endpoint,active,labelOn="Desativar",labelOff="Ativar"}:{endpoint:string;active:boolean;labelOn?:string;labelOff?:string}){const r=useRouter();return <button className="ghost small" onClick={async()=>{const res=await fetch(endpoint,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({active:!active})});if(res.ok)r.refresh();else alert("Operação não permitida ou falhou.")}}>{active?labelOn:labelOff}</button>}
