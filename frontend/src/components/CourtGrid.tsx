import type { CourtSchedule, ScheduleSlot, AccountSummary } from '../types';

const DAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

interface CourtGridProps {
  schedule: CourtSchedule;
  accounts: AccountSummary[];
  onSlotClick: (slot: ScheduleSlot) => void;
}

export function CourtGrid({ schedule, accounts, onSlotClick }: CourtGridProps) {
  // Gather all unique time labels in order
  const times = Array.from(new Set(schedule.slots.map((s) => s.time))).sort();

  // Build a lookup: "dayIndex-time" => slot
  const slotMap = new Map<string, ScheduleSlot>();
  for (const slot of schedule.slots) {
    slotMap.set(`${slot.dayIndex}-${slot.time}`, slot);
  }

  // Today's day index (0=Mon)
  const today = new Date();
  const todayDow = today.getDay(); // 0=Sun
  const todayMonIdx = todayDow === 0 ? 6 : todayDow - 1; // convert to Mon=0

  // Is this day in the past?
  function isPastDate(date: string): boolean {
    if (!date) return false;
    const [dd, mm, yyyy] = date.split('-').map(Number);
    const d = new Date(yyyy ?? 0, (mm ?? 1) - 1, dd ?? 1);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return d < now;
  }

  function getAccountName(accountId: string): string {
    return accounts.find((a) => a.id === accountId)?.displayName ?? '?';
  }

  function slotClass(slot: ScheduleSlot | undefined, dayIndex: number): string {
    const past = isPastDate(schedule.weekDates[dayIndex] ?? '');
    const base = 'rounded-lg px-1 py-1.5 text-xs text-center transition cursor-pointer select-none';
    if (!slot) return `${base} bg-slate-700/30 text-slate-600`;
    if (past) return `${base} bg-slate-700/40 text-slate-500 cursor-default`;
    if (slot.isOurs) return `${base} bg-emerald-700 hover:bg-emerald-600 text-white font-medium`;
    if (slot.bookedBy) return `${base} bg-slate-600/60 text-slate-400 cursor-default`;
    return `${base} bg-slate-700 hover:bg-slate-600 text-slate-200`;
  }

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden">
      {/* Court header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-white font-semibold">{schedule.courtName}</h3>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr>
              {/* Time col header */}
              <th className="w-14 px-2 py-2 text-slate-500 text-xs font-normal text-left"></th>
              {schedule.weekDates.map((date, dayIdx) => {
                const [dd, mm] = date.split('-');
                const isToday = dayIdx === todayMonIdx;
                return (
                  <th
                    key={dayIdx}
                    className={`px-1 py-2 text-xs font-medium text-center ${isToday ? 'text-emerald-400' : 'text-slate-400'}`}
                  >
                    <div>{DAY_SHORT[dayIdx]}</div>
                    <div className={`text-[11px] ${isToday ? 'text-emerald-300' : 'text-slate-500'}`}>
                      {dd}/{mm}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {times.map((time) => (
              <tr key={time} className="border-t border-slate-700/50">
                <td className="px-2 py-1 text-slate-500 text-xs whitespace-nowrap">{time}</td>
                {schedule.weekDates.map((_, dayIdx) => {
                  const slot = slotMap.get(`${dayIdx}-${time}`);
                  const past = isPastDate(schedule.weekDates[dayIdx] ?? '');
                  const clickable = slot && !past && (slot.isOurs || !slot.bookedBy);

                  return (
                    <td key={dayIdx} className="px-1 py-1">
                      <div
                        className={slotClass(slot, dayIdx)}
                        onClick={() => clickable && slot && onSlotClick(slot)}
                        title={
                          slot?.bookedBy
                            ? slot.isOurs
                              ? `Sua reserva (${getAccountName(slot.ourAccountId!)})`
                              : `Reservado por ${slot.bookedByName ?? slot.bookedBy}`
                            : slot
                              ? 'Clique para reservar'
                              : ''
                        }
                      >
                        {slot?.isOurs ? (
                          <span className="block truncate">
                            {getAccountName(slot.ourAccountId!).split(' ')[0]}
                          </span>
                        ) : slot?.bookedBy ? (
                          <span className="block truncate text-slate-500">•</span>
                        ) : slot ? (
                          <span className="block text-slate-500">—</span>
                        ) : (
                          ''
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-slate-700 flex gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-700 inline-block" /> A sua reserva
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-600 inline-block" /> Ocupado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-700 inline-block" /> Livre
        </span>
      </div>
    </div>
  );
}
