import type { AccountSummary } from '../types';

interface AccountCardProps {
  account: AccountSummary;
  onDelete: (id: string) => void;
  deleting: boolean;
}

export function AccountCard({ account, onDelete, deleting }: AccountCardProps) {
  const created = new Date(account.createdAt);
  const createdStr = created.toLocaleDateString('pt-PT');

  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {account.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-white font-medium truncate">{account.displayName}</p>
          <p className="text-slate-400 text-xs truncate">
            @{account.username} &middot; {account.phone}
          </p>
          <p className="text-slate-500 text-xs">Adicionado em {createdStr}</p>
        </div>
      </div>
      <button
        onClick={() => onDelete(account.id)}
        disabled={deleting}
        className="shrink-0 text-slate-400 hover:text-red-400 disabled:opacity-40 transition p-1 rounded-lg hover:bg-slate-700"
        title="Remover conta"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
