import type { Context } from "hono";
import type {
  AddFavoriteRequest,
  UpdateFavoriteRequest,
} from "../../types/index.js";
import {
  addFavorite,
  listFavorites,
  removeFavorite,
  updateFavorite,
} from "../accounts/service.js";

export async function handleListFavorites(c: Context) {
  const accountId = c.req.query("accountId");
  const favorites = listFavorites(accountId ?? undefined);
  return c.json(favorites);
}

export async function handleAddFavorite(c: Context) {
  const body = await c.req.json<AddFavoriteRequest>();
  const { accountId, courtId, dayOfWeek, time, name } = body;

  if (!accountId || courtId === undefined || dayOfWeek === undefined || !time) {
    return c.json(
      {
        error: "Missing required fields: accountId, courtId, dayOfWeek, time",
      },
      400,
    );
  }

  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return c.json({ error: "dayOfWeek must be between 0 and 6" }, 400);
  }

  const result = addFavorite(accountId, courtId, dayOfWeek, time, name);

  if ("error" in result) {
    return c.json({ error: result.error }, 409);
  }

  return c.json(result.favorite, 201);
}

export async function handleUpdateFavorite(c: Context) {
  const id = c.req.param("id")!;
  const body = await c.req.json<UpdateFavoriteRequest>();
  const { name } = body;

  if (!name) {
    return c.json({ error: "Missing required field: name" }, 400);
  }

  const updated = updateFavorite(id, name);
  if (!updated) return c.json({ error: "Favorite not found" }, 404);

  const favorites = listFavorites();
  const favorite = favorites.find((f) => f.id === id);
  return c.json(favorite);
}

export async function handleDeleteFavorite(c: Context) {
  const id = c.req.param("id")!;
  const deleted = removeFavorite(id);
  if (!deleted) return c.json({ error: "Favorite not found" }, 404);
  return c.json({ ok: true });
}
