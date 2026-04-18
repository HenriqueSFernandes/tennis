// Accounts page

import { useEffect, useState } from "react";
import { AccountCard } from "../components/AccountCard";
import { EditAccountModal } from "../components/EditAccountModal";
import {
  AccountCardSkeleton,
  AlertIcon,
  AtIcon,
  CheckIcon,
  EmptyState,
  ErrorAlert,
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  LockIcon,
  PhoneIcon,
  PlusIcon,
  ShieldIcon,
  SpinnerIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "../components/ui";
import { useAccounts } from "../features/accounts/hooks";
import { useFormValidation } from "../hooks";
import type { AccountSummary, AddAccountRequest } from "../types";

const initialForm: AddAccountRequest = {
  username: "",
  password: "",
  displayName: "",
  phone: "",
};

export function Accounts() {
  const {
    accounts,
    loading,
    error,
    loadAccounts,
    addAccount,
    deleteAccount,
    updateAccount,
  } = useAccounts();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountSummary | null>(
    null,
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    values,
    touched,
    errors,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    setTouched,
  } = useFormValidation<AddAccountRequest>({
    initialValues: initialForm,
    rules: [
      {
        field: "displayName",
        validate: (v) =>
          v.length < 2 ? "Nome deve ter pelo menos 2 caracteres" : undefined,
      },
      {
        field: "username",
        validate: (v) =>
          v.length < 3
            ? "Username deve ter pelo menos 3 caracteres"
            : undefined,
      },
      {
        field: "password",
        validate: (v) =>
          v.length < 4
            ? "Password deve ter pelo menos 4 caracteres"
            : undefined,
      },
      {
        field: "phone",
        validate: (v) => {
          if (!v) return "Telemóvel é obrigatório";
          if (!/^\d{9}$/.test(v)) return "Telemóvel deve ter 9 dígitos";
          return undefined;
        },
      },
    ],
  });

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  async function handleDelete(id: string) {
    if (!confirm("Tem a certeza que deseja remover esta conta?")) return;
    setDeletingId(id);
    await deleteAccount(id);
    setDeletingId(null);
  }

  async function handleSaveEdit(
    id: string,
    data: { displayName: string; phone: string },
  ) {
    setSavingId(id);
    const success = await updateAccount(id, data);
    if (success) {
      setEditingAccount(null);
    }
    setSavingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setTouched({
      displayName: true,
      username: true,
      password: true,
      phone: true,
    });

    if (!validateAll()) return;

    setSubmitting(true);
    const result = await addAccount(values);
    setSubmitting(false);

    if (result) {
      setShowForm(false);
      reset();
    }
  }

  const stringValues = values as AddAccountRequest;
  const isFormValid =
    stringValues.displayName.length >= 2 &&
    stringValues.username.length >= 3 &&
    stringValues.password.length >= 4 &&
    /^\d{9}$/.test(stringValues.phone);

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

      {error && <ErrorAlert message={error} />}

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
              value={stringValues.displayName}
              onChange={(v) => handleChange("displayName", v)}
              onBlur={() => handleBlur("displayName")}
              error={touched.displayName ? errors.displayName : undefined}
              icon={<UserIcon className="w-4 h-4" />}
              required
            />
            <FormField
              label="Telemóvel"
              placeholder="912345678"
              type="tel"
              value={stringValues.phone}
              onChange={(v) => handleChange("phone", v.replace(/\D/g, ""))}
              onBlur={() => handleBlur("phone")}
              error={touched.phone ? errors.phone : undefined}
              icon={<PhoneIcon className="w-4 h-4" />}
              maxLength={9}
              required
            />
          </div>

          <FormField
            label="Username riotinto.pt"
            placeholder="username"
            value={stringValues.username}
            onChange={(v) => handleChange("username", v)}
            onBlur={() => handleBlur("username")}
            error={touched.username ? errors.username : undefined}
            icon={<AtIcon className="w-4 h-4" />}
            required
          />

          <FormField
            label="Palavra-passe riotinto.pt"
            placeholder="••••••••"
            type="password"
            value={stringValues.password}
            onChange={(v) => handleChange("password", v)}
            onBlur={() => handleBlur("password")}
            error={touched.password ? errors.password : undefined}
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
        <EmptyState
          icon={<UsersIcon className="w-8 h-8" />}
          title="Nenhuma conta adicionada"
          description="Adicione as contas riotinto.pt que pretende gerir."
          action={
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-all duration-200 btn-press"
            >
              <PlusIcon className="w-4 h-4" />
              Adicionar conta
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              onDelete={handleDelete}
              onEdit={setEditingAccount}
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
            As palavras-passe são encritadas com AES-256-GCM antes de serem
            guardadas.
          </p>
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
