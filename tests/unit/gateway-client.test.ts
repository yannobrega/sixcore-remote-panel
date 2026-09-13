import test from "node:test";
import assert from "node:assert/strict";
import { checkGatewayTcp } from "../../src/server/gateway/client.ts";

test("gateway client keeps API key server-side and sends exact application Origin", async () => {
  process.env.GATEWAY_BASE_URL = "https://remote.sixcore.com.br";
  process.env.GATEWAY_API_KEY = "test-only-key-not-a-production-secret-123";
  process.env.APP_URL = "https://access.sixcore.com.br";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://remote.sixcore.com.br/private/v1/network/check");
    assert.equal(init?.method, "POST");
    const headers = init?.headers as Record<string, string>;
    assert.equal(headers.origin, "https://access.sixcore.com.br");
    assert.equal(headers.authorization, `Bearer ${process.env.GATEWAY_API_KEY}`);
    assert.deepEqual(JSON.parse(String(init?.body)), { realIp: "172.18.18.209", port: 22333 });
    return new Response(JSON.stringify({ reachable: true, port: 22333, latencyMs: 201, reason: null }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const result = await checkGatewayTcp("172.18.18.209", 22333);
    assert.equal(result.reachable, true);
    assert.equal(result.latencyMs, 201);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
