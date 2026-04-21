import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ErrorAlert } from "../components/ui";
import { getFriendBookings } from "../features/friends/api";
import type { FriendBookingsResponse } from "../features/friends/types";

export function FriendBookings() {
  const { friendId } = useParams<{ friendId: string }>();
  const [data, setData] = useState<FriendBookingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const refreshingRef = useRef(false);

  useEffect(() => {
    void loadData();
  }, [friendId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (refreshingRef.current) return;
      void loadData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [friendId]);

  async function loadData(silent = false) {
    if (!friendId) return;
    if (silent && refreshingRef.current) return;

    if (silent) {
      refreshingRef.current = true;
      setRefreshing(true);
    } else {
      setLoading(true);
      setError("");
    }

    try {
      const result = await getFriendBookings(friendId);
      setData(result);
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "Erro ao carregar reservas");
      }
    } finally {
      if (silent) {
        refreshingRef.current = false;
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }

  const _formatDate = (dateStr: string) => {
    const [dd, mm] = dateStr.split("-");
    return `${dd}/${mm}`;
  };

  const formatTimeAgo = (isoString: string) => {
    if (!isoString) return "Nunca";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `${diffMins} min atrás`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold">
            Reservas de {data?.friend.displayName ?? "..."}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            @{data?.friend.username}
            {data?.lastSynced && (
              <span className="text-slate-500">
                {" "}
                · Atualizado {formatTimeAgo(data.lastSynced)}
              </span>
            )}
            {data?.isStale && (
              <span className="text-amber-400 text-xs ml-2">
                (dados podem estar desatualizados)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => void loadData(true)}
          disabled={refreshing}
          className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Atualizar"
        >
          <RefreshIcon
            className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700/30"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-slate-700 shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-700 rounded-lg shimmer w-1/3" />
                  <div className="h-3 bg-slate-700 rounded-lg shimmer w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.bookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400 text-sm">Sem reservas para mostrar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.bookings.map((booking) => (
            <div
              key={`${booking.accountId}-${booking.date}-${booking.hora}`}
              className="bg-slate-800 rounded-xl p-4 flex items-center gap-4 border border-slate-700/50"
            >
              <div className="w-14 h-14 rounded-xl bg-linear-to-br from-violet-600 to-purple-700 flex flex-col items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-violet-900/30">
                <span className="text-lg leading-none">
                  {booking.date.split("-")[0]}
                </span>
                <span className="text-xs font-medium opacity-80">
                  {booking.date.split("-")[1]}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-semibold">
                  Court {booking.courtId}
                </p>
                <p className="text-violet-400 text-sm font-medium">
                  {booking.time}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {booking.accountDisplayName}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}
