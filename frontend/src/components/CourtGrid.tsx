import type { CourtSchedule, ScheduleSlot, AccountSummary } from '../types';

const DAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

interface CourtGridProps {
  schedule: CourtSchedule;
  accounts: AccountSummary[];
  onSlotClick: (slot: ScheduleSlot, courtId: number) => void;
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
    const base = 'rounded-lg text-xs text-center transition-all duration-200 select-none relative overflow-hidden';
    
    if (!slot) return `${base} bg-transparent`;
    if (past) return `${base} bg-slate-800/50 text-slate-600`;
    if (slot.isOurs) return `${base} bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-900/20 cursor-pointer btn-press`;
    if (slot.bookedBy) return `${base} bg-rose-500/10 text-rose-300/60 cursor-not-allowed`;
    return `${base} bg-slate-700 hover:bg-slate-600 text-slate-300 cursor-pointer hover:shadow-lg hover:shadow-black/20 btn-press`;
  }

  // Count our bookings for this court
  const ourBookingsCount = schedule.slots.filter(s => s.isOurs).length;

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
                ? `${ourBookingsCount} reserva${ourBookingsCount !== 1 ? 's' : ''} esta semana`
                : 'Sem reservas'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-slate-700/30">
              {/* Time column header */}
              <th className="w-14 px-2 py-3 text-slate-500 text-xs font-normal text-left">
                <ClockIcon className="w-4 h-4" />
              </th>
              {schedule.weekDates.map((date, dayIdx) => {
                const [dd, mm] = date.split('-');
                const isToday = dayIdx === todayMonIdx;
                const isPast = isPastDate(date);
                
                return (
                  <th
                    key={dayIdx}
                    className={`px-1 py-3 text-center ${isPast ? 'opacity-40' : ''}`}
                  >
                    <div className={`text-xs font-medium ${isToday ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {DAY_SHORT[dayIdx]}
                    </div>
                    <div className={`text-[11px] font-medium mt-0.5 ${
                      isToday 
                        ? 'text-emerald-300' 
                        : isPast 
                          ? 'text-slate-600' 
                          : 'text-slate-500'
                    }`}>
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
                  <span className="text-slate-500 text-xs font-medium whitespace-nowrap">{time}</span>
                </td>
                {schedule.weekDates.map((date, dayIdx) => {
                  const slot = slotMap.get(`${dayIdx}-${time}`);
                  const past = isPastDate(date ?? '');
                  const clickable = slot && !past && (slot.isOurs || !slot.bookedBy);

                  return (
                    <td key={dayIdx} className="px-1 py-1">
                      <div
                        className={`${slotClass(slot, dayIdx)} py-2.5 px-1 min-h-[38px] flex items-center justify-center`}
                        onClick={() => clickable && slot && onSlotClick(slot, schedule.courtId)}
                        title={getSlotTooltip(slot, past)}
                      >
                        {slot?.isOurs ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <CheckIcon className="w-3.5 h-3.5" />
                            <span className="text-[10px] opacity-80 truncate max-w-full">
                              {getAccountName(slot.ourAccountId!).split(' ')[0]}
                            </span>
                          </div>
                        ) : slot?.bookedBy ? (
                          <div className="flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-rose-400/60" />
                          </div>
                        ) : slot ? (
                          past ? (
                            <span className="text-slate-600">—</span>
                          ) : (
                            <PlusIcon className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )
                        ) : null}
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
      <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
        <div className="flex flex-wrap gap-4 text-xs">
          <LegendItem color="bg-emerald-600" label="A sua reserva" />
          <LegendItem color="bg-rose-500/20" dotColor="bg-rose-400/60" label="Ocupado" />
          <LegendItem color="bg-slate-700" label="Livre" />
          <LegendItem color="bg-slate-800/50" label="Passado" />
        </div>
      </div>
    </div>
  );

  function getSlotTooltip(slot: ScheduleSlot | undefined, past: boolean): string {
    if (!slot || past) return '';
    if (slot.isOurs) {
      return `Sua reserva (${getAccountName(slot.ourAccountId!)}) - Clique para cancelar`;
    }
    if (slot.bookedBy) {
      return `Reservado por ${slot.bookedByName ?? slot.bookedBy}`;
    }
    return 'Clique para reservar';
  }
}

// Legend Item Component

interface LegendItemProps {
  color: string;
  dotColor?: string;
  label: string;
}

function LegendItem({ color, dotColor, label }: LegendItemProps) {
  return (
    <span className="flex items-center gap-1.5 text-slate-400">
      <span className={`w-3 h-3 rounded ${color} flex items-center justify-center`}>
        {dotColor && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      </span>
      {label}
    </span>
  );
}

// Icon Components

function TennisBallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" opacity="0.3"/>
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
