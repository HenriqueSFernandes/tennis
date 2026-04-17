import type { Context, Next } from "hono";
import { auth } from "../../utils/auth.js";

export async function authMiddleware(c: Context, next: Next) {
  // Better Auth handles session validation automatically
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Store user info in context for later use
  c.set("userId", session.user.id);
  c.set("user", session.user);

  await next();
}

export function getUserIdFromContext(c: Context): string | null {
  return c.get("userId") ?? null;
}

export function getUserFromContext(c: Context) {
  return c.get("user");
}
