import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { Button, Input } from "../components/ui";

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { changePassword, isSignedIn, isPasswordChangeRequired } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isSignedIn) {
    return <Navigate replace to="/login" />;
  }

  if (!isPasswordChangeRequired) {
    return <Navigate replace to="/income-protection" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!currentPassword.trim() || !newPassword.trim()) {
      setError("Enter your current password and a new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password confirmation does not match.");
      return;
    }

    setIsSaving(true);
    try {
      const nextUser = await changePassword(currentPassword, newPassword);
      if (!nextUser) {
        setError("Password change failed.");
        return;
      }
      navigate("/income-protection");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading page-heading-compact">
        <div>
          <h1>Change Password</h1>
          <p className="page-subtitle">You must change your password before you can use Omega Document Creator.</p>
        </div>
      </div>

      <section className="section-divided">
        <h2 className="section-title">Set a new password</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Input
              id="current-password"
              label="Current password"
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              value={currentPassword}
            />
            <Input
              id="new-password"
              label="New password"
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              value={newPassword}
            />
            <Input
              id="confirm-password"
              label="Confirm new password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              value={confirmPassword}
            />
          </div>
          {error ? <p className="field-error" style={{ marginTop: "var(--space-4)" }}>{error}</p> : null}
          <div className="form-actions">
            <div className="form-actions-right">
              <Button isLoading={isSaving} type="submit" variant="primary">
                Update Password
              </Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
