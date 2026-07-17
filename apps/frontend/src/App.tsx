import { Navigate, Route, Routes, useParams } from "react-router-dom";

import { AuthProvider, useAuth } from "./auth/auth-context";
import { AppShell } from "./components/app-shell";
import { ErrorBoundary } from "./components/error-boundary";
import { ToastProvider } from "./components/ui";
import { ClientDataProvider } from "./data/client-data-context";
import { useClientData } from "./data/client-data-context";
import { AdminPage } from "./pages/admin-page";
import { ClientFormPage } from "./pages/client-form-page";
import { ClientProfilePage } from "./pages/client-profile-page";
import { ClientsPage } from "./pages/clients-page";
import { FactFindPage } from "./pages/fact-find-page";
import { FilesDocsPage } from "./pages/files-docs-page";
import { IncomeProtectionDocumentsPage } from "./pages/income-protection-documents-page";
import { LoginPage } from "./pages/login-page";
import { PensionsPage } from "./pages/pensions-page";
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
  return <IncomeProtectionDocumentsPage />;
}

function RedirectFactFindHome() {
  return <FactFindPage />;
}

function RedirectFilesDocsHome() {
  return <FilesDocsPage />;
}

function RedirectPensionsHome() {
  return <PensionsPage />;
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
      <ErrorBoundary>
        <Routes>
        <Route path="/" element={<Navigate replace to="/fact-find" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/fact-find" element={<RedirectFactFindHome />} />
        <Route path="/income-protection" element={<RedirectIncomeProtectionHome />} />
        <Route path="/pensions" element={<RedirectPensionsHome />} />
        <Route path="/files-docs" element={<RedirectFilesDocsHome />} />
        <Route path="/documents" element={<Navigate replace to="/clients" />} />
        <Route path="/documents/:clientReference" element={<RedirectDocumentFolder />} />
        <Route path="/files" element={<Navigate replace to="/files-docs" />} />
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
        <Route
          path="/settings"
          element={
            <RequireAdmin>
              <SettingsPage />
            </RequireAdmin>
          }
        />
      </Routes>
      </ErrorBoundary>
    </AppShell>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ClientDataProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </ClientDataProvider>
    </AuthProvider>
  );
}
