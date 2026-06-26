import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { Button, Input } from "../components/ui";

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const didSignIn = await signIn(email, password);
    if (!didSignIn) {
      setError("Sign in failed");
      return;
    }

    navigate("/income-protection");
  }

  return (
    <div className="page-stack">
      <div className="page-heading page-heading-compact">
        <div>
          <h1>Staff Login</h1>
          <p className="page-subtitle">Enter your credentials to access Omega Document Creator.</p>
        </div>
      </div>

      <section className="section-divided">
        <h2 className="section-title">Login credentials</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Input
              id="login-email"
              label="Email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
            <Input
              id="login-password"
              label="Password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </div>
          {error ? <p className="field-error" style={{ marginTop: "var(--space-4)" }}>{error}</p> : null}
          <div className="form-actions">
            <div className="form-actions-right">
              <Button type="submit" variant="primary">
                Sign In
              </Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
