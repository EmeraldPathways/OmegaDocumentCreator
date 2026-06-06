import { Route, Routes } from "react-router-dom";

import { AppShell } from "./components/app-shell";
import { AdminPage } from "./pages/admin-page";
import { ClientFormPage } from "./pages/client-form-page";
import { ClientProfilePage } from "./pages/client-profile-page";
import { ClientsPage } from "./pages/clients-page";
import { DashboardPage } from "./pages/dashboard-page";
import { IncomeProtectionPage } from "./pages/income-protection-page";
import { LoginPage } from "./pages/login-page";
import { SettingsPage } from "./pages/settings-page";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/new" element={<ClientFormPage />} />
        <Route path="/clients/:clientReference" element={<ClientProfilePage />} />
        <Route path="/clients/:clientReference/income-protection" element={<IncomeProtectionPage />} />
        <Route path="/clients/:clientReference/edit" element={<ClientFormPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  );
}
