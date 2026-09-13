export type GatewayConnectivityResult = {
  reachable: boolean;
  port: number;
  latencyMs: number;
  reason: "timeout" | "refused" | "unreachable" | "error" | null;
};

function gatewayConfig() {
  const baseUrl = process.env.GATEWAY_BASE_URL;
  const apiKey = process.env.GATEWAY_API_KEY;
  const appUrl = process.env.APP_URL;
  if (!baseUrl) throw new Error("missing_GATEWAY_BASE_URL");
  if (!apiKey) throw new Error("missing_GATEWAY_API_KEY");
  if (!appUrl) throw new Error("missing_APP_URL");
  return { baseUrl: new URL(baseUrl).toString().replace(/\/$/, ""), apiKey, origin: new URL(appUrl).origin };
}

export async function checkGatewayTcp(realIp: string, port: number, timeoutMs = 8000): Promise<GatewayConnectivityResult> {
  const config = gatewayConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}/private/v1/network/check`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.apiKey}`, origin: config.origin, "content-type": "application/json" },
      body: JSON.stringify({ realIp, port }),
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`gateway_http_${response.status}`);
    return await response.json() as GatewayConnectivityResult;
  } finally {
    clearTimeout(timer);
  }
}
