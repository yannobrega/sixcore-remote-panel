"use client";
import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

type Phase = "idle" | "preparing" | "connecting_gateway" | "authenticating_mikrotik" | "waiting_prompt" | "connected" | "closed" | "error";
const labels: Record<Phase,string> = {
  idle: "Pronto para iniciar",
  preparing: "Preparando sessão segura…",
  connecting_gateway: "Conectando ao gateway…",
  authenticating_mikrotik: "Autenticando no MikroTik…",
  waiting_prompt: "Aguardando prompt do RouterOS…",
  connected: "Conectado",
  closed: "Sessão finalizada",
  error: "Falha na conexão"
};

export function SshTerminal({ deviceId, deviceName }: { deviceId: string; deviceName: string }) {
  const [open,setOpen]=useState(false); const [phase,setPhase]=useState<Phase>("idle"); const [reason,setReason]=useState(""); const [busy,setBusy]=useState(false);
  const hostRef=useRef<HTMLDivElement>(null); const terminalRef=useRef<Terminal|null>(null); const fitRef=useRef<FitAddon|null>(null); const socketRef=useRef<WebSocket|null>(null); const sessionRef=useRef<string|null>(null);

  async function state(state:"active"|"ended"|"failed", reason?:string) {
    const id=sessionRef.current; if(!id)return;
    await fetch(`/api/remote-sessions/${id}/state`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({state,reason}),keepalive:true}).catch(()=>{});
  }
  function cleanup() { try{socketRef.current?.close(1000,"user_ended")}catch{} socketRef.current=null; terminalRef.current?.dispose(); terminalRef.current=null; fitRef.current=null; }
  async function finish() { await state("ended","user_ended"); cleanup(); setPhase("closed"); setOpen(false); }

  async function start() {
    setOpen(true);setBusy(true);setReason("");setPhase("preparing");
    const response=await fetch(`/api/devices/${deviceId}/ssh`,{method:"POST"});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){setBusy(false);setPhase("error");setReason(payload.error||"Não foi possível criar a sessão SSH.");return}
    sessionRef.current=payload.sessionId;
    setTimeout(()=>{
      if(!hostRef.current)return;
      const term=new Terminal({cursorBlink:true,convertEol:true,fontFamily:'"SFMono-Regular",Consolas,monospace',fontSize:13,theme:{background:"#050707",foreground:"#e8eeee",cursor:"#34d399"},scrollback:5000});
      const fit=new FitAddon();term.loadAddon(fit);term.open(hostRef.current);fit.fit();term.focus();terminalRef.current=term;fitRef.current=fit;
      const socket=new WebSocket(payload.websocketUrl);socketRef.current=socket;
      socket.onopen=()=>{setPhase("connecting_gateway");socket.send(JSON.stringify({type:"auth",token:payload.token}));socket.send(JSON.stringify({type:"resize",cols:term.cols,rows:term.rows}))};
      socket.onmessage=(event)=>{let msg:any;try{msg=JSON.parse(event.data)}catch{return}if(msg.type==="data")term.write(msg.data);if(msg.type==="phase")setPhase(msg.phase);if(msg.type==="connected"){setPhase("connected");setBusy(false);void state("active")}if(msg.type==="error"){setPhase("error");setReason(msg.reason||"ssh_connection_failed");setBusy(false);void state("failed",msg.reason)}if(msg.type==="disconnected"){setPhase("closed");setReason(msg.reason||"closed");setBusy(false);void state("ended",msg.reason)}};
      socket.onclose=(event)=>{setBusy(false);if(phase!=="error"){setPhase("closed");setReason(event.reason||"connection_closed")}void state(event.code>=4400?"failed":"ended",event.reason||"connection_closed")};
      socket.onerror=()=>{setBusy(false);setPhase("error");setReason("websocket_error");void state("failed","websocket_error")};
      term.onData(data=>{if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:"input",data}))});
      const resize=()=>{fit.fit();if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:"resize",cols:term.cols,rows:term.rows}))};window.addEventListener("resize",resize,{passive:true});
    },0);
  }

  useEffect(()=>()=>{if(sessionRef.current)void state("ended","page_closed");cleanup()},[]);
  return <>
    <button className="primary" onClick={start} disabled={busy}>Abrir SSH</button>
    {open&&<div className="terminal-overlay" role="dialog" aria-modal="true"><div className="terminal-modal"><div className="terminal-head"><div><span className={`terminal-dot ${phase}`}/><strong>SSH · {deviceName}</strong><small>{labels[phase]}{reason?` · ${reason}`:""}</small></div><button className="danger-btn" onClick={finish}>Finalizar sessão</button></div><div ref={hostRef} className="terminal-host"/></div></div>}
  </>;
}
