import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { Layout } from "./components/Layout";
import { PasswordGate } from "./components/PasswordGate";
import { DataCacheProvider } from "./DataCacheContext";
import { Accounts } from "./pages/Accounts";
import { Dashboard } from "./pages/Dashboard";
import { Schedule } from "./pages/Schedule";

function AppRoutes() {
  const { isUnlocked } = useAuth();

  if (!isUnlocked) return <PasswordGate />;

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="accounts" element={<Accounts />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataCacheProvider>
          <AppRoutes />
        </DataCacheProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
