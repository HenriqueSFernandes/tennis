// Favorites hook

import { useCallback, useState } from "react";
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
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGetFavorites();
      setFavorites(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar favoritos");
    } finally {
      setLoading(false);
    }
  }, []);

  const addFavorite = useCallback(
    async (data: AddFavoriteRequest): Promise<Favorite | null> => {
      try {
        const newFav = await apiAddFavorite(data);
        setFavorites((prev) => [...prev, newFav]);
        return newFav;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao adicionar favorito");
        return null;
      }
    },
    [],
  );

  const updateFavorite = useCallback(
    async (id: string, data: UpdateFavoriteRequest): Promise<boolean> => {
      try {
        const updated = await apiUpdateFavorite(id, data);
        setFavorites((prev) => prev.map((f) => (f.id === id ? updated : f)));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao atualizar favorito");
        return false;
      }
    },
    [],
  );

  const deleteFavorite = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiDeleteFavorite(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover favorito");
      return false;
    }
  }, []);

  const bulkBook = useCallback(
    async (data: BulkBookRequest): Promise<BulkBookResult | null> => {
      try {
        return await apiBulkBook(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro na reserva múltipla");
        return null;
      }
    },
    [],
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
