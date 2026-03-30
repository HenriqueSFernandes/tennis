import type { Context, Next } from "hono";
import { APP_PASSWORD, isOriginAllowed } from "../../config/index.js";

export async function authMiddleware(c: Context, next: Next) {
  if (c.req.path === "/api/auth") return next();

  const provided = c.req.header("X-App-Password");
  if (!provided || provided !== APP_PASSWORD) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
}

export function corsMiddleware() {
  return async (c: Context, next: Next) => {
    const origin = c.req.header("origin");

    if (isOriginAllowed(origin)) {
      c.header("Access-Control-Allow-Origin", origin ?? "*");
    }

    c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, X-App-Password");

    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    return next();
  };
}
