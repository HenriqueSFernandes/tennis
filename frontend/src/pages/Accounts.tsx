import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { getAccounts, addAccount, deleteAccount } from '../api';
import { AccountCard } from '../components/AccountCard';
import type { AccountSummary, AddAccountRequest } from '../types';

export function Accounts() {
  const { password } = useAuth();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddAccountRequest>({
    username: '',
    password: '',
    displayName: '',
    phone: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadAccounts() {
    if (!password) return;
    setLoading(true);
    try {
      setAccounts(await getAccounts(password));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, [password]);

  async function handleDelete(id: string) {
    if (!password) return;
    if (!confirm('Remover esta conta?')) return;
    setDeletingId(id);
    try {
      await deleteAccount(password, id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover conta');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setFormError('');

    if (!form.username || !form.password || !form.displayName || !form.phone) {
      setFormError('Preencha todos os campos');
      return;
    }
    if (!/^\d{9}$/.test(form.phone)) {
      setFormError('Telemóvel deve ter 9 dígitos');
      return;
    }

    setSubmitting(true);
    try {
      const newAcc = await addAccount(password, form);
      setAccounts((prev) => [...prev, newAcc]);
      setShowForm(false);
      setForm({ username: '', password: '', displayName: '', phone: '' });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao adicionar conta');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">Contas</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl px-4 py-2 transition"
        >
          {showForm ? 'Cancelar' : '+ Adicionar'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Add account form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 rounded-2xl p-5 space-y-4 border border-slate-700"
        >
          <h2 className="text-white font-semibold">Nova conta riotinto.pt</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Nome de apresentação</label>
              <input
                type="text"
                placeholder="Ex: João Silva"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Telemóvel (9 dígitos)</label>
              <input
                type="tel"
                placeholder="912345678"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1">Username riotinto.pt</label>
            <input
              type="text"
              placeholder="username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1">Palavra-passe riotinto.pt</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {formError && <p className="text-red-400 text-sm">{formError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 transition"
          >
            {submitting ? 'A guardar...' : 'Guardar conta'}
          </button>
        </form>
      )}

      {/* Account list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-700 rounded w-1/2" />
                  <div className="h-3 bg-slate-700 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">Nenhuma conta adicionada ainda.</p>
          <p className="text-slate-500 text-xs mt-1">
            Adicione as contas riotinto.pt que pretende gerir.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              onDelete={handleDelete}
              deleting={deletingId === acc.id}
            />
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-xs text-slate-500 space-y-1">
        <p>As palavras-passe são cifradas com AES-256-GCM antes de serem guardadas.</p>
        <p>Cada conta pode ter no máximo 1 reserva ativa por semana.</p>
      </div>
    </div>
  );
}
