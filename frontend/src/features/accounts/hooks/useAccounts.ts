// Accounts hook

import { useCallback, useState } from "react";
import { useAuth } from "../../../AuthContext";
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
  const { password } = useAuth();
  const { getAccounts: getCachedAccounts, invalidate } = useDataCache();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAccounts = useCallback(async () => {
    if (!password) return;
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
  }, [password, getCachedAccounts]);

  const addAccount = useCallback(
    async (data: AddAccountRequest): Promise<AccountSummary | null> => {
      if (!password) return null;
      try {
        const newAcc = await apiAddAccount(password, data);
        invalidate("accounts");
        setAccounts((prev) => [...prev, newAcc]);
        return newAcc;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao adicionar conta");
        return null;
      }
    },
    [password, invalidate],
  );

  const deleteAccount = useCallback(
    async (id: string): Promise<boolean> => {
      if (!password) return false;
      try {
        await apiDeleteAccount(password, id);
        invalidate("accounts");
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao remover conta");
        return false;
      }
    },
    [password, invalidate],
  );

  const updateAccount = useCallback(
    async (id: string, data: UpdateAccountRequest): Promise<boolean> => {
      if (!password) return false;
      try {
        const updated = await apiUpdateAccount(password, id, data);
        invalidate("accounts");
        setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao guardar alterações");
        return false;
      }
    },
    [password, invalidate],
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
