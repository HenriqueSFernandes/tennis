import type { Context } from "hono";
import type {
  AddAccountRequest,
  UpdateAccountRequest,
} from "../../types/index.js";
import { getUserIdFromContext } from "../auth/middleware.js";
import {
  createAccount,
  editAccount,
  listAccounts,
  removeAccount,
} from "./service.js";

export async function handleListAccounts(c: Context) {
  const userId = getUserIdFromContext(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const accounts = await listAccounts(userId);
  return c.json(accounts);
}

export async function handleAddAccount(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json<AddAccountRequest>();
    const { username, password, displayName, phone } = body;

    if (!username || !password || !displayName || !phone) {
      return c.json(
        {
          error:
            "Missing required fields: username, password, displayName, phone",
        },
        400,
      );
    }

    if (!/^\d{9}$/.test(phone)) {
      return c.json({ error: "Phone must be exactly 9 digits" }, 400);
    }

    const account = await createAccount(userId, body);
    return c.json(account, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Account error: ${message}` }, 500);
  }
}

export async function handleDeleteAccount(c: Context) {
  const userId = getUserIdFromContext(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id")!;
  const deleted = await removeAccount(userId, id);
  if (!deleted) return c.json({ error: "Account not found" }, 404);
  return c.json({ ok: true });
}

export async function handleUpdateAccount(c: Context) {
  const userId = getUserIdFromContext(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id")!;
  const body = await c.req.json<UpdateAccountRequest>();
  const { displayName, phone } = body;

  if (!displayName || !phone) {
    return c.json(
      { error: "Missing required fields: displayName, phone" },
      400,
    );
  }

  if (!/^\d{9}$/.test(phone)) {
    return c.json({ error: "Phone must be exactly 9 digits" }, 400);
  }

  const updated = await editAccount(userId, id, body);
  if (!updated) return c.json({ error: "Account not found" }, 404);

  const accounts = await listAccounts(userId);
  const account = accounts.find((a) => a.id === id);
  return c.json(account);
}
