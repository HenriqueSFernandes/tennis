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
    <div className="group bg-slate-800 rounded-xl p-4 flex items-center justify-between gap-4 border border-slate-700/50 card-hover">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-emerald-900/20">
          {account.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold truncate">{account.displayName}</p>
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span className="flex items-center gap-1">
              <AtIcon className="w-3 h-3" />
              {account.username}
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1">
              <PhoneIcon className="w-3 h-3" />
              {account.phone}
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" />
            Adicionado em {createdStr}
          </p>
        </div>
      </div>
      
      <button
        onClick={() => onDelete(account.id)}
        disabled={deleting}
        className="shrink-0 text-slate-400 hover:text-rose-400 disabled:opacity-40 transition-all duration-200 p-2.5 rounded-xl hover:bg-rose-500/10 hover:shadow-lg hover:shadow-rose-500/10 btn-press group/btn"
        title="Remover conta"
      >
        {deleting ? (
          <SpinnerIcon className="w-5 h-5 animate-spin" />
        ) : (
          <TrashIcon className="w-5 h-5 transition-transform group-hover/btn:scale-110" />
        )}
      </button>
    </div>
  );
}

// Icon Components

function AtIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
