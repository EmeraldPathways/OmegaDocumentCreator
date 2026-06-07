import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./auth/auth-context";
import { AppShell } from "./components/app-shell";
import { AdminPage } from "./pages/admin-page";
import { ClientDocumentsPage } from "./pages/client-documents-page";
import { ClientFormPage } from "./pages/client-form-page";
import { ClientProfilePage } from "./pages/client-profile-page";
import { ClientsPage } from "./pages/clients-page";
import { DocumentsPage } from "./pages/documents-page";
import { FilesPage } from "./pages/files-page";
import { IncomeProtectionHubPage } from "./pages/income-protection-hub-page";
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

function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate replace to="/income-protection" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/income-protection" element={<IncomeProtectionHubPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/:clientReference" element={<ClientDocumentsPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/clients/new" element={<ClientFormPage />} />
        <Route path="/clients/:clientReference" element={<ClientProfilePage />} />
        <Route path="/clients/:clientReference/income-protection" element={<IncomeProtectionPage />} />
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
      <AppRoutes />
    </AuthProvider>
  );
}
