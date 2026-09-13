import { headers } from "next/headers";

export async function requestMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || h.get("x-real-ip") || "unknown",
    userAgent: h.get("user-agent") || null
  };
}

export function assertSameOrigin(request: Request) {
  const configured = process.env.APP_URL;
  if (!configured) throw new Error("APP_URL is required");
  const expected = new URL(configured).origin;
  const origin = request.headers.get("origin");
  if (origin !== expected) throw new Error("origin_not_allowed");
}
