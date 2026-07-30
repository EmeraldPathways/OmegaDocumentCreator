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

function RequireAuth({ children }: { children: JSX.Element }) {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
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
        <Route path="/clients" element={<RequireAuth><ClientsPage /></RequireAuth>} />
        <Route path="/fact-find" element={<RequireAuth><RedirectFactFindHome /></RequireAuth>} />
        <Route path="/income-protection" element={<RequireAuth><RedirectIncomeProtectionHome /></RequireAuth>} />
        <Route path="/pensions" element={<RequireAuth><RedirectPensionsHome /></RequireAuth>} />
        <Route path="/files-docs" element={<RequireAuth><RedirectFilesDocsHome /></RequireAuth>} />
        <Route path="/documents" element={<RequireAuth><Navigate replace to="/clients" /></RequireAuth>} />
        <Route path="/documents/:clientReference" element={<RequireAuth><RedirectDocumentFolder /></RequireAuth>} />
        <Route path="/files" element={<RequireAuth><Navigate replace to="/files-docs" /></RequireAuth>} />
        <Route path="/clients/new" element={<RequireAuth><ClientFormPage /></RequireAuth>} />
        <Route path="/clients/:clientReference" element={<RequireAuth><ClientProfilePage /></RequireAuth>} />
        <Route path="/clients/:clientReference/income-protection" element={<RequireAuth><RedirectIncomeProtectionClient /></RequireAuth>} />
        <Route path="/clients/:clientReference/edit" element={<RequireAuth><ClientFormPage /></RequireAuth>} />
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
