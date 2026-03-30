// Favorites hook

import { useCallback, useState } from "react";
import { useAuth } from "../../../AuthContext";
import type {
  AddFavoriteRequest,
  BulkBookRequest,
  BulkBookResult,
  Favorite,
  UpdateFavoriteRequest,
} from "../../../types";
import {
  addFavorite as apiAddFavorite,
  bulkBook as apiBulkBook,
  deleteFavorite as apiDeleteFavorite,
  getFavorites as apiGetFavorites,
  updateFavorite as apiUpdateFavorite,
} from "../api";

export function useFavorites() {
  const { password } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFavorites = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiGetFavorites(password);
      setFavorites(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar favoritos");
    } finally {
      setLoading(false);
    }
  }, [password]);

  const addFavorite = useCallback(
    async (data: AddFavoriteRequest): Promise<Favorite | null> => {
      if (!password) return null;
      try {
        const newFav = await apiAddFavorite(password, data);
        setFavorites((prev) => [...prev, newFav]);
        return newFav;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao adicionar favorito");
        return null;
      }
    },
    [password],
  );

  const updateFavorite = useCallback(
    async (id: string, data: UpdateFavoriteRequest): Promise<boolean> => {
      if (!password) return false;
      try {
        const updated = await apiUpdateFavorite(password, id, data);
        setFavorites((prev) => prev.map((f) => (f.id === id ? updated : f)));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao atualizar favorito");
        return false;
      }
    },
    [password],
  );

  const deleteFavorite = useCallback(
    async (id: string): Promise<boolean> => {
      if (!password) return false;
      try {
        await apiDeleteFavorite(password, id);
        setFavorites((prev) => prev.filter((f) => f.id !== id));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao remover favorito");
        return false;
      }
    },
    [password],
  );

  const bulkBook = useCallback(
    async (data: BulkBookRequest): Promise<BulkBookResult | null> => {
      if (!password) return null;
      try {
        return await apiBulkBook(password, data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro na reserva múltipla");
        return null;
      }
    },
    [password],
  );

  return {
    favorites,
    loading,
    error,
    setError,
    loadFavorites,
    addFavorite,
    updateFavorite,
    deleteFavorite,
    bulkBook,
  };
}
