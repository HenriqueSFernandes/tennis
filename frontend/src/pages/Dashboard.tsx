import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import {
  deleteFavorite,
  exportBookings,
  getFavorites,
  updateFavorite,
} from "../api";
import { BulkBookModal } from "../components/BulkBookModal";
import { FavoritesSection } from "../components/FavoritesSection";
import { useDataCache } from "../DataCacheContext";
import type {
  AccountSummary,
  CurrentBookingInfo,
  Favorite,
  FavoriteWithAvailability,
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

export function Dashboard() {
  const { password } = useAuth();
  const navigate = useNavigate();
  const { getSchedule, getAccounts, refresh, staleKeys } = useDataCache();
  const [bookings, setBookings] = useState<CurrentBookingInfo[]>([]);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [schedules, setSchedules] = useState<
    {
      weekOffset: number;
      courts: {
        courtId: number;
        slots: {
          dayIndex: number;
          time: string;
          bookedBy: string | null;
          isOurs: boolean;
        }[];
      }[];
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showBulkBookModal, setShowBulkBookModal] = useState(false);

  async function loadData() {
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const [s0, s1, s2, a, f] = await Promise.all([
        getSchedule(0),
        getSchedule(1),
        getSchedule(2),
        getAccounts(),
        getFavorites(password),
      ]);

      setSchedules([
        { weekOffset: 0, courts: s0.courts },
        { weekOffset: 1, courts: s1.courts },
        { weekOffset: 2, courts: s2.courts },
      ]);

      const allSlots = [s0, s1, s2].flatMap((s) =>
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
      setError(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [password, getSchedule, getAccounts]);

  const handleRefresh = async () => {
    await refresh();
    await loadData();
  };

  const handleExport = async () => {
    if (!password) return;
    setExporting(true);
    setError("");
    try {
      const blob = await exportBookings(password);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "riotinto-bookings.ics";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao exportar calendário");
    } finally {
      setExporting(false);
    }
  };

  function computeDateForWeek(weekOffset: number, dayOfWeek: number): string {
    const today = new Date();
    const todayDay = today.getDay();
    const todayMon = todayDay === 0 ? 6 : todayDay - 1; // Convert to Mon=0, Sun=6

    // Find Monday of current week
    const daysSinceMonday = todayMon;
    const startOfCurrentWeek = new Date(today);
    startOfCurrentWeek.setDate(today.getDate() - daysSinceMonday);

    // Go to Monday of target week (offset 0 = this week, offset 1 = next week, etc.)
    const startOfTargetWeek = new Date(startOfCurrentWeek);
    startOfTargetWeek.setDate(startOfCurrentWeek.getDate() + weekOffset * 7);

    // Add days to reach target day
    const targetDate = new Date(startOfTargetWeek);
    targetDate.setDate(startOfTargetWeek.getDate() + dayOfWeek);

    return `${String(targetDate.getDate()).padStart(2, "0")}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${targetDate.getFullYear()}`;
  }

  function getWeekAvailability(
    fav: Favorite,
    weekOffset: number,
    dateStr: string,
  ): {
    isAvailable: boolean;
    isBookedByOthers: boolean;
    isOurBooking: boolean;
    isPast: boolean;
  } {
    // Check if date is in the past
    const [day, month, year] = dateStr.split("-").map(Number);
    const slotDate = new Date(year ?? 0, (month ?? 1) - 1, day ?? 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = slotDate.getTime() < today.getTime();

    const sched = schedules.find((s) => s.weekOffset === weekOffset);
    if (!sched) {
      // No data for this week - if date is in past, mark as past
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
      // Slot not found in schedule - if date is in past, mark as past
      return {
        isAvailable: false,
        isBookedByOthers: false,
        isOurBooking: false,
        isPast,
      };
    }

    // If slot date is in the past, it's not available
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

  function computeFavoritesWithAvailability(): FavoriteWithAvailability[] {
    const withAvailability = favorites.map((fav) => {
      const thisWeekDate = computeDateForWeek(0, fav.dayOfWeek);
      const nextWeekDate = computeDateForWeek(1, fav.dayOfWeek);

      const thisWeekAvail = getWeekAvailability(fav, 0, thisWeekDate);
      const nextWeekAvail = getWeekAvailability(fav, 1, nextWeekDate);

      // nextDate for sorting: earlier of the two
      const [aDay, aMonth, aYear] = thisWeekDate.split("-").map(Number);
      const [bDay, bMonth, bYear] = nextWeekDate.split("-").map(Number);
      const aDate = new Date(aYear ?? 0, (aMonth ?? 1) - 1, aDay ?? 0);
      const bDate = new Date(bYear ?? 0, (bMonth ?? 1) - 1, bDay ?? 0);
      const nextDate = aDate <= bDate ? thisWeekDate : nextWeekDate;

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
      // Parse nextDate to compare
      const [aDay, aMonth, aYear] = a.nextDate.split("-").map(Number);
      const [bDay, bMonth, bYear] = b.nextDate.split("-").map(Number);
      const aDate = new Date(aYear ?? 0, (aMonth ?? 1) - 1, aDay ?? 0);
      const bDate = new Date(bYear ?? 0, (bMonth ?? 1) - 1, bDay ?? 0);

      // 1. Sort by date
      if (aDate.getTime() !== bDate.getTime()) {
        return aDate.getTime() - bDate.getTime();
      }

      // 2. Sort by time
      if (a.time !== b.time) {
        return a.time.localeCompare(b.time);
      }

      // 3. Sort by court
      if (a.courtId !== b.courtId) {
        return a.courtId - b.courtId;
      }

      // 4. Sort by account name
      const aAccount = accounts.find((acc) => acc.id === a.accountId);
      const bAccount = accounts.find((acc) => acc.id === b.accountId);
      const aName = aAccount?.displayName ?? "";
      const bName = bAccount?.displayName ?? "";
      return aName.localeCompare(bName);
    });
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
        },
      },
    });
  }

  async function handleDeleteFavorite(id: string) {
    if (!password) return;
    await deleteFavorite(password, id);
    const f = await getFavorites(password);
    setFavorites(f);
  }

  async function handleUpdateFavoriteName(id: string, name: string) {
    if (!password) return;
    await updateFavorite(password, id, { name });
    const f = await getFavorites(password);
    setFavorites(f);
  }

  const isDashboardStale =
    staleKeys.has("schedule:0") ||
    staleKeys.has("schedule:1") ||
    staleKeys.has("schedule:2") ||
    staleKeys.has("accounts");

  const _bookedAccountsCount = new Set(bookings.map((b) => b.accountId)).size;

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

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-4 text-sm flex items-start gap-3 animate-shake">
          <AlertIcon className="w-5 h-5 shrink-0 mt-0.5" />
          {error}
        </div>
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
              <AccountCardSkeleton key={i} />
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
            {bookings.map((b, _i) => {
              const acc = accounts.find((a) => a.id === b.accountId);
              const [dd, mm] = b.booking.date.split("-");
              const isToday = isDateToday(b.booking.date);

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
                      {isToday && (
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
      {showBulkBookModal && password && (
        <BulkBookModal
          password={password}
          favorites={computeFavoritesWithAvailability()}
          accounts={accounts}
          onClose={() => setShowBulkBookModal(false)}
          onSuccess={() => {
            setShowBulkBookModal(false);
            refresh();
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Helper Components

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 mx-auto mb-4 flex items-center justify-center text-slate-600">
        {icon}
      </div>
      <h3 className="text-white font-medium mb-1">{title}</h3>
      <p className="text-slate-500 text-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

function AccountCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-3 border border-slate-700/30">
      <div className="w-11 h-11 rounded-xl bg-slate-700 shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-700 rounded-lg shimmer w-3/4" />
        <div className="h-3 bg-slate-700 rounded-lg shimmer w-1/2" />
      </div>
    </div>
  );
}

function BookingCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-4 border border-slate-700/30">
      <div className="w-14 h-14 rounded-xl bg-slate-700 shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-700 rounded-lg shimmer w-1/3" />
        <div className="h-3 bg-slate-700 rounded-lg shimmer w-1/4" />
        <div className="h-3 bg-slate-700 rounded-lg shimmer w-1/2" />
      </div>
    </div>
  );
}

// Helper Functions

function isDateToday(dateStr: string): boolean {
  const [dd, mm, yyyy] = dateStr.split("-").map(Number);
  const date = new Date(yyyy ?? 0, (mm ?? 1) - 1, dd ?? 1);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
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

function UsersIcon({ className }: { className?: string }) {
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
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
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
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function CalendarExportIcon({ className }: { className?: string }) {
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
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 11v6m-3-3l3 3 3-3"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
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

function PlusIcon({ className }: { className?: string }) {
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
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
