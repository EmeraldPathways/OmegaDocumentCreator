import { Navigate, Route, Routes, useParams } from "react-router-dom";

import { AuthProvider, useAuth } from "./auth/auth-context";
import { AppShell } from "./components/app-shell";
import { ClientDataProvider } from "./data/client-data-context";
import { useClientData } from "./data/client-data-context";
import { AdminPage } from "./pages/admin-page";
import { ClientFormPage } from "./pages/client-form-page";
import { ClientProfilePage } from "./pages/client-profile-page";
import { ClientsPage } from "./pages/clients-page";
import { FilesPage } from "./pages/files-page";
import { IncomeProtectionPage } from "./pages/income-protection-page";
import { LoginPage } from "./pages/login-page";
import { SettingsPage } from "./pages/settings-page";

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate replace to="/login" />;
  }

  return children;
}

function RedirectDocumentFolder() {
  const { clientReference = "" } = useParams();
  return <Navigate replace to={`/clients/${clientReference}`} />;
}

function RedirectIncomeProtectionHome() {
  return <IncomeProtectionPage />;
}

function RedirectIncomeProtectionClient() {
  const { clientReference = "" } = useParams();

  if (typeof window !== "undefined" && clientReference) {
    window.localStorage.setItem("omega-selected-income-protection-client", clientReference);
  }

  return <Navigate replace to="/income-protection" />;
}

function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate replace to="/income-protection" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/income-protection" element={<RedirectIncomeProtectionHome />} />
        <Route path="/documents" element={<Navigate replace to="/clients" />} />
        <Route path="/documents/:clientReference" element={<RedirectDocumentFolder />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/clients/new" element={<ClientFormPage />} />
        <Route path="/clients/:clientReference" element={<ClientProfilePage />} />
        <Route path="/clients/:clientReference/income-protection" element={<RedirectIncomeProtectionClient />} />
        <Route path="/clients/:clientReference/edit" element={<ClientFormPage />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ClientDataProvider>
        <AppRoutes />
      </ClientDataProvider>
    </AuthProvider>
  );
}
