import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AccountSummary, ScheduleSlot } from "../types";

interface AddFavoriteModalProps {
  slot: ScheduleSlot;
  courtName: string;
  accounts: AccountSummary[];
  preselectedAccountId?: string | null;
  onConfirm: (accountId: string) => Promise<void>;
  onCancel: () => void;
}

const DAY_NAMES = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

export function AddFavoriteModal({
  slot,
  courtName,
  accounts,
  preselectedAccountId,
  onConfirm,
  onCancel,
}: AddFavoriteModalProps) {
  const [selectedAccount, setSelectedAccount] = useState(
    preselectedAccountId ?? accounts[0]?.id ?? "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, onCancel]);

  async function handleConfirm() {
    if (!selectedAccount) return;
    setError("");
    setLoading(true);
    try {
      await onConfirm(selectedAccount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao adicionar favorito");
      setLoading(false);
    }
  }

  const [dd, mm, yyyy] = slot.date.split("-");
  const dateStr = `${dd}/${mm}/${yyyy}`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-xs"
        onClick={!loading ? onCancel : undefined}
      />

      <div className="relative bg-slate-800 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-sm p-6 space-y-5 scale-in border border-slate-700/50">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <StarIcon className="w-7 h-7 text-emerald-400" filled />
          </div>
          <h2 className="text-white text-xl font-bold">
            Adicionar aos favoritos
          </h2>
        </div>

        {/* Favorite Details Card */}
        <div className="bg-slate-900/50 rounded-xl p-4 space-y-3 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Campo</span>
            <span className="text-white font-medium">{courtName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Dia</span>
            <span className="text-white font-medium">
              {DAY_NAMES[slot.dayIndex]}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Data</span>
            <span className="text-white font-medium">{dateStr}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Hora</span>
            <span className="text-emerald-400 font-semibold text-lg">
              {slot.time}
            </span>
          </div>
        </div>

        {/* Account Selection */}
        {accounts.length > 1 ? (
          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium">
              Adicionar à conta
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${
                    selectedAccount === acc.id
                      ? "bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30"
                      : "bg-slate-900/50 border-slate-700/50 hover:border-slate-600"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                      selectedAccount === acc.id
                        ? "bg-emerald-600"
                        : "bg-slate-700"
                    }`}
                  >
                    {acc.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium truncate ${
                        selectedAccount === acc.id
                          ? "text-white"
                          : "text-slate-300"
                      }`}
                    >
                      {acc.displayName}
                    </p>
                    <p className="text-slate-500 text-xs truncate">
                      @{acc.username}
                    </p>
                  </div>
                  {selectedAccount === acc.id && (
                    <CheckIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : accounts.length === 1 ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-slate-400 text-sm mb-1">Adicionar à conta</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                {accounts[0]?.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-medium">
                  {accounts[0]?.displayName}
                </p>
                <p className="text-slate-500 text-xs">
                  @{accounts[0]?.username}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
            <AlertIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 font-medium transition-all duration-200 btn-press disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !selectedAccount}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-medium transition-all duration-200 btn-press disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <SpinnerIcon className="w-5 h-5 animate-spin" />A adicionar...
              </>
            ) : (
              <>
                <StarIcon className="w-5 h-5" filled />
                Adicionar
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function StarIcon({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      viewBox="0 0 24 24"
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

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}
