import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ErrorAlert } from "../components/ui";
import { getFriendBookings } from "../features/friends/api";
import type { FriendBookingsResponse } from "../features/friends/types";

export function FriendBookings() {
  const { friendId } = useParams<{ friendId: string }>();
  const [data, setData] = useState<FriendBookingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    loadData();
  }, [friendId]);

  async function loadData() {
    if (!friendId) return;
    setLoading(true);
    setError("");
    try {
      const result = await getFriendBookings(friendId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar reservas");
    } finally {
      setLoading(false);
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
                  {booking.hora}
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
