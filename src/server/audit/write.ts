import { db } from "../db/client";

export async function audit(input: { actorUserId?: string | null; companyId?: string | null; deviceId?: string | null; action: string; outcome: string; metadata?: Record<string, unknown>; ipAddress?: string | null }) {
  await db().query(
    `INSERT INTO audit_events(actor_user_id,company_id,device_id,action,outcome,metadata,ip_address) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)`,
    [input.actorUserId ?? null, input.companyId ?? null, input.deviceId ?? null, input.action, input.outcome, JSON.stringify(input.metadata ?? {}), input.ipAddress ?? null]
  );
}
