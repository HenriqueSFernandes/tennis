// Accounts hook

import { useCallback, useState } from "react";
import { useDataCache } from "../../../DataCacheContext";
import type {
  AccountSummary,
  AddAccountRequest,
  UpdateAccountRequest,
} from "../../../types";
import {
  addAccount as apiAddAccount,
  deleteAccount as apiDeleteAccount,
  updateAccount as apiUpdateAccount,
} from "../api";

export function useAccounts() {
  const { getAccounts: getCachedAccounts, invalidate } = useDataCache();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCachedAccounts();
      setAccounts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar contas");
    } finally {
      setLoading(false);
    }
  }, [getCachedAccounts]);

  const addAccount = useCallback(
    async (data: AddAccountRequest): Promise<AccountSummary | null> => {
      try {
        const newAcc = await apiAddAccount(data);
        invalidate("accounts");
        setAccounts((prev) => [...prev, newAcc]);
        return newAcc;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao adicionar conta");
        return null;
      }
    },
    [invalidate],
  );

  const deleteAccount = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await apiDeleteAccount(id);
        invalidate("accounts");
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao remover conta");
        return false;
      }
    },
    [invalidate],
  );

  const updateAccount = useCallback(
    async (id: string, data: UpdateAccountRequest): Promise<boolean> => {
      try {
        const updated = await apiUpdateAccount(id, data);
        invalidate("accounts");
        setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao guardar alterações");
        return false;
      }
    },
    [invalidate],
  );

  return {
    accounts,
    loading,
    error,
    setError,
    loadAccounts,
    addAccount,
    deleteAccount,
    updateAccount,
  };
}
