import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { addAccount, deleteAccount, updateAccount } from "../api";
import { AccountCard } from "../components/AccountCard";
import { EditAccountModal } from "../components/EditAccountModal";
import { useDataCache } from "../DataCacheContext";
import type {
  AccountSummary,
  AddAccountRequest,
  UpdateAccountRequest,
} from "../types";

export function Accounts() {
  const { password } = useAuth();
  const { getAccounts, invalidate } = useDataCache();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountSummary | null>(
    null,
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddAccountRequest>({
    username: "",
    password: "",
    displayName: "",
    phone: "",
  });
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof AddAccountRequest, string>>
  >({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof AddAccountRequest, boolean>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  async function loadAccounts() {
    if (!password) return;
    setLoading(true);
    try {
      setAccounts(await getAccounts());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar contas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, [password, getAccounts]);

  // Validation
  function validateField(
    field: keyof AddAccountRequest,
    value: string,
  ): string | undefined {
    switch (field) {
      case "displayName":
        return value.length < 2
          ? "Nome deve ter pelo menos 2 caracteres"
          : undefined;
      case "username":
        return value.length < 3
          ? "Username deve ter pelo menos 3 caracteres"
          : undefined;
      case "password":
        return value.length < 4
          ? "Password deve ter pelo menos 4 caracteres"
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
    const errors: Partial<Record<keyof AddAccountRequest, string>> = {};
    (Object.keys(form) as Array<keyof AddAccountRequest>).forEach((key) => {
      const error = validateField(key, form[key]);
      if (error) errors[key] = error;
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleFieldChange(field: keyof AddAccountRequest, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (touched[field]) {
      const error = validateField(field, value);
      setFormErrors((e) => ({ ...e, [field]: error }));
    }
  }

  function handleFieldBlur(field: keyof AddAccountRequest) {
    setTouched((t) => ({ ...t, [field]: true }));
    const error = validateField(field, form[field]);
    setFormErrors((e) => ({ ...e, [field]: error }));
  }

  async function handleDelete(id: string) {
    if (!password) return;
    if (!confirm("Tem a certeza que deseja remover esta conta?")) return;
    setDeletingId(id);
    try {
      await deleteAccount(password, id);
      invalidate("accounts");
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover conta");
    } finally {
      setDeletingId(null);
    }
  }

  function handleEdit(account: AccountSummary) {
    setEditingAccount(account);
  }

  async function handleSaveEdit(id: string, data: UpdateAccountRequest) {
    if (!password) return;
    setSavingId(id);
    try {
      const updated = await updateAccount(password, id, data);
      invalidate("accounts");
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditingAccount(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao guardar alterações");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;

    // Mark all fields as touched
    setTouched({
      displayName: true,
      username: true,
      password: true,
      phone: true,
    });

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const newAcc = await addAccount(password, form);
      invalidate("accounts");
      setAccounts((prev) => [...prev, newAcc]);
      setShowForm(false);
      setForm({ username: "", password: "", displayName: "", phone: "" });
      setTouched({});
      setFormErrors({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao adicionar conta");
    } finally {
      setSubmitting(false);
    }
  }

  const isFormValid =
    form.displayName.length >= 2 &&
    form.username.length >= 3 &&
    form.password.length >= 4 &&
    /^\d{9}$/.test(form.phone);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Contas</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {accounts.length > 0
              ? `${accounts.length} conta${accounts.length !== 1 ? "s" : ""} configurada${accounts.length !== 1 ? "s" : ""}`
              : "Gerir contas riotinto.pt"}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 btn-press ${
            showForm
              ? "bg-slate-700 hover:bg-slate-600 text-white"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
          }`}
        >
          {showForm ? (
            <>
              <XIcon className="w-4 h-4" />
              Cancelar
            </>
          ) : (
            <>
              <PlusIcon className="w-4 h-4" />
              Adicionar
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-4 text-sm flex items-start gap-3">
          <AlertIcon className="w-5 h-5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Add Account Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 border border-slate-700/50 shadow-xl slide-up"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-slate-700/50">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <UserPlusIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold">
                Nova conta riotinto.pt
              </h2>
              <p className="text-slate-500 text-sm">
                Preencha os dados da conta
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          <FormField
            label="Username riotinto.pt"
            placeholder="username"
            value={form.username}
            onChange={(v) => handleFieldChange("username", v)}
            onBlur={() => handleFieldBlur("username")}
            error={touched.username ? formErrors.username : undefined}
            icon={<AtIcon className="w-4 h-4" />}
            required
          />

          <FormField
            label="Palavra-passe riotinto.pt"
            placeholder="••••••••"
            type="password"
            value={form.password}
            onChange={(v) => handleFieldChange("password", v)}
            onBlur={() => handleFieldBlur("password")}
            error={touched.password ? formErrors.password : undefined}
            icon={<LockIcon className="w-4 h-4" />}
            required
          />

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !isFormValid}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-all duration-200 btn-press flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <SpinnerIcon className="w-5 h-5 animate-spin" />A guardar...
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5" />
                  Guardar conta
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Account List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <AccountCardSkeleton key={i} />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 mx-auto mb-4 flex items-center justify-center">
            <UsersIcon className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-white font-medium mb-1">
            Nenhuma conta adicionada
          </h3>
          <p className="text-slate-500 text-sm mb-4">
            Adicione as contas riotinto.pt que pretende gerir.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-all duration-200 btn-press"
          >
            <PlusIcon className="w-4 h-4" />
            Adicionar conta
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              onDelete={handleDelete}
              onEdit={handleEdit}
              deleting={deletingId === acc.id}
            />
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 space-y-2">
        <div className="flex items-start gap-3 text-slate-400 text-xs">
          <ShieldIcon className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500/60" />
          <p>
            As palavras-passe são cifradas com AES-256-GCM antes de serem
            guardadas.
          </p>
        </div>
        <div className="flex items-start gap-3 text-slate-400 text-xs">
          <InfoIcon className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
          <p>Cada conta pode ter no máximo 1 reserva ativa por dia.</p>
        </div>
      </div>

      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onSave={handleSaveEdit}
          onCancel={() => setEditingAccount(null)}
          saving={savingId === editingAccount.id}
        />
      )}
    </div>
  );
}

// Form Field Component

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
  const [showPassword, setShowPassword] = useState(
    type === "password" ? false : null,
  );
  const inputType =
    showPassword !== null ? (showPassword ? "text" : "password") : type;

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
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          maxLength={maxLength}
          className={`w-full bg-slate-900 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm outline-none transition-all duration-200 ${
            icon ? "pl-10" : ""
          } ${
            error
              ? "ring-2 ring-rose-500/50 focus:ring-rose-500"
              : "ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500/50"
          }`}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPassword ? (
              <EyeOffIcon className="w-4 h-4" />
            ) : (
              <EyeIcon className="w-4 h-4" />
            )}
          </button>
        )}
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

// Skeleton Component

function AccountCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-4 border border-slate-700/30">
      <div className="w-12 h-12 rounded-full bg-slate-700 shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-700 rounded-lg shimmer w-2/3" />
        <div className="h-3 bg-slate-700 rounded-lg shimmer w-1/2" />
      </div>
      <div className="w-8 h-8 bg-slate-700 rounded-lg shimmer" />
    </div>
  );
}

// Icon Components

function PlusIcon({ className }: { className?: string }) {
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
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
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

function UserPlusIcon({ className }: { className?: string }) {
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
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
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

function AtIcon({ className }: { className?: string }) {
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
        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
      />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
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
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
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
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
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
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
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

function UsersIcon({ className }: { className?: string }) {
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
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
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
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
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
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
