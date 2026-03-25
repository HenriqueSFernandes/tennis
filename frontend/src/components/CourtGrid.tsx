import type {
  AccountSummary,
  CourtSchedule,
  Favorite,
  ScheduleSlot,
} from "../types";

const DAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface CourtGridProps {
  schedule: CourtSchedule;
  accounts: AccountSummary[];
  favorites?: Favorite[];
  onSlotClick: (slot: ScheduleSlot, courtId: number) => void;
  onToggleFavorite?: (
    slot: ScheduleSlot,
    courtId: number,
    isFavorited: boolean,
  ) => void;
}

export function CourtGrid({
  schedule,
  accounts,
  favorites = [],
  onSlotClick,
  onToggleFavorite,
}: CourtGridProps) {
  const times = Array.from(new Set(schedule.slots.map((s) => s.time))).sort();

  const slotMap = new Map<string, ScheduleSlot>();
  for (const slot of schedule.slots) {
    slotMap.set(`${slot.dayIndex}-${slot.time}`, slot);
  }

  const favoriteMap = new Map<string, Favorite>();
  for (const fav of favorites) {
    favoriteMap.set(`${fav.dayOfWeek}-${fav.time}-${fav.courtId}`, fav);
  }

  function isSlotFavorited(
    dayIndex: number,
    time: string,
    courtId: number,
  ): boolean {
    return favoriteMap.has(`${dayIndex}-${time}-${courtId}`);
  }

  function getFavoriteForSlot(
    dayIndex: number,
    time: string,
    courtId: number,
  ): Favorite | undefined {
    return favoriteMap.get(`${dayIndex}-${time}-${courtId}`);
  }

  function isPastDate(date: string): boolean {
    if (!date) return false;
    const [dd, mm, yyyy] = date.split("-").map(Number);
    const d = new Date(yyyy ?? 0, (mm ?? 1) - 1, dd ?? 1);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return d < now;
  }

  function isTodayDate(date: string): boolean {
    if (!date) return false;
    const [dd, mm, yyyy] = date.split("-").map(Number);
    const today = new Date();
    return (
      (yyyy ?? 0) === today.getFullYear() &&
      (mm ?? 1) - 1 === today.getMonth() &&
      (dd ?? 1) === today.getDate()
    );
  }

  function getAccountName(accountId: string): string {
    return accounts.find((a) => a.id === accountId)?.displayName ?? "?";
  }

  function slotClass(
    slot: ScheduleSlot | undefined,
    dayIndex: number,
    courtId: number,
  ): string {
    const past = isPastDate(schedule.weekDates[dayIndex] ?? "");
    const favorited = slot && isSlotFavorited(dayIndex, slot.time, courtId);
    const base =
      "rounded-lg text-xs text-center transition-all duration-200 select-none relative overflow-hidden";

    if (!slot) return `${base} bg-transparent`;
    if (past) return `${base} bg-slate-800/50 text-slate-600`;
    if (favorited && !slot.bookedBy && !slot.isOurs)
      return `${base} bg-slate-700 hover:bg-slate-600 text-slate-300 cursor-pointer border-2 border-amber-500/50 btn-press`;
    if (slot.isOurs)
      return `${base} bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-900/20 cursor-pointer btn-press`;
    if (slot.bookedBy)
      return `${base} bg-rose-500/10 text-rose-300/60 cursor-not-allowed`;
    return `${base} bg-slate-700 hover:bg-slate-600 text-slate-300 cursor-pointer hover:shadow-lg hover:shadow-black/20 btn-press`;
  }

  const ourBookingsCount = schedule.slots.filter((s) => s.isOurs).length;

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700/50 shadow-lg shadow-black/10">
      {/* Court Header */}
      <div className="px-4 py-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center border border-emerald-500/20">
            <TennisBallIcon className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{schedule.courtName}</h3>
            <p className="text-slate-500 text-xs">
              {ourBookingsCount > 0
                ? `${ourBookingsCount} reserva${ourBookingsCount !== 1 ? "s" : ""} esta semana`
                : "Sem reservas"}
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-slate-700/30">
              <th className="w-14 px-2 py-3 text-slate-500 text-xs font-normal text-left">
                <ClockIcon className="w-4 h-4" />
              </th>
              {schedule.weekDates.map((date, dayIdx) => {
                const [dd, mm] = date.split("-");
                const isToday = isTodayDate(date);
                const isPast = isPastDate(date);

                return (
                  <th
                    key={date}
                    className={`px-1 py-3 text-center ${isPast ? "opacity-40" : ""}`}
                  >
                    <div
                      className={`text-xs font-medium ${isToday ? "text-emerald-400" : "text-slate-400"}`}
                    >
                      {DAY_SHORT[dayIdx]}
                    </div>
                    <div
                      className={`text-[11px] font-medium mt-0.5 ${
                        isToday
                          ? "text-emerald-300"
                          : isPast
                            ? "text-slate-600"
                            : "text-slate-500"
                      }`}
                    >
                      {dd}/{mm}
                    </div>
                    {isToday && (
                      <div className="mt-1 flex justify-center">
                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {times.map((time) => (
              <tr key={time} className="border-t border-slate-700/20">
                <td className="px-2 py-2">
                  <span className="text-slate-500 text-xs font-medium whitespace-nowrap">
                    {time}
                  </span>
                </td>
                {schedule.weekDates.map((date, dayIdx) => {
                  const slot = slotMap.get(`${dayIdx}-${time}`);
                  const past = isPastDate(date ?? "");
                  const clickable =
                    slot && !past && (slot.isOurs || !slot.bookedBy);
                  const favorited =
                    slot &&
                    isSlotFavorited(dayIdx, slot.time, schedule.courtId);
                  const _favorite = slot
                    ? getFavoriteForSlot(dayIdx, slot.time, schedule.courtId)
                    : undefined;

                  function handleFavoriteClick(e: React.MouseEvent) {
                    e.stopPropagation();
                    if (onToggleFavorite && slot) {
                      onToggleFavorite(
                        slot,
                        schedule.courtId,
                        favorited ?? false,
                      );
                    }
                  }

                  return (
                    <td
                      key={`${date}-${time}`}
                      className="px-1 py-1 relative group"
                    >
                      <div
                        className={`${slotClass(slot, dayIdx, schedule.courtId)} py-2.5 px-1 min-h-[38px] flex items-center justify-center`}
                        onClick={() =>
                          clickable &&
                          slot &&
                          onSlotClick(slot, schedule.courtId)
                        }
                        title={getSlotTooltip(slot, past, favorited)}
                      >
                        {slot?.isOurs ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <CheckIcon className="w-3.5 h-3.5" />
                            <span className="text-[10px] opacity-80 truncate max-w-full">
                              {
                                getAccountName(slot.ourAccountId ?? "").split(
                                  " ",
                                )[0]
                              }
                            </span>
                          </div>
                        ) : slot?.bookedBy ? (
                          <span className="w-2 h-2 rounded-full bg-rose-400/60" />
                        ) : slot ? (
                          past ? (
                            <span className="text-slate-600">—</span>
                          ) : (
                            <PlusIcon className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )
                        ) : null}
                      </div>
                      {!past && slot && onToggleFavorite && (
                        <button
                          className={`absolute top-0.5 right-0.5 p-0.5 rounded transition-opacity ${
                            favorited
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          } hover:bg-slate-600`}
                          onClick={handleFavoriteClick}
                          title={
                            favorited
                              ? "Remover dos favoritos"
                              : "Adicionar aos favoritos"
                          }
                        >
                          <StarIcon
                            className={`w-3 h-3 ${
                              favorited
                                ? "text-amber-400"
                                : "text-slate-400 hover:text-amber-400"
                            }`}
                            filled={favorited}
                          />
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
        <div className="flex flex-wrap gap-4 text-xs">
          <LegendItem color="bg-emerald-600" label="A sua reserva" />
          <LegendItem
            color="bg-rose-500/20"
            dotColor="bg-rose-400/60"
            label="Ocupado"
          />
          <LegendItem color="bg-slate-700" label="Livre" />
          <LegendItem color="bg-slate-800/50" label="Passado" />
          <LegendItem
            color="bg-slate-700"
            borderColor="border-amber-500/50"
            label="Favorito"
          />
        </div>
      </div>
    </div>
  );

  function getSlotTooltip(
    slot: ScheduleSlot | undefined,
    past: boolean,
    favorited?: boolean,
  ): string {
    if (!slot || past) return "";
    if (slot.isOurs) {
      return `Sua reserva (${getAccountName(slot.ourAccountId ?? "")}) - Clique para cancelar`;
    }
    if (slot.bookedBy) {
      return `Reservado por ${slot.bookedByName ?? slot.bookedBy}`;
    }
    if (favorited) {
      return "Favorite - Clique para reservar";
    }
    return "Clique para reservar";
  }
}

// Legend Item Component

interface LegendItemProps {
  color: string;
  dotColor?: string;
  borderColor?: string;
  label: string;
}

function LegendItem({ color, dotColor, borderColor, label }: LegendItemProps) {
  return (
    <span className="flex items-center gap-1.5 text-slate-400">
      <span
        className={`w-3 h-3 rounded ${color} flex items-center justify-center ${borderColor ?? ""}`}
      >
        {dotColor && (
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        )}
      </span>
      {label}
    </span>
  );
}

// Icon Components

function TennisBallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      <path
        d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
        opacity="0.3"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
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
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
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

function StarIcon({
  className,
  filled,
  onClick,
}: {
  className?: string;
  filled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <svg
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      viewBox="0 0 24 24"
      onClick={onClick}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}
