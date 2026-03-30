// Bookings hook

import { useCallback, useState } from "react";
import { useAuth } from "../../../AuthContext";
import type {
  BookRequest,
  CancelRequest,
  CurrentBookingInfo,
} from "../../../types";
import {
  book as apiBook,
  cancelBook as apiCancelBook,
  exportBookings as apiExportBookings,
  getBookings as apiGetBookings,
} from "../api";

export function useBookings() {
  const { password } = useAuth();
  const [bookings, setBookings] = useState<CurrentBookingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookings = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiGetBookings(password);
      setBookings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar reservas");
    } finally {
      setLoading(false);
    }
  }, [password]);

  const book = useCallback(
    async (data: BookRequest): Promise<boolean> => {
      if (!password) return false;
      try {
        await apiBook(password, data);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao fazer reserva");
        return false;
      }
    },
    [password],
  );

  const cancelBook = useCallback(
    async (data: CancelRequest): Promise<boolean> => {
      if (!password) return false;
      try {
        await apiCancelBook(password, data);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao cancelar reserva");
        return false;
      }
    },
    [password],
  );

  const exportBookings = useCallback(
    async (accountId?: string): Promise<Blob | null> => {
      if (!password) return null;
      try {
        return await apiExportBookings(password, accountId);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Erro ao exportar calendário",
        );
        return null;
      }
    },
    [password],
  );

  return {
    bookings,
    loading,
    error,
    setError,
    loadBookings,
    book,
    cancelBook,
    exportBookings,
  };
}
