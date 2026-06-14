import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("admin@omega.local");
  const [password, setPassword] = useState("ChangeMe123!");
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
      <section className="panel login-panel">
        <p className="eyebrow">Secure access</p>
        <h1>Staff Login</h1>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
          </label>
          <label>
            Password
            <input onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
          </label>
          <button className="primary-action" type="submit">
            Sign In
          </button>
          {error ? <p>{error}</p> : null}
        </form>
      </section>
    </div>
  );
}
