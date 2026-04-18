import { useEffect, useState } from "react";
import type { AccountSummary, UpdateAccountRequest } from "../types";

interface EditAccountModalProps {
  account: AccountSummary;
  onSave: (id: string, data: UpdateAccountRequest) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export function EditAccountModal({
  account,
  onSave,
  onCancel,
  saving,
}: EditAccountModalProps) {
  const [form, setForm] = useState({
    displayName: account.displayName,
    phone: account.phone,
  });
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof UpdateAccountRequest, string>>
  >({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof UpdateAccountRequest, boolean>>
  >({});

  useEffect(() => {
    setForm({ displayName: account.displayName, phone: account.phone });
    setFormErrors({});
    setTouched({});
  }, [account]);

  function validateField(
    field: keyof UpdateAccountRequest,
    value: string,
  ): string | undefined {
    switch (field) {
      case "displayName":
        return value.length < 2
          ? "Nome deve ter pelo menos 2 caracteres"
          : undefined;
      case "phone":
        if (!value) return "Telemóvel é obrigatório";
        if (!/^\d{9}$/.test(value)) return "Telemóvel deve ter 9 dígitos";
        return undefined;
      default:
        return undefined;
    }
  }

  function validateForm(): boolean {
    const errors: Partial<Record<keyof UpdateAccountRequest, string>> = {};
    (Object.keys(form) as Array<keyof UpdateAccountRequest>).forEach((key) => {
      const error = validateField(key, form[key]);
      if (error) errors[key] = error;
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleFieldChange(field: keyof UpdateAccountRequest, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (touched[field]) {
      const error = validateField(field, value);
      setFormErrors((e) => ({ ...e, [field]: error }));
    }
  }

  function handleFieldBlur(field: keyof UpdateAccountRequest) {
    setTouched((t) => ({ ...t, [field]: true }));
    const error = validateField(field, form[field]);
    setFormErrors((e) => ({ ...e, [field]: error }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ displayName: true, phone: true });
    if (!validateForm()) return;
    await onSave(account.id, form);
  }

  const isFormValid =
    form.displayName.length >= 2 && /^\d{9}$/.test(form.phone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-xs"
        onClick={onCancel}
      />
      <div className="relative bg-slate-800 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-sm p-6 scale-in border border-slate-700/50">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <PencilIcon className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-white text-xl font-bold">Editar conta</h2>
          <p className="text-slate-400 text-sm mt-1">
            Altere os dados da conta
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Nome de apresentação"
            placeholder="Ex: João Silva"
            value={form.displayName}
            onChange={(v) => handleFieldChange("displayName", v)}
            onBlur={() => handleFieldBlur("displayName")}
            error={touched.displayName ? formErrors.displayName : undefined}
            icon={<UserIcon className="w-4 h-4" />}
            required
          />

          <FormField
            label="Telemóvel"
            placeholder="912345678"
            type="tel"
            value={form.phone}
            onChange={(v) => handleFieldChange("phone", v.replace(/\D/g, ""))}
            onBlur={() => handleFieldBlur("phone")}
            error={touched.phone ? formErrors.phone : undefined}
            icon={<PhoneIcon className="w-4 h-4" />}
            maxLength={9}
            required
          />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-medium rounded-xl py-3 transition-all duration-200 btn-press"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !isFormValid}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-all duration-200 btn-press shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <SpinnerIcon className="w-5 h-5 animate-spin" />A guardar...
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  icon?: React.ReactNode;
  required?: boolean;
  maxLength?: number;
}

function FormField({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  icon,
  required,
  maxLength,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-slate-400 text-xs font-medium">
        {label}
        {required && <span className="text-rose-400">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          maxLength={maxLength}
          className={`w-full bg-slate-900 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm outline-hidden transition-all duration-200 ${
            icon ? "pl-10" : ""
          } ${
            error
              ? "ring-2 ring-rose-500/50 focus:ring-rose-500"
              : "ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500/50"
          }`}
        />
      </div>
      {error && (
        <p className="text-rose-400 text-xs flex items-center gap-1">
          <AlertIcon className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function PencilIcon({ className }: { className?: string }) {
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
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
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
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
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
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
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
