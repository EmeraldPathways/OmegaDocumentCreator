export function LoginPage() {
  return (
    <div className="page-stack">
      <section className="panel login-panel">
        <p className="eyebrow">Secure access</p>
        <h1>Staff Login</h1>
        <form className="login-form">
          <label>
            Email
            <input defaultValue="admin@omega.local" type="email" />
          </label>
          <label>
            Password
            <input defaultValue="ChangeMe123!" type="password" />
          </label>
          <button className="primary-action" type="submit">
            Sign In
          </button>
        </form>
      </section>
    </div>
  );
}
