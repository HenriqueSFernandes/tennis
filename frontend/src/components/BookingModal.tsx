import { useState } from 'react';
import type { ScheduleSlot, AccountSummary } from '../types';

interface BookingModalProps {
  slot: ScheduleSlot;
  courtName: string;
  accounts: AccountSummary[];
  onConfirm: (accountId: string) => Promise<void>;
  onCancel: () => void;
}

const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function BookingModal({ slot, courtName, accounts, onConfirm, onCancel }: BookingModalProps) {
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    if (!selectedAccount) return;
    setError('');
    setLoading(true);
    try {
      await onConfirm(selectedAccount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao reservar');
    } finally {
      setLoading(false);
    }
  }

  // Format date from DD-MM-YYYY
  const [dd, mm, yyyy] = slot.date.split('-');
  const dateStr = `${dd}/${mm}/${yyyy}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div>
          <h2 className="text-white text-lg font-bold">Reservar campo</h2>
          <p className="text-slate-400 text-sm mt-1">
            {courtName} &middot; {DAY_NAMES[slot.dayIndex]}, {dateStr} &middot; {slot.time}h
          </p>
        </div>

        {accounts.length > 1 && (
          <div>
            <label className="block text-slate-300 text-sm mb-2">Reservar com a conta</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.displayName} (@{acc.username})
                </option>
              ))}
            </select>
          </div>
        )}

        {accounts.length === 1 && (
          <p className="text-slate-300 text-sm">
            Conta: <span className="text-white font-medium">{accounts[0]!.displayName}</span>
          </p>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2.5 font-medium transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !selectedAccount}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2.5 font-medium transition disabled:opacity-50"
          >
            {loading ? 'A reservar...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cancel modal ──────────────────────────────────────────────────────────────

interface CancelModalProps {
  slot: ScheduleSlot;
  courtName: string;
  accountName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function CancelModal({ slot, courtName, accountName, onConfirm, onCancel }: CancelModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setError('');
    setLoading(true);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cancelar');
    } finally {
      setLoading(false);
    }
  }

  const [dd, mm, yyyy] = slot.date.split('-');
  const dateStr = `${dd}/${mm}/${yyyy}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div>
          <h2 className="text-white text-lg font-bold">Cancelar reserva</h2>
          <p className="text-slate-400 text-sm mt-1">
            {courtName} &middot; {dateStr} &middot; {slot.time}h
          </p>
        </div>

        <p className="text-slate-300 text-sm">
          Tem a certeza que quer cancelar a reserva de{' '}
          <span className="text-white font-medium">{accountName}</span>?
        </p>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2.5 font-medium transition disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded-xl py-2.5 font-medium transition disabled:opacity-50"
          >
            {loading ? 'A cancelar...' : 'Cancelar reserva'}
          </button>
        </div>
      </div>
    </div>
  );
}
