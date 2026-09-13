import { checkGatewayTcp } from "../gateway/client";
import { db } from "../db/client";

export async function refreshDeviceStatus(device: { id:string; sstp_ip:string; ssh_port:number; webfig_port:number }) {
  const [ssh, webfig] = await Promise.all([
    checkGatewayTcp(device.sstp_ip, device.ssh_port).catch(() => ({ reachable:false, port:device.ssh_port, latencyMs:0, reason:"error" as const })),
    checkGatewayTcp(device.sstp_ip, device.webfig_port).catch(() => ({ reachable:false, port:device.webfig_port, latencyMs:0, reason:"error" as const }))
  ]);
  const networkReachable = ssh.reachable || webfig.reachable ? true : null;
  const latency = [ssh,webfig].filter(x=>x.reachable).map(x=>x.latencyMs).sort((a,b)=>a-b)[0] ?? null;
  await db().query(`INSERT INTO device_status_checks(device_id,network_reachable,ssh_reachable,webfig_reachable,latency_ms) VALUES($1,$2,$3,$4,$5)`, [device.id, networkReachable, ssh.reachable, webfig.reachable, latency]);
  return { networkReachable, sshReachable:ssh.reachable, webfigReachable:webfig.reachable, latencyMs:latency };
}
