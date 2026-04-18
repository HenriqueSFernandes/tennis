import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export function Layout() {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: HomeIcon },
    { path: "/schedule", label: "Campos", icon: CalendarIcon },
    { path: "/accounts", label: "Contas", icon: UsersIcon },
    { path: "/profile", label: "Perfil", icon: UserIcon },
  ];

  const handleLogout = async () => {
    await signOut();
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleLogoClick = () => {
    navigate("/");
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top bar with glass effect */}
      <header className="glass sticky top-0 z-40 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogoClick}
              type="button"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-200 hover:cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-xl">🎾</span>
              </div>
              <div>
                <h1 className="text-white font-semibold text-sm leading-tight">
                  Rio Tinto Tennis
                </h1>
                <p className="text-slate-500 text-xs">
                  Court Booking Assistant
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* User avatar - clickable to profile */}
            {user && (
              <button
                type="button"
                onClick={handleProfileClick}
                className="flex items-center gap-2 hover:bg-slate-800/50 transition-colors duration-200 rounded-lg px-2 py-1 -mr-2"
              >
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-lg shadow-emerald-900/20">
                  {getInitials(user.name)}
                </div>
                <span className="hidden sm:block text-slate-300 text-sm">
                  {user.name}
                </span>
              </button>
            )}

            <button
              onClick={handleLogout}
              type="button"
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-slate-800/50"
              title="Sair"
            >
              <LogoutIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden relative">
        <div key={location.pathname} className="page-transition h-full">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav with glass effect */}
      <nav className="glass sticky bottom-0 z-40 border-t border-slate-700/50">
        <div className="max-w-md mx-auto flex">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center py-3 gap-1.5 text-xs font-medium transition-all duration-200 relative ${
                    isActive
                      ? "text-emerald-400"
                      : "text-slate-400 hover:text-slate-200"
                  }`
                }
              >
                <item.icon
                  className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// Icon Components
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <title>Home Icon</title>
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
      <title>Calendar Icon</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
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
      <title>Users Icon</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
      />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <title>Logout Icon</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
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
      <title>User Icon</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}
