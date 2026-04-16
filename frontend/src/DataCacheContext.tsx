import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  getAccounts as apiGetAccounts,
  getSchedule as apiGetSchedule,
} from "./api";
import type { AccountSummary, ScheduleResponse } from "./types";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

type CacheState = {
  schedule: Map<number, CacheEntry<ScheduleResponse>>;
  accounts: CacheEntry<AccountSummary[]> | null;
};

type StaleKeys = Set<string>;

interface DataCacheContextValue {
  getSchedule(weekOffset: number): Promise<ScheduleResponse>;
  getAccounts(): Promise<AccountSummary[]>;
  invalidate(key?: string): void;
  isStale(key: string): boolean;
  refresh(): Promise<void>;
  staleKeys: StaleKeys;
}

const DataCacheContext = createContext<DataCacheContextValue | null>(null);

export function DataCacheProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const cacheRef = useRef<CacheState>({
    schedule: new Map(),
    accounts: null,
  });
  const [staleKeys, setStaleKeys] = useState<StaleKeys>(new Set());

  const isStale = useCallback(
    (key: string): boolean => {
      return staleKeys.has(key);
    },
    [staleKeys],
  );

  const invalidate = useCallback((key?: string) => {
    if (key) {
      if (key.startsWith("schedule:")) {
        const offset = parseInt(key.split(":")[1] ?? "0", 10);
        cacheRef.current.schedule.delete(offset);
      } else if (key === "accounts") {
        cacheRef.current.accounts = null;
      }
      setStaleKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } else {
      cacheRef.current.schedule.clear();
      cacheRef.current.accounts = null;
      setStaleKeys(new Set());
    }
  }, []);

  const fetchSchedule = useCallback(
    async (weekOffset: number): Promise<ScheduleResponse> => {
      if (!isAuthenticated) throw new Error("Not authenticated");

      const cached = cacheRef.current.schedule.get(weekOffset);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }

      const data = await apiGetSchedule(weekOffset);
      cacheRef.current.schedule.set(weekOffset, {
        data,
        timestamp: Date.now(),
      });
      return data;
    },
    [isAuthenticated],
  );

  const fetchAccounts = useCallback(async (): Promise<AccountSummary[]> => {
    if (!isAuthenticated) throw new Error("Not authenticated");

    const cached = cacheRef.current.accounts;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const data = await apiGetAccounts();
    cacheRef.current.accounts = {
      data,
      timestamp: Date.now(),
    };
    return data;
  }, [isAuthenticated]);

  const refresh = useCallback(async (): Promise<void> => {
    invalidate();
    if (!isAuthenticated) return;

    const keys: string[] = [];

    try {
      const [s0, s1, a] = await Promise.all([
        apiGetSchedule(0),
        apiGetSchedule(1),
        apiGetAccounts(),
      ]);
      cacheRef.current.schedule.set(0, { data: s0, timestamp: Date.now() });
      cacheRef.current.schedule.set(1, { data: s1, timestamp: Date.now() });
      cacheRef.current.accounts = { data: a, timestamp: Date.now() };
    } catch (err) {
      keys.push("schedule:0", "schedule:1", "accounts");
      setStaleKeys(new Set(keys));
      throw err;
    }
  }, [invalidate, isAuthenticated]);

  const getSchedule = useCallback(
    async (weekOffset: number): Promise<ScheduleResponse> => {
      try {
        return await fetchSchedule(weekOffset);
      } catch (e) {
        const cached = cacheRef.current.schedule.get(weekOffset);
        if (cached) {
          setStaleKeys((prev) => new Set(prev).add(`schedule:${weekOffset}`));
          return cached.data;
        }
        throw e;
      }
    },
    [fetchSchedule],
  );

  const getAccounts = useCallback(async (): Promise<AccountSummary[]> => {
    try {
      return await fetchAccounts();
    } catch (e) {
      if (cacheRef.current.accounts) {
        setStaleKeys((prev) => new Set(prev).add("accounts"));
        return cacheRef.current.accounts.data;
      }
      throw e;
    }
  }, [fetchAccounts]);

  return (
    <DataCacheContext.Provider
      value={{
        getSchedule,
        getAccounts,
        invalidate,
        isStale,
        refresh,
        staleKeys,
      }}
    >
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache(): DataCacheContextValue {
  const ctx = useContext(DataCacheContext);
  if (!ctx)
    throw new Error("useDataCache must be used within DataCacheProvider");
  return ctx;
}
