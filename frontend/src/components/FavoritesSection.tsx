import { useState } from "react";
import type { Favorite, FavoriteWithAvailability } from "../types";
import { ArrowRightIcon } from "./ui";

const DAY_NAMES = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

interface FavoritesSectionProps {
  favorites: FavoriteWithAvailability[];
  accounts: { id: string; displayName: string }[];
  onBookFavorite: (
    favorite: FavoriteWithAvailability,
    weekOffset: number,
  ) => void;
  onDeleteFavorite: (id: string) => void;
  onUpdateFavoriteName: (id: string, name: string) => void;
  onOpenBulkBook?: () => void;
}

export function FavoritesSection({
  favorites,
  accounts,
  onBookFavorite,
  onDeleteFavorite,
  onUpdateFavoriteName,
  onOpenBulkBook,
}: FavoritesSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function getAccountName(accountId: string): string {
    return accounts.find((a) => a.id === accountId)?.displayName ?? "?";
  }

  function getAutoName(fav: Favorite): string {
    return `Court ${fav.courtId} - ${DAY_NAMES[fav.dayOfWeek]} ${fav.time}`;
  }

  function startEditing(fav: Favorite) {
    setEditingId(fav.id);
    setEditName(fav.name ?? getAutoName(fav));
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
  }

  function saveEditing(fav: Favorite) {
    const newName = editName.trim() || getAutoName(fav);
    onUpdateFavoriteName(fav.id, newName);
    setEditingId(null);
    setEditName("");
  }

  if (favorites.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarIcon className="w-4 h-4 text-slate-500" />
          <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider">
            Favoritos
          </h2>
        </div>
        <button
          onClick={onOpenBulkBook}
          type="button"
          className="group flex items-center gap-1.5 text-emerald-400 text-sm font-medium hover:text-emerald-300 transition-colors"
        >
          Reservar em massa
          <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {favorites.map((fav) => {
          const accountName = getAccountName(fav.accountId);
          const displayName = fav.name ?? getAutoName(fav);
          const isEditing = editingId === fav.id;

          return (
            <div
              key={fav.id}
              className={`bg-slate-800 rounded-xl p-4 border card-hover transition-all duration-200 ${
                fav.thisWeek.isAvailable || fav.nextWeek.isAvailable
                  ? "border-slate-700/50"
                  : fav.thisWeek.isOurBooking || fav.nextWeek.isOurBooking
                    ? "border-emerald-500/30"
                    : "border-rose-500/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing(fav);
                        if (e.key === "Escape") cancelEditing();
                      }}
                      onBlur={() => saveEditing(fav)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  ) : (
                    <button
                      onClick={() => startEditing(fav)}
                      className="text-white text-sm font-medium truncate hover:text-emerald-400 transition-colors text-left"
                      title="Clicar para editar nome"
                      type="button"
                    >
                      {displayName}
                    </button>
                  )}
                  <p className="text-slate-500 text-xs mt-0.5 truncate">
                    {accountName}
                  </p>
                </div>
                <button
                  onClick={() => onDeleteFavorite(fav.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                  title="Remover dos favoritos"
                  type="button"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">
                  {DAY_NAMES[fav.dayOfWeek]} · {fav.time}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">Court {fav.courtId}</span>
              </div>

              {/* Week Status */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Esta semana:</span>
                  {fav.thisWeek.isPast ? (
                    <span className="text-slate-500 flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" /> Já passou
                    </span>
                  ) : fav.thisWeek.isAvailable ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckIcon className="w-3 h-3" /> Livre
                    </span>
                  ) : fav.thisWeek.isOurBooking ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckIcon className="w-3 h-3" /> Já reservado
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertIcon className="w-3 h-3" /> Ocupado
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Próxima semana:</span>
                  {fav.nextWeek.isPast ? (
                    <span className="text-slate-500 flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" /> Já passou
                    </span>
                  ) : fav.nextWeek.isAvailable ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckIcon className="w-3 h-3" /> Livre
                    </span>
                  ) : fav.nextWeek.isOurBooking ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckIcon className="w-3 h-3" /> Já reservado
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertIcon className="w-3 h-3" /> Ocupado
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 space-y-2">
                {fav.thisWeek.isAvailable && !fav.thisWeek.isPast && (
                  <button
                    onClick={() => onBookFavorite(fav, 0)}
                    className="w-full py-2 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all duration-200"
                    type="button"
                  >
                    Reservar esta semana
                  </button>
                )}
                {fav.nextWeek.isAvailable && !fav.nextWeek.isPast && (
                  <button
                    onClick={() => onBookFavorite(fav, 1)}
                    className="w-full py-2 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all duration-200"
                    type="button"
                  >
                    Reservar próxima semana
                  </button>
                )}
                {!fav.thisWeek.isAvailable && !fav.nextWeek.isAvailable && (
                  <button
                    disabled
                    className="w-full py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-500 cursor-not-allowed"
                    type="button"
                  >
                    Indisponível
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
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
      <title>Start Icon</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <title>Trash Icon</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
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
      <title>Check Icon</title>
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
      <title>Alert Icon</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
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
      <title>Clock Icon</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
