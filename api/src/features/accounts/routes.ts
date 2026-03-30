import type { Context } from "hono";
import type {
  AddAccountRequest,
  UpdateAccountRequest,
} from "../../types/index.js";
import {
  createAccount,
  editAccount,
  listAccounts,
  removeAccount,
} from "./service.js";

export async function handleListAccounts(c: Context) {
  const accounts = listAccounts();
  return c.json(accounts);
}

export async function handleAddAccount(c: Context) {
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

  const account = await createAccount(body);
  return c.json(account, 201);
}

export async function handleDeleteAccount(c: Context) {
  const id = c.req.param("id")!;
  const deleted = removeAccount(id);
  if (!deleted) return c.json({ error: "Account not found" }, 404);
  return c.json({ ok: true });
}

export async function handleUpdateAccount(c: Context) {
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

  const updated = editAccount(id, body);
  if (!updated) return c.json({ error: "Account not found" }, 404);

  const accounts = listAccounts();
  const account = accounts.find((a) => a.id === id);
  return c.json(account);
}
