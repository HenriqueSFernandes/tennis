// Schedule hook

import { useCallback, useState } from "react";
import { useDataCache } from "../../../DataCacheContext";
import type { ScheduleResponse } from "../../../types";

export function useSchedule(weekOffset: number) {
  const { getSchedule: getCachedSchedule } = useDataCache();
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCachedSchedule(weekOffset);
      setSchedule(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar horário");
    } finally {
      setLoading(false);
    }
  }, [weekOffset, getCachedSchedule]);

  return {
    schedule,
    loading,
    error,
    setError,
    loadSchedule,
  };
}
