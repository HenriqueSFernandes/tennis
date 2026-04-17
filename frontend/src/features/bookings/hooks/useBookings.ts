// Bookings hook

import { useCallback, useState } from "react";
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
  const [bookings, setBookings] = useState<CurrentBookingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGetBookings();
      setBookings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar reservas");
    } finally {
      setLoading(false);
    }
  }, []);

  const book = useCallback(async (data: BookRequest): Promise<boolean> => {
    try {
      await apiBook(data);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao fazer reserva");
      return false;
    }
  }, []);

  const cancelBook = useCallback(
    async (data: CancelRequest): Promise<boolean> => {
      try {
        await apiCancelBook(data);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao cancelar reserva");
        return false;
      }
    },
    [],
  );

  const exportBookings = useCallback(
    async (accountId?: string): Promise<Blob | null> => {
      try {
        return await apiExportBookings(accountId);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Erro ao exportar calendário",
        );
        return null;
      }
    },
    [],
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
