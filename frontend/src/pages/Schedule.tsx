import { useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  addFavorite,
  book,
  cancelBook,
  deleteFavorite,
  getFavorites,
} from "../api";
import { AddFavoriteModal } from "../components/AddFavoriteModal";
import { BookingModal, CancelModal } from "../components/BookingModal";
import { CourtGrid } from "../components/CourtGrid";
import { useDataCache } from "../DataCacheContext";
import type {
  AccountSummary,
  Favorite,
  ScheduleResponse,
  ScheduleSlot,
} from "../types";

const WEEK_LABELS = ["Esta semana", "Próxima semana"];

export function Schedule() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { getSchedule, getAccounts, invalidate, refresh, staleKeys } =
    useDataCache();
  const [weekOffset, setWeekOffset] = useState(() => {
    const weekParam = searchParams.get("week");
    return weekParam ? parseInt(weekParam, 10) : 0;
  });
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekDirection, setWeekDirection] = useState<"next" | "prev" | null>(
    null,
  );

  // Modal state
  const [bookSlot, setBookSlot] = useState<ScheduleSlot | null>(null);
  const [bookCourtId, setBookCourtId] = useState<number | null>(null);
  const [bookPreselectedAccountId, setBookPreselectedAccountId] = useState<
    string | undefined
  >(undefined);
  const [cancelSlot, setCancelSlot] = useState<ScheduleSlot | null>(null);
  const [cancelCourtId, setCancelCourtId] = useState<number | null>(null);
  const [addFavoriteSlot, setAddFavoriteSlot] = useState<ScheduleSlot | null>(
    null,
  );
  const [addFavoriteCourtId, setAddFavoriteCourtId] = useState<number | null>(
    null,
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, a, f] = await Promise.all([
        getSchedule(weekOffset),
        getAccounts(),
        getFavorites(),
      ]);
      setSchedule(s);
      setAccounts(a);
      setFavorites(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar horário");
    } finally {
      setLoading(false);
    }
  }, [weekOffset, getSchedule, getAccounts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (weekDirection) {
      const timer = setTimeout(() => setWeekDirection(null), 250);
      return () => clearTimeout(timer);
    }
  }, [weekDirection]);

  // Handle preselected slot from navigation (e.g., from favorites)
  useEffect(() => {
    if (!schedule || loading) return;
    const state = location.state as {
      preselectedSlot?: {
        courtId: number;
        dayOfWeek: number;
        time: string;
        accountId?: string;
      };
    } | null;
    if (!state?.preselectedSlot) return;

    const { courtId, dayOfWeek, time, accountId } = state.preselectedSlot;
    const court = schedule.courts.find((c) => c.courtId === courtId);
    if (!court) return;

    const slot = court.slots.find(
      (s) => s.dayIndex === dayOfWeek && s.time === time,
    );
    if (!slot) return;

    // Clear the location state to prevent re-opening on re-renders
    window.history.replaceState({}, "");

    // Open booking modal if slot is available
    if (!slot.isOurs && !slot.bookedBy) {
      setBookSlot(slot);
      setBookCourtId(courtId);
      setBookPreselectedAccountId(accountId);
    }
  }, [schedule, loading, location.state]);

  const handleRefresh = async () => {
    await refresh();
    await loadData();
  };

  const isScheduleStale = staleKeys.has(`schedule:${weekOffset}`);

  function handleSlotClick(slot: ScheduleSlot, courtId: number) {
    if (slot.isOurs) {
      setCancelSlot(slot);
      setCancelCourtId(courtId);
    } else if (!slot.bookedBy) {
      setBookSlot(slot);
      setBookCourtId(courtId);
    }
  }

  async function handleToggleFavorite(
    slot: ScheduleSlot,
    courtId: number,
    isFavorited: boolean,
  ) {
    if (isFavorited) {
      const fav = favorites.find(
        (f) =>
          f.dayOfWeek === slot.dayIndex &&
          f.time === slot.time &&
          f.courtId === courtId,
      );
      if (fav) {
        await deleteFavorite(fav.id);
      }
      const f = await getFavorites();
      setFavorites(f);
    } else {
      setAddFavoriteSlot(slot);
      setAddFavoriteCourtId(courtId);
    }
  }

  async function handleAddFavorite(accountId: string) {
    if (!addFavoriteSlot || !addFavoriteCourtId) return;
    await addFavorite({
      accountId,
      courtId: addFavoriteCourtId,
      dayOfWeek: addFavoriteSlot.dayIndex,
      time: addFavoriteSlot.time,
    });
    setAddFavoriteSlot(null);
    setAddFavoriteCourtId(null);
    const f = await getFavorites();
    setFavorites(f);
  }

  async function handleBook(accountId: string) {
    if (!bookSlot || !bookCourtId) return;
    await book({
      accountId,
      courtId: bookCourtId,
      date: bookSlot.date,
      dayIndex: bookSlot.dayIndex,
      turno: bookSlot.turno,
      hora: bookSlot.hora,
      semana: weekOffset,
    });
    invalidate(`schedule:${weekOffset}`);
    setBookSlot(null);
    setBookCourtId(null);
    setBookPreselectedAccountId(undefined);
    await loadData();
  }

  async function handleCancel() {
    if (!cancelSlot || !cancelCourtId) return;
    await cancelBook({
      accountId: cancelSlot.ourAccountId ?? "",
      courtId: cancelCourtId,
      date: cancelSlot.date,
      dayIndex: cancelSlot.dayIndex,
      turno: cancelSlot.turno,
      hora: cancelSlot.hora,
      semana: weekOffset,
    });
    invalidate(`schedule:${weekOffset}`);
    setCancelSlot(null);
    setCancelCourtId(null);
    await loadData();
  }

  const bookSlotCourt =
    bookSlot && bookCourtId
      ? schedule?.courts.find((c) => c.courtId === bookCourtId)
      : null;

  const cancelSlotCourt =
    cancelSlot && cancelCourtId
      ? schedule?.courts.find((c) => c.courtId === cancelCourtId)
      : null;

  const addFavoriteSlotCourt =
    addFavoriteSlot && addFavoriteCourtId
      ? schedule?.courts.find((c) => c.courtId === addFavoriteCourtId)
      : null;

  const cancelAccountName = cancelSlot?.ourAccountId
    ? (accounts.find((a) => a.id === cancelSlot.ourAccountId)?.displayName ??
      "?")
    : "?";

  // Count our bookings this week
  const ourBookingsCount =
    schedule?.courts.reduce((total, court) => {
      return total + court.slots.filter((slot) => slot.isOurs).length;
    }, 0) ?? 0;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Campos</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {ourBookingsCount > 0
              ? `${ourBookingsCount} reserva${ourBookingsCount !== 1 ? "s" : ""} esta semana`
              : "Sem reservas nesta semana"}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className={`p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed btn-press ${isScheduleStale && !loading ? "animate-pulse" : ""}`}
          title="Atualizar"
        >
          <RefreshIcon className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Week Navigation */}
      <div className="bg-slate-800 rounded-2xl p-2 border border-slate-700/50">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setWeekDirection("prev");
              setWeekOffset((w) => Math.max(0, w - 1));
            }}
            disabled={weekOffset === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-200 btn-press"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">
              Anterior
            </span>
          </button>

          <span className="text-white font-semibold">
            {WEEK_LABELS[weekOffset] ?? `Semana +${weekOffset}`}
          </span>

          <button
            onClick={() => {
              setWeekDirection("next");
              setWeekOffset((w) => Math.min(1, w + 1));
            }}
            disabled={weekOffset >= 1}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-200 btn-press"
          >
            <span className="hidden sm:inline text-sm font-medium">
              Seguinte
            </span>
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Week Progress Indicator */}
        <div className="flex gap-1.5 mt-3 px-2 pb-1">
          {[0, 1].map((offset) => (
            <button
              key={offset}
              onClick={() => {
                setWeekDirection(offset > weekOffset ? "next" : "prev");
                setWeekOffset(offset);
              }}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                offset === weekOffset
                  ? "bg-emerald-500"
                  : "bg-slate-700 hover:bg-slate-600"
              }`}
              aria-label={`Ir para ${WEEK_LABELS[offset]}`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-4 text-sm flex items-start gap-3">
          <AlertIcon className="w-5 h-5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-5">
          {[1, 2].map((i) => (
            <CourtGridSkeleton key={i} />
          ))}
        </div>
      ) : schedule ? (
        <div
          key={`week-${weekOffset}`}
          className={`space-y-5 ${weekDirection ? `week-transition-${weekDirection}` : ""}`}
        >
          {schedule.courts.map((court) => (
            <CourtGrid
              key={court.courtId}
              schedule={court}
              accounts={accounts}
              favorites={favorites}
              onSlotClick={handleSlotClick}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      ) : null}

      {/* Booking Modal */}
      {bookSlot && bookSlotCourt && (
        <BookingModal
          slot={bookSlot}
          courtName={bookSlotCourt.courtName}
          accounts={accounts}
          preselectedAccountId={bookPreselectedAccountId}
          onConfirm={handleBook}
          onCancel={() => {
            setBookSlot(null);
            setBookPreselectedAccountId(undefined);
          }}
        />
      )}

      {/* Cancel Modal */}
      {cancelSlot && cancelSlotCourt && (
        <CancelModal
          slot={cancelSlot}
          courtName={cancelSlotCourt.courtName}
          accountName={cancelAccountName}
          onConfirm={handleCancel}
          onCancel={() => setCancelSlot(null)}
        />
      )}

      {/* Add Favorite Modal */}
      {addFavoriteSlot && addFavoriteSlotCourt && (
        <AddFavoriteModal
          slot={addFavoriteSlot}
          courtName={addFavoriteSlotCourt.courtName}
          accounts={accounts}
          preselectedAccountId={
            addFavoriteSlot.isOurs ? addFavoriteSlot.ourAccountId : undefined
          }
          onConfirm={handleAddFavorite}
          onCancel={() => {
            setAddFavoriteSlot(null);
            setAddFavoriteCourtId(null);
          }}
        />
      )}
    </div>
  );
}

// Skeleton Components

function CourtGridSkeleton() {
  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700/30">
      <div className="px-4 py-4 border-b border-slate-700/50">
        <div className="h-5 bg-slate-700 rounded-lg shimmer w-1/4" />
      </div>
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-12 h-8 bg-slate-700 rounded-lg shimmer" />
            {[1, 2, 3, 4, 5, 6, 7].map((j) => (
              <div
                key={j}
                className="flex-1 h-8 bg-slate-700 rounded-lg shimmer"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Icon Components

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

function ChevronLeftIcon({ className }: { className?: string }) {
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
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
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
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
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
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
