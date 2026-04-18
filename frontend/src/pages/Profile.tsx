import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { authClient } from "../lib/auth";
import { getDeviceDisplayName } from "../utils/userAgent";

interface Session {
  id: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  isCurrent?: boolean;
}

type DefaultView = "dashboard" | "schedule";

const DEFAULT_VIEW_KEY = "rio-tinto-default-view";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatSessionDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Hoje às ${date.toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else if (diffDays === 1) {
    return `Ontem às ${date.toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else if (diffDays < 7) {
    return `Há ${diffDays} dias`;
  }
  return formatDate(date);
}

// Icons
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

function DeviceIcon({ className }: { className?: string }) {
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
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
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

function HouseIcon({ className }: { className?: string }) {
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
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
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
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function SignOutIcon({ className }: { className?: string }) {
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
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );
}

export function Profile() {
  const { user, signOut, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [revokeOnPasswordChange, setRevokeOnPasswordChange] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(
    null,
  );
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const [defaultView, setDefaultView] = useState<DefaultView>("dashboard");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(DEFAULT_VIEW_KEY) as DefaultView;
    if (saved) {
      setDefaultView(saved);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const { data } = await authClient.getSession();
      const currentToken = data?.session?.token;

      const sessionList = await authClient.listSessions();
      const mapped: Session[] = (sessionList.data ?? []).map((s) => ({
        id: s.id,
        token: s.token,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        isCurrent: s.token === currentToken,
      }));

      mapped.sort((a, b) => {
        if (a.isCurrent) return -1;
        if (b.isCurrent) return 1;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      setSessions(mapped);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }

  async function handleSaveName() {
    if (!name.trim()) {
      setNameError("O nome não pode estar vazio");
      return;
    }

    setIsSavingName(true);
    setNameError("");
    setNameSuccess(false);

    try {
      const result = await authClient.updateUser({ name: name.trim() });
      if (result.error) {
        setNameError(result.error.message ?? "Erro ao guardar o nome");
      } else {
        setNameSuccess(true);
        setIsEditingName(false);
        await refreshUser();
        setTimeout(() => setNameSuccess(false), 3000);
      }
    } catch {
      setNameError("Erro ao guardar o nome");
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Introduz a palavra-passe atual");
      return;
    }

    if (!newPassword) {
      setPasswordError("Introduz a nova palavra-passe");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("A nova palavra-passe deve ter pelo menos 8 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("As palavras-passe não coincidem");
      return;
    }

    setIsChangingPassword(true);

    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: revokeOnPasswordChange,
      });

      if (result.error) {
        setPasswordError(
          result.error.message ?? "Erro ao alterar a palavra-passe",
        );
      } else {
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    } catch {
      setPasswordError("Erro ao alterar a palavra-passe");
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleRevokeSession(token: string) {
    setRevokingSessionId(token);
    try {
      await authClient.revokeSession({ token });
      await loadSessions();
    } catch (err) {
      console.error("Failed to revoke session:", err);
    } finally {
      setRevokingSessionId(null);
    }
  }

  async function handleRevokeOtherSessions() {
    setIsRevokingAll(true);
    try {
      await authClient.revokeOtherSessions();
      await loadSessions();
    } catch (err) {
      console.error("Failed to revoke other sessions:", err);
    } finally {
      setIsRevokingAll(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword) {
      setDeleteError("Introduz a tua palavra-passe para confirmar");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const result = await authClient.deleteUser({ password: deletePassword });
      if (result.error) {
        setDeleteError(result.error.message ?? "Erro ao eliminar a conta");
      } else {
        await signOut();
        navigate("/login");
      }
    } catch {
      setDeleteError("Erro ao eliminar a conta");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleDefaultViewChange(view: DefaultView) {
    setDefaultView(view);
    localStorage.setItem(DEFAULT_VIEW_KEY, view);
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-white text-2xl font-bold">Perfil</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Gere a tua conta e preferências
        </p>
      </div>

      {/* User Info Section */}
      <section className="bg-slate-800 rounded-xl p-5 border border-slate-700/50">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-900/20">
            {getInitials(user.name)}
          </div>
          <div>
            <p className="text-white font-semibold text-lg">{user.name}</p>
            <p className="text-slate-400 text-sm">{user.email}</p>
          </div>
        </div>
      </section>

      {/* Edit Name Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-slate-500" />
          <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider">
            Nome
          </h2>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          {isEditingName ? (
            <div className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm outline-hidden transition-all duration-200 ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500/50"
                placeholder="O teu nome"
                autoFocus
              />
              {nameError && (
                <p className="text-rose-400 text-xs">{nameError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setNameError("");
                    setName(user.name);
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2.5 text-sm font-medium transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveName}
                  disabled={isSavingName}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isSavingName ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>A guardar...</span>
                    </>
                  ) : (
                    "Guardar"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{user.name}</p>
                {nameSuccess && (
                  <p className="text-emerald-400 text-xs flex items-center gap-1 mt-1">
                    <CheckIcon className="w-3 h-3" />
                    Nome atualizado
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsEditingName(true)}
                className="text-emerald-400 text-sm font-medium hover:text-emerald-300 transition-colors"
              >
                Editar
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Preferences Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <HouseIcon className="w-4 h-4 text-slate-500" />
          <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider">
            Preferências
          </h2>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-xs mb-3">
            Página inicial após iniciar sessão
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDefaultViewChange("dashboard")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
                defaultView === "dashboard"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              <HouseIcon className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => handleDefaultViewChange("schedule")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
                defaultView === "schedule"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              Campos
            </button>
          </div>
        </div>
      </section>

      {/* Change Password Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <LockIcon className="w-4 h-4 text-slate-500" />
          <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider">
            Alterar Palavra-passe
          </h2>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 space-y-4">
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">
              Palavra-passe Atual
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-900 text-white placeholder-slate-500 rounded-xl pl-10 pr-10 py-2.5 text-sm outline-hidden transition-all duration-200 ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500/50"
                placeholder="••••••••"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <LockIcon className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showCurrentPassword ? (
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1.5">
              Nova Palavra-passe
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-900 text-white placeholder-slate-500 rounded-xl pl-10 pr-10 py-2.5 text-sm outline-hidden transition-all duration-200 ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Mínimo 8 caracteres"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <LockIcon className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showNewPassword ? (
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1.5">
              Confirmar Nova Palavra-passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-900 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm outline-hidden transition-all duration-200 ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500/50"
              placeholder="••••••••"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={revokeOnPasswordChange}
              onChange={(e) => setRevokeOnPasswordChange(e.target.checked)}
              className="w-4 h-4 rounded-sm bg-slate-700 border-slate-600 text-emerald-600 focus:ring-emerald-500/50 focus:ring-offset-slate-800"
            />
            <span className="text-slate-300 text-sm">
              Terminar todas as outras sessões
            </span>
          </label>

          {passwordError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-center gap-2">
              <XIcon className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-rose-400 text-xs">{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-emerald-400 text-xs">
                Palavra-passe alterada com sucesso
              </p>
            </div>
          )}

          <button
            onClick={handleChangePassword}
            disabled={isChangingPassword}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isChangingPassword ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>A alterar...</span>
              </>
            ) : (
              "Alterar Palavra-passe"
            )}
          </button>
        </div>
      </section>

      {/* Active Sessions Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DeviceIcon className="w-4 h-4 text-slate-500" />
            <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider">
              Sessões Ativas
            </h2>
          </div>
          {sessions.length > 1 && (
            <button
              onClick={handleRevokeOtherSessions}
              disabled={isRevokingAll}
              className="text-rose-400 text-xs font-medium hover:text-rose-300 transition-colors flex items-center gap-1"
            >
              <SignOutIcon className="w-3 h-3" />
              {isRevokingAll ? "A terminar..." : "Terminar outras"}
            </button>
          )}
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
          {isLoadingSessions ? (
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-slate-700/50 rounded-lg shimmer"
                />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center">
              <DeviceIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Nenhuma sessão ativa</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0">
                      <DeviceIcon className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">
                          {session.userAgent
                            ? getDeviceDisplayName(session.userAgent)
                            : "Dispositivo Desconhecido"}
                        </p>
                        {session.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium shrink-0">
                            Atual
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs truncate">
                        {formatSessionDate(session.createdAt)}
                        {session.ipAddress && ` • ${session.ipAddress}`}
                      </p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(session.token)}
                      disabled={revokingSessionId === session.token}
                      className="text-slate-400 hover:text-rose-400 text-xs font-medium transition-colors shrink-0 ml-2"
                    >
                      {revokingSessionId === session.token ? (
                        <svg
                          className="w-4 h-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        "Terminar"
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Danger Zone Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldIcon className="w-4 h-4 text-rose-500" />
          <h2 className="text-rose-400 text-sm font-semibold uppercase tracking-wider">
            Zona de Perigo
          </h2>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-rose-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Eliminar Conta</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Esta ação é irreversível. Todos os dados serão eliminados.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 border border-rose-500/30"
            >
              <TrashIcon className="w-4 h-4" />
              Eliminar
            </button>
          </div>
        </div>
      </section>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => {
              setShowDeleteModal(false);
              setDeletePassword("");
              setDeleteError("");
            }}
          />
          <div className="relative bg-slate-800 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-sm p-6 scale-in border border-slate-700/50">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <TrashIcon className="w-7 h-7 text-rose-400" />
              </div>
              <h2 className="text-white text-xl font-bold">Eliminar Conta</h2>
              <p className="text-slate-400 text-sm mt-2">
                Para confirmar, introduz a tua palavra-passe.
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full bg-slate-900 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm outline-hidden transition-all duration-200 ring-1 ring-slate-700 focus:ring-2 focus:ring-rose-500/50"
                placeholder="Palavra-passe"
              />

              {deleteError && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-center gap-2">
                  <XIcon className="w-4 h-4 text-rose-400 shrink-0" />
                  <p className="text-rose-400 text-xs">{deleteError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword("");
                    setDeleteError("");
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2.5 text-sm font-medium transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-600/50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>A eliminar...</span>
                    </>
                  ) : (
                    "Eliminar Conta"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
