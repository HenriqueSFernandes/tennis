import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getSchedule, getAccounts } from '../api';
import type { CurrentBookingInfo, AccountSummary } from '../types';

const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function Dashboard() {
  const { password } = useAuth();
  const [bookings, setBookings] = useState<CurrentBookingInfo[]>([]);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadData() {
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const [s0, s1, s2, a] = await Promise.all([
        getSchedule(password, 0),
        getSchedule(password, 1),
        getSchedule(password, 2),
        getAccounts(password),
      ]);

      const allSlots = [s0, s1, s2].flatMap((s) =>
        s.courts.flatMap((court) =>
          court.slots
            .filter((slot) => slot.isOurs)
            .map((slot) => {
              const acc = a.find((ac) => ac.id === slot.ourAccountId);
              return {
                accountId: slot.ourAccountId ?? '',
                username: acc?.username ?? slot.bookedBy ?? '',
                displayName: acc?.displayName ?? slot.bookedBy ?? '',
                courtId: court.courtId,
                booking: {
                  nome: slot.bookedByName ?? '',
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
          const [dd = 0, mm = 1, yyyy = 1970] = x.booking.date.split('-').map(Number);
          const [hh = 0, min = 0] = x.booking.time.split(':').map(Number);
          const expiresAt = new Date(yyyy, mm - 1, dd, hh + 1, min);
          return expiresAt > now;
        })
        .sort((x, y) => {
          const dateA = x.booking.date.split('-').reverse().join('');
          const dateB = y.booking.date.split('-').reverse().join('');
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          return (x.booking.time ?? '').localeCompare(y.booking.time ?? '');
        });

      setBookings(sorted);
      setAccounts(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [password]);

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">Dashboard</h1>
        <button
          onClick={loadData}
          disabled={loading}
          className="text-slate-400 hover:text-white transition disabled:opacity-40"
          title="Atualizar"
        >
          <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Account summary */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-slate-300 text-sm font-medium uppercase tracking-wide">Contas</h2>
          <Link to="/accounts" className="text-emerald-400 text-xs hover:text-emerald-300 transition">
            Gerir
          </Link>
        </div>

        {accounts.length === 0 && !loading ? (
          <div className="bg-slate-800 rounded-xl p-6 text-center">
            <p className="text-slate-400 text-sm">Nenhuma conta configurada.</p>
            <Link
              to="/accounts"
              className="mt-3 inline-block text-emerald-400 text-sm hover:text-emerald-300 transition"
            >
              Adicionar conta
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {accounts.map((acc) => {
              const hasBooking = bookings.some((b) => b.accountId === acc.id);
              return (
                <div
                  key={acc.id}
                  className={`rounded-xl p-3 flex items-center gap-3 ${
                    hasBooking ? 'bg-emerald-900/40 border border-emerald-700/50' : 'bg-slate-800'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {acc.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{acc.displayName}</p>
                    <p className="text-slate-500 text-xs truncate">{acc.username}</p>
                    <p className={`text-xs ${hasBooking ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {hasBooking ? 'Tem reserva' : 'Sem reserva'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Active bookings */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-slate-300 text-sm font-medium uppercase tracking-wide">
            Reservas ativas
          </h2>
          <Link to="/schedule" className="text-emerald-400 text-xs hover:text-emerald-300 transition">
            Ver campos
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-slate-800 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-700 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-6 text-center">
            <p className="text-slate-400 text-sm">Nenhuma reserva ativa.</p>
            <Link
              to="/schedule"
              className="mt-3 inline-block text-emerald-400 text-sm hover:text-emerald-300 transition"
            >
              Reservar campo
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b, i) => {
              const acc = accounts.find((a) => a.id === b.accountId);
              return (
                <div key={i} className="bg-slate-800 rounded-xl p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-bold shrink-0">
                    C{b.courtId}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium">
                      Court {b.courtId} — {b.displayName || b.booking.nome || b.username}
                    </p>
                    {b.booking.date && (
                      <p className="text-emerald-400 text-sm">
                        {b.booking.date}{b.booking.time ? ` às ${b.booking.time}` : ''}
                      </p>
                    )}
                    <p className="text-slate-400 text-xs mt-0.5">
                      {acc?.displayName ?? b.displayName}
                      <span className="text-slate-500"> · {b.username}</span>
                    </p>
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
