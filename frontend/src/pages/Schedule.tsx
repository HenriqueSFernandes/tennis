import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { getSchedule, getAccounts, book, cancelBook } from '../api';
import { CourtGrid } from '../components/CourtGrid';
import { BookingModal, CancelModal } from '../components/BookingModal';
import type { ScheduleResponse, AccountSummary, ScheduleSlot } from '../types';

export function Schedule() {
  const { password } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [bookSlot, setBookSlot] = useState<ScheduleSlot | null>(null);
  const [cancelSlot, setCancelSlot] = useState<ScheduleSlot | null>(null);

  const loadData = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const [s, a] = await Promise.all([
        getSchedule(password, weekOffset),
        getAccounts(password),
      ]);
      setSchedule(s);
      setAccounts(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar horário');
    } finally {
      setLoading(false);
    }
  }, [password, weekOffset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleSlotClick(slot: ScheduleSlot) {
    if (slot.isOurs) {
      setCancelSlot(slot);
    } else if (!slot.bookedBy) {
      setBookSlot(slot);
    }
  }

  async function handleBook(accountId: string) {
    if (!bookSlot || !password) return;
    await book(password, {
      accountId,
      courtId: schedule!.courts.find((c) =>
        c.slots.some((s) => s.date === bookSlot.date && s.time === bookSlot.time && s.dayIndex === bookSlot.dayIndex),
      )!.courtId,
      date: bookSlot.date,
      dayIndex: bookSlot.dayIndex,
      turno: bookSlot.turno,
      hora: bookSlot.hora,
      semana: weekOffset,
    });
    setBookSlot(null);
    await loadData();
  }

  async function handleCancel() {
    if (!cancelSlot || !password) return;
    const courtId = schedule!.courts.find((c) =>
      c.slots.some(
        (s) =>
          s.date === cancelSlot.date &&
          s.time === cancelSlot.time &&
          s.dayIndex === cancelSlot.dayIndex,
      ),
    )!.courtId;
    await cancelBook(password, {
      accountId: cancelSlot.ourAccountId!,
      courtId,
      date: cancelSlot.date,
      dayIndex: cancelSlot.dayIndex,
      turno: cancelSlot.turno,
      hora: cancelSlot.hora,
      semana: weekOffset,
    });
    setCancelSlot(null);
    await loadData();
  }

  // Week label
  function weekLabel(): string {
    if (weekOffset === 0) return 'Esta semana';
    if (weekOffset === 1) return 'Próxima semana';
    return `Semana +${weekOffset}`;
  }

  const bookSlotCourt = bookSlot
    ? schedule?.courts.find((c) =>
        c.slots.some(
          (s) => s.date === bookSlot.date && s.time === bookSlot.time && s.dayIndex === bookSlot.dayIndex,
        ),
      )
    : null;

  const cancelSlotCourt = cancelSlot
    ? schedule?.courts.find((c) =>
        c.slots.some(
          (s) =>
            s.date === cancelSlot.date &&
            s.time === cancelSlot.time &&
            s.dayIndex === cancelSlot.dayIndex,
        ),
      )
    : null;

  const cancelAccountName =
    cancelSlot?.ourAccountId
      ? accounts.find((a) => a.id === cancelSlot.ourAccountId)?.displayName ?? '?'
      : '?';

  return (
    <div className="p-4 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">Campos</h1>
        <button
          onClick={loadData}
          disabled={loading}
          className="text-slate-400 hover:text-white transition disabled:opacity-40"
        >
          <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-2.5">
        <button
          onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          disabled={weekOffset === 0}
          className="text-slate-400 hover:text-white disabled:opacity-30 transition p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-white text-sm font-medium">{weekLabel()}</span>
        <button
          onClick={() => setWeekOffset((w) => Math.min(2, w + 1))}
          disabled={weekOffset >= 2}
          className="text-slate-400 hover:text-white disabled:opacity-30 transition p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-5">
          {[1, 2].map((i) => (
            <div key={i} className="bg-slate-800 rounded-2xl p-4 animate-pulse">
              <div className="h-5 bg-slate-700 rounded w-1/3 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-8 bg-slate-700 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : schedule ? (
        <div className="space-y-5">
          {schedule.courts.map((court) => (
            <CourtGrid
              key={court.courtId}
              schedule={court}
              accounts={accounts}
              onSlotClick={handleSlotClick}
            />
          ))}
        </div>
      ) : null}

      {/* Booking modal */}
      {bookSlot && bookSlotCourt && (
        <BookingModal
          slot={bookSlot}
          courtName={bookSlotCourt.courtName}
          accounts={accounts}
          onConfirm={handleBook}
          onCancel={() => setBookSlot(null)}
        />
      )}

      {/* Cancel modal */}
      {cancelSlot && cancelSlotCourt && (
        <CancelModal
          slot={cancelSlot}
          courtName={cancelSlotCourt.courtName}
          accountName={cancelAccountName}
          onConfirm={handleCancel}
          onCancel={() => setCancelSlot(null)}
        />
      )}
    </div>
  );
}
