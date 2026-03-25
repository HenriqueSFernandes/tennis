import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { bulkBook } from "../api";
import type {
  AccountSummary,
  BulkBookItem,
  BulkBookResult,
  BulkBookSelection,
  FavoriteWithAvailability,
} from "../types";

interface BulkBookModalProps {
  password: string;
  favorites: FavoriteWithAvailability[];
  accounts: AccountSummary[];
  onClose: () => void;
  onSuccess: () => void;
}

type WeekFilter = "this" | "next" | "both";
type Step = "select" | "review" | "processing" | "results";

const DAY_NAMES = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

export function BulkBookModal({
  password,
  favorites,
  accounts,
  onClose,
  onSuccess,
}: BulkBookModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [weekFilter, setWeekFilter] = useState<WeekFilter>("both");
  const [selections, setSelections] = useState<Map<string, BulkBookSelection>>(
    new Map(),
  );
  const [forceCancel, setForceCancel] = useState(false);
  const [_processing, setProcessing] = useState(0);
  const [result, setResult] = useState<BulkBookResult | null>(null);

  useEffect(() => {
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && step !== "processing") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [step, onClose]);

  function parseTime(time: string): { hora: number; turno: number } {
    const parts = time.split(":");
    const hh = parseInt(parts[0] ?? "0", 10);
    const mm = parseInt(parts[1] ?? "0", 10);
    const minutosDesde8h = (hh - 8) * 60 + mm;
    const hora = minutosDesde8h / 60;
    return { hora, turno: 0 };
  }

  function getSelectableSlots(): BulkBookSelection[] {
    const slots: BulkBookSelection[] = [];

    for (const fav of favorites) {
      const { hora, turno } = parseTime(fav.time);

      // This week slot
      if (!fav.thisWeek.isPast) {
        const _key = `${fav.id}-0`;
        slots.push({
          favoriteId: fav.id,
          weekOffset: 0,
          accountId: fav.accountId,
          courtId: fav.courtId,
          dayOfWeek: fav.dayOfWeek,
          time: fav.time,
          date: fav.thisWeek.date,
          dayIndex: fav.dayOfWeek,
          turno,
          hora,
          isAvailable: fav.thisWeek.isAvailable,
          isConflict:
            fav.thisWeek.isOurBooking || fav.thisWeek.isBookedByOthers,
          conflictReason: fav.thisWeek.isOurBooking
            ? "Já reservado"
            : fav.thisWeek.isBookedByOthers
              ? "Ocupado por outro"
              : undefined,
        });
      }

      // Next week slot
      if (!fav.nextWeek.isPast) {
        const _key = `${fav.id}-1`;
        slots.push({
          favoriteId: fav.id,
          weekOffset: 1,
          accountId: fav.accountId,
          courtId: fav.courtId,
          dayOfWeek: fav.dayOfWeek,
          time: fav.time,
          date: fav.nextWeek.date,
          dayIndex: fav.dayOfWeek,
          turno,
          hora,
          isAvailable: fav.nextWeek.isAvailable,
          isConflict:
            fav.nextWeek.isOurBooking || fav.nextWeek.isBookedByOthers,
          conflictReason: fav.nextWeek.isOurBooking
            ? "Já reservado"
            : fav.nextWeek.isBookedByOthers
              ? "Ocupado por outro"
              : undefined,
        });
      }
    }

    return slots;
  }

  const selectableSlots = getSelectableSlots();

  const filteredSlots = selectableSlots.filter((slot) => {
    if (weekFilter === "this") return slot.weekOffset === 0;
    if (weekFilter === "next") return slot.weekOffset === 1;
    return true;
  });

  const selectedSlots = Array.from(selections.values()).filter(
    (s) => s.isAvailable || (s.isConflict && forceCancel),
  );

  const conflictingSlots = selectedSlots.filter((s) => s.isConflict);

  function toggleSlot(slot: BulkBookSelection) {
    const key = `${slot.favoriteId}-${slot.weekOffset}`;
    const newSelections = new Map(selections);
    if (newSelections.has(key)) {
      newSelections.delete(key);
    } else {
      newSelections.set(key, slot);
    }
    setSelections(newSelections);
  }

  function selectAll() {
    const newSelections = new Map(selections);
    for (const slot of filteredSlots) {
      const key = `${slot.favoriteId}-${slot.weekOffset}`;
      if (slot.isAvailable || (slot.isConflict && forceCancel)) {
        newSelections.set(key, slot);
      }
    }
    setSelections(newSelections);
  }

  function deselectAll() {
    setSelections(new Map());
  }

  function handleContinue() {
    setStep("review");
  }

  async function handleConfirm() {
    setStep("processing");
    setProcessing(0);

    const bookings: BulkBookItem[] = selectedSlots.map((slot) => ({
      accountId: slot.accountId,
      courtId: slot.courtId,
      date: slot.date,
      dayIndex: slot.dayIndex,
      turno: slot.turno,
      hora: slot.hora,
      semana: slot.weekOffset,
    }));

    try {
      const res = await bulkBook(password, { bookings, forceCancel });
      setResult(res);
      setStep("results");
      onSuccess();
    } catch (e) {
      setResult({
        success: [],
        skipped: [],
        failed: [
          {
            accountId: "",
            courtId: 0,
            date: "",
            error: e instanceof Error ? e.message : "Erro desconhecido",
          },
        ],
      });
      setStep("results");
    }
  }

  function getAccountName(accountId: string): string {
    return accounts.find((a) => a.id === accountId)?.displayName ?? "?";
  }

  function getFavoriteName(favoriteId: string): string {
    const fav = favorites.find((f) => f.id === favoriteId);
    if (!fav) return "?";
    return (
      fav.name ??
      `Court ${fav.courtId} - ${DAY_NAMES[fav.dayOfWeek]} ${fav.time}`
    );
  }

  function getSlotLabel(slot: BulkBookSelection): string {
    const weekLabel = slot.weekOffset === 0 ? "Esta semana" : "Próxima semana";
    return `${DAY_NAMES[slot.dayOfWeek]} ${slot.time} - ${weekLabel}`;
  }

  // Group selected slots by account
  const slotsByAccount = new Map<string, BulkBookSelection[]>();
  for (const slot of selectedSlots) {
    const existing = slotsByAccount.get(slot.accountId) ?? [];
    existing.push(slot);
    slotsByAccount.set(slot.accountId, existing);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={step !== "processing" ? onClose : undefined}
      />

      <div className="relative bg-slate-800 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col scale-in border border-slate-700/50">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between shrink-0">
          <h2 className="text-white text-lg font-bold">
            {step === "select" && "Selecionar favoritos"}
            {step === "review" && "Revisar reservas"}
            {step === "processing" && "A processar..."}
            {step === "results" && "Resultados"}
          </h2>
          {step !== "processing" && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === "select" && (
            <div className="p-6 space-y-4">
              {/* Week Filter Tabs */}
              <div className="flex gap-2">
                {(
                  [
                    { value: "this", label: "Esta semana" },
                    { value: "next", label: "Próxima semana" },
                    { value: "both", label: "Ambas" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setWeekFilter(tab.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      weekFilter === tab.value
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Slot List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredSlots.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    Nenhum slot disponível para seleccionar
                  </p>
                ) : (
                  filteredSlots.map((slot) => {
                    const key = `${slot.favoriteId}-${slot.weekOffset}`;
                    const isSelected = selections.has(key);
                    const isDisabled = !slot.isAvailable && !forceCancel;

                    return (
                      <div
                        key={key}
                        className={`p-3 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500/30"
                            : isDisabled
                              ? "bg-slate-900/50 border-slate-700/30 opacity-50"
                              : "bg-slate-900/50 border-slate-700/50 hover:border-slate-600"
                        }`}
                      >
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => !isDisabled && toggleSlot(slot)}
                            disabled={isDisabled}
                            className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-800"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">
                              {getFavoriteName(slot.favoriteId)}
                            </p>
                            <p className="text-slate-400 text-xs mt-0.5">
                              {getSlotLabel(slot)}
                            </p>
                            {slot.isConflict && (
                              <p className="text-amber-400 text-xs mt-1 flex items-center gap-1">
                                <AlertIcon className="w-3 h-3" />
                                {slot.conflictReason}
                              </p>
                            )}
                          </div>
                          {slot.isAvailable && (
                            <span className="text-emerald-400 text-xs flex items-center gap-1">
                              <CheckIcon className="w-3 h-3" /> Livre
                            </span>
                          )}
                        </label>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Select All / Deselect All */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={
                    selectedSlots.length === filteredSlots.length
                      ? deselectAll
                      : selectAll
                  }
                  className="text-slate-400 hover:text-white text-sm underline"
                >
                  {selectedSlots.length === filteredSlots.length
                    ? "Desmarcar todos"
                    : "Selecionar todos"}
                </button>
                <span className="text-slate-400 text-sm">
                  {selectedSlots.length} seleccionados
                </span>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="p-6 space-y-4">
              {/* Force Cancel Toggle */}
              {conflictingSlots.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceCancel}
                      onChange={(e) => setForceCancel(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-800"
                    />
                    <div>
                      <p className="text-amber-300 text-sm font-medium">
                        Cancelar reservas existentes
                      </p>
                      <p className="text-amber-400/70 text-xs mt-1">
                        {conflictingSlots.length} slot(s) já estão reservados.
                        Ative para cancelar e re-reservar.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Slots by Account */}
              {Array.from(slotsByAccount.entries()).map(
                ([accountId, slots]) => (
                  <div key={accountId} className="space-y-2">
                    <h3 className="text-slate-300 text-sm font-semibold">
                      {getAccountName(accountId)}
                    </h3>
                    <div className="space-y-1">
                      {slots.map((slot) => {
                        const key = `${slot.favoriteId}-${slot.weekOffset}`;
                        const isConflict = slot.isConflict;

                        return (
                          <div
                            key={key}
                            className={`p-3 rounded-lg border flex items-center justify-between ${
                              isConflict
                                ? forceCancel
                                  ? "bg-amber-500/10 border-amber-500/30"
                                  : "bg-slate-900/50 border-slate-700/30"
                                : "bg-slate-900/50 border-slate-700/50"
                            }`}
                          >
                            <div>
                              <p
                                className={`text-sm ${
                                  isConflict && !forceCancel
                                    ? "text-slate-500"
                                    : "text-white"
                                }`}
                              >
                                {getSlotLabel(slot)}
                              </p>
                              {isConflict && (
                                <p
                                  className={`text-xs mt-0.5 ${
                                    forceCancel
                                      ? "text-amber-400"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {slot.conflictReason} -{" "}
                                  {forceCancel
                                    ? "Será substituído"
                                    : "Ignorado"}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => toggleSlot(slot)}
                              className="text-slate-400 hover:text-rose-400 p-1"
                            >
                              <CloseIcon className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ),
              )}

              <p className="text-slate-500 text-xs text-center pt-2">
                {selectedSlots.length} reserva(s) a fazer
              </p>
            </div>
          )}

          {step === "processing" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-slate-400 text-center">
                A processar {selectedSlots.length} reserva(s)...
              </p>
            </div>
          )}

          {step === "results" && result && (
            <div className="p-6 space-y-4">
              {/* Success */}
              {result.success.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {result.success.length} reserva(s) com sucesso
                    </span>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 space-y-1">
                    {result.success.map((s) => {
                      const slot = selectedSlots.find(
                        (sel) =>
                          sel.courtId === s.courtId &&
                          sel.date === s.date &&
                          sel.weekOffset === (s.semana ?? s.dayIndex),
                      );
                      return (
                        <p
                          key={`${s.date}-${s.courtId}`}
                          className="text-emerald-300 text-xs"
                        >
                          •{" "}
                          {slot
                            ? getSlotLabel(slot)
                            : `${s.courtId} - ${s.date}`}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Skipped */}
              {result.skipped.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {result.skipped.length} ignorada(s)
                    </span>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-1">
                    {result.skipped.map((s) => (
                      <p
                        key={`${s.date}-${s.courtId}-${s.reason}`}
                        className="text-amber-300 text-xs"
                      >
                        • {s.date} -{" "}
                        {s.reason === "already-booked-by-us"
                          ? "Já reservado"
                          : s.reason === "booked-by-others"
                            ? "Ocupado por outro"
                            : s.reason === "past"
                              ? "Já passou"
                              : "Recusado"}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed */}
              {result.failed.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-rose-400">
                    <CloseIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {result.failed.length} falhou(falharam)
                    </span>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 space-y-1">
                    {result.failed.map((s) => (
                      <p
                        key={`${s.date}-${s.courtId}-${s.error}`}
                        className="text-rose-300 text-xs"
                      >
                        • {s.date} - {s.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700/50 flex gap-3 shrink-0">
          {step === "select" && (
            <>
              <button
                onClick={onClose}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2.5 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleContinue}
                disabled={selectedSlots.length === 0}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl py-2.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </>
          )}

          {step === "review" && (
            <>
              <button
                onClick={() => setStep("select")}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2.5 font-medium transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirm}
                disabled={
                  selectedSlots.length === 0 ||
                  (conflictingSlots.length > 0 && !forceCancel)
                }
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl py-2.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar {selectedSlots.length}
              </button>
            </>
          )}

          {step === "results" && (
            <button
              onClick={onClose}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2.5 font-medium transition-colors"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CloseIcon({ className }: { className?: string }) {
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
        d="M6 18L18 6M6 6l12 12"
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
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}
