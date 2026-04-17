// Dashboard page

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  exportBookings as apiExportBookings,
  getFavorites as apiGetFavorites,
} from "../api";
import { BulkBookModal } from "../components/BulkBookModal";
import { FavoritesSection } from "../components/FavoritesSection";
import {
  ArrowRightIcon,
  BookingCardSkeleton,
  CalendarExportIcon,
  CalendarIcon,
  CheckIcon,
  EmptyState,
  ErrorAlert,
  PlusIcon,
  RefreshIcon,
  UsersIcon,
} from "../components/ui";
import { computeDateForWeek, isDateToday, parseDate } from "../core/utils";
import { useDataCache } from "../DataCacheContext";
import type {
  AccountSummary,
  CurrentBookingInfo,
  Favorite,
  FavoriteWithAvailability,
  WeekAvailability,
} from "../types";

const _DAY_NAMES = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

interface ScheduleData {
  weekOffset: number;
  courts: {
    courtId: number;
    slots: {
      dayIndex: number;
      time: string;
      bookedBy: string | null;
      isOurs: boolean;
      ourAccountId: string | null;
    }[];
  }[];
}

export function Dashboard() {
  const navigate = useNavigate();
  const { getSchedule, getAccounts, refresh, staleKeys } = useDataCache();
  const [bookings, setBookings] = useState<CurrentBookingInfo[]>([]);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showBulkBookModal, setShowBulkBookModal] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [s0, s1, a, f] = await Promise.all([
        getSchedule(0),
        getSchedule(1),
        getAccounts(),
        apiGetFavorites(),
      ]);

      setSchedules([
        { weekOffset: 0, courts: s0.courts },
        { weekOffset: 1, courts: s1.courts },
      ]);

      const allSlots = [s0, s1].flatMap((s) =>
        s.courts.flatMap((court) =>
          court.slots
            .filter((slot) => slot.isOurs)
            .map((slot) => {
              const acc = a.find((ac) => ac.id === slot.ourAccountId);
              return {
                accountId: slot.ourAccountId ?? "",
                username: acc?.username ?? slot.bookedBy ?? "",
                displayName: acc?.displayName ?? slot.bookedBy ?? "",
                courtId: court.courtId,
                booking: {
                  nome: slot.bookedByName ?? "",
                  date: slot.date,
                  time: slot.time,
                },
              };
            }),
        ),
      );

      const now = new Date();
      const sorted = allSlots
        .filter((x) => {
          const [dd = 0, mm = 1, yyyy = 1970] = x.booking.date
            .split("-")
            .map(Number);
          const [hh = 0, min = 0] = x.booking.time.split(":").map(Number);
          const expiresAt = new Date(yyyy, mm - 1, dd, hh + 1, min);
          return expiresAt > now;
        })
        .sort((x, y) => {
          const dateA = x.booking.date.split("-").reverse().join("");
          const dateB = y.booking.date.split("-").reverse().join("");
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          return (x.booking.time ?? "").localeCompare(y.booking.time ?? "");
        });

      setBookings(sorted);
      setAccounts(a);
      setFavorites(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    await refresh();
    await loadData();
  };

  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      const blob = await apiExportBookings();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "riotinto-bookings.ics";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error ao exportar calendário");
    } finally {
      setExporting(false);
    }
  };

  function computeFavoritesWithAvailability(): FavoriteWithAvailability[] {
    const withAvailability = favorites.map((fav) => {
      const thisWeekDate = computeDateForWeek(0, fav.dayOfWeek);
      const nextWeekDate = computeDateForWeek(1, fav.dayOfWeek);

      const thisWeekAvail = getWeekAvailability(fav, 0, thisWeekDate);
      const nextWeekAvail = getWeekAvailability(fav, 1, nextWeekDate);

      const aDate = parseDate(thisWeekDate);
      const bDate = parseDate(nextWeekDate);
      const nextDate =
        aDate && bDate
          ? aDate <= bDate
            ? thisWeekDate
            : nextWeekDate
          : thisWeekDate;

      return {
        ...fav,
        thisWeek: {
          ...thisWeekAvail,
          weekOffset: 0,
          date: thisWeekDate,
        },
        nextWeek: {
          ...nextWeekAvail,
          weekOffset: 1,
          date: nextWeekDate,
        },
        nextDate,
      };
    });

    return withAvailability.sort((a, b) => {
      const aDate = parseDate(a.nextDate);
      const bDate = parseDate(b.nextDate);

      if (aDate && bDate && aDate.getTime() !== bDate.getTime()) {
        return aDate.getTime() - bDate.getTime();
      }

      if (a.time !== b.time) {
        return a.time.localeCompare(b.time);
      }

      if (a.courtId !== b.courtId) {
        return a.courtId - b.courtId;
      }

      const aAccount = accounts.find((acc) => acc.id === a.accountId);
      const bAccount = accounts.find((acc) => acc.id === b.accountId);
      const aName = aAccount?.displayName ?? "";
      const bName = bAccount?.displayName ?? "";
      return aName.localeCompare(bName);
    });
  }

  function getWeekAvailability(
    fav: Favorite,
    weekOffset: number,
    dateStr: string,
  ): Omit<WeekAvailability, "weekOffset" | "date"> {
    const [day, month, year] = dateStr.split("-").map(Number);
    const slotDate = new Date(year ?? 0, (month ?? 1) - 1, day ?? 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = slotDate.getTime() < today.getTime();

    const sched = schedules.find((s) => s.weekOffset === weekOffset);
    if (!sched) {
      return {
        isAvailable: false,
        isBookedByOthers: false,
        isOurBooking: false,
        isPast,
      };
    }

    const court = sched.courts.find((c) => c.courtId === fav.courtId);
    if (!court) {
      return {
        isAvailable: false,
        isBookedByOthers: false,
        isOurBooking: false,
        isPast,
      };
    }

    const slot = court.slots.find(
      (s) => s.dayIndex === fav.dayOfWeek && s.time === fav.time,
    );
    if (!slot) {
      return {
        isAvailable: false,
        isBookedByOthers: false,
        isOurBooking: false,
        isPast,
      };
    }

    if (isPast) {
      return {
        isAvailable: false,
        isBookedByOthers: false,
        isOurBooking: false,
        isPast: true,
      };
    }

    if (slot.isOurs) {
      return {
        isAvailable: false,
        isBookedByOthers: false,
        isOurBooking: true,
        isPast: false,
      };
    }
    if (slot.bookedBy) {
      return {
        isAvailable: false,
        isBookedByOthers: true,
        isOurBooking: false,
        isPast: false,
      };
    }
    return {
      isAvailable: true,
      isBookedByOthers: false,
      isOurBooking: false,
      isPast: false,
    };
  }

  async function handleBookFavorite(
    fav: FavoriteWithAvailability,
    weekOffset: number,
  ) {
    navigate(`/schedule?week=${weekOffset}`, {
      state: {
        preselectedSlot: {
          courtId: fav.courtId,
          dayOfWeek: fav.dayOfWeek,
          time: fav.time,
          accountId: fav.accountId,
        },
      },
    });
  }

  async function handleDeleteFavorite(id: string) {
    const { deleteFavorite } = await import("../api");
    await deleteFavorite(id);
    const f = await apiGetFavorites();
    setFavorites(f);
  }

  async function handleUpdateFavoriteName(id: string, name: string) {
    // Import directly to avoid circular dependency
    const { updateFavorite } = await import("../api");
    await updateFavorite(id, { name });
    const f = await apiGetFavorites();
    setFavorites(f);
  }

  const isDashboardStale =
    staleKeys.has("schedule:0") ||
    staleKeys.has("schedule:1") ||
    staleKeys.has("accounts");

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {bookings.length > 0
              ? `${bookings.length} reserva${bookings.length !== 1 ? "s" : ""} ativa${bookings.length !== 1 ? "s" : ""}`
              : "Nenhuma reserva ativa"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting || bookings.length === 0}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed btn-press"
            title="Exportar para calendário"
          >
            <CalendarExportIcon
              className={`w-5 h-5 ${exporting ? "animate-pulse" : ""}`}
            />
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={`p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed btn-press ${isDashboardStale && !loading ? "animate-pulse" : ""}`}
            title="Atualizar"
          >
            <RefreshIcon
              className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Active Bookings */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider">
              Reservas ativas
            </h2>
          </div>
          <Link
            to="/schedule"
            className="group flex items-center gap-1.5 text-emerald-400 text-sm font-medium hover:text-emerald-300 transition-colors"
          >
            Ver campos
            <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon className="w-8 h-8" />}
            title="Nenhuma reserva ativa"
            description="Não há reservas de campos para os próximos dias."
            action={
              <Link
                to="/schedule"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-all duration-200 btn-press"
              >
                <PlusIcon className="w-4 h-4" />
                Reservar campo
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => {
              const acc = accounts.find((a) => a.id === b.accountId);
              const [dd, mm] = b.booking.date.split("-");
              const today = isDateToday(b.booking.date);

              return (
                <Link
                  key={`${b.accountId}-${b.booking.date}-${b.booking.time}-${b.courtId}`}
                  to="/schedule"
                  className="group bg-slate-800 rounded-xl p-4 flex items-center gap-4 border border-slate-700/50 card-hover"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex flex-col items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-emerald-900/30">
                    <span className="text-lg leading-none">{dd}</span>
                    <span className="text-xs font-medium opacity-80">{mm}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold">
                        Court {b.courtId}
                      </p>
                      {today && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                          Hoje
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-400 text-sm font-medium">
                      {b.booking.time}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {acc?.displayName ?? b.displayName}
                      <span className="text-slate-600"> · </span>
                      <span className="text-slate-500">{b.username}</span>
                    </p>
                  </div>
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="p-2 text-slate-400 group-hover:text-white group-hover:bg-slate-700 rounded-lg transition-colors inline-flex items-center justify-center">
                      <ArrowRightIcon className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Favorites Section */}
      {!loading && favorites.length > 0 && (
        <FavoritesSection
          favorites={computeFavoritesWithAvailability()}
          accounts={accounts.map((a) => ({
            id: a.id,
            displayName: a.displayName,
          }))}
          onBookFavorite={handleBookFavorite}
          onDeleteFavorite={handleDeleteFavorite}
          onUpdateFavoriteName={handleUpdateFavoriteName}
          onOpenBulkBook={() => setShowBulkBookModal(true)}
        />
      )}

      {/* Bulk Book Modal */}
      {showBulkBookModal && (
        <BulkBookModal
          favorites={computeFavoritesWithAvailability()}
          accounts={accounts}
          onClose={() => setShowBulkBookModal(false)}
          onSuccess={() => {
            refresh();
            loadData();
          }}
        />
      )}

      {/* Account Summary */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-slate-500" />
            <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider">
              Contas
            </h2>
          </div>
          <Link
            to="/accounts"
            className="group flex items-center gap-1.5 text-emerald-400 text-sm font-medium hover:text-emerald-300 transition-colors"
          >
            Gerir
            <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {accounts.length === 0 && !loading ? (
          <EmptyState
            icon={<UsersIcon className="w-8 h-8" />}
            title="Nenhuma conta configurada"
            description="Adicione contas riotinto.pt para começar a reservar campos."
            action={
              <Link
                to="/accounts"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-all duration-200 btn-press"
              >
                <PlusIcon className="w-4 h-4" />
                Adicionar conta
              </Link>
            }
          />
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-slate-800 rounded-xl p-4 flex items-center gap-3 border border-slate-700/30"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-700 shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-700 rounded-lg shimmer w-3/4" />
                  <div className="h-3 bg-slate-700 rounded-lg shimmer w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map((acc) => {
              const hasBooking = bookings.some((b) => b.accountId === acc.id);
              return (
                <div
                  key={acc.id}
                  className={`group bg-slate-800 rounded-xl p-4 flex items-center gap-3 border border-slate-700/50 card-hover ${
                    hasBooking ? "ring-1 ring-emerald-500/30" : ""
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 transition-all duration-200 ${
                      hasBooking
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20"
                        : "bg-slate-700"
                    }`}
                  >
                    {acc.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-semibold truncate">
                      {acc.displayName}
                    </p>
                    <p className="text-slate-500 text-xs truncate">
                      {acc.username}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {hasBooking ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                        <CheckIcon className="w-3.5 h-3.5" />
                        Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700 text-slate-400 text-xs">
                        Inativa
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
