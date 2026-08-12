import {
  createContext,
  useEffect,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

type SessionRole = "admin" | "manager" | "staff" | null;

type SessionUser = {
  first_name?: string;
  last_name?: string;
  email: string;
  role: SessionRole;
  status?: string;
  force_password_change?: boolean;
  last_login_at?: string | null;
};

type AuthContextValue = {
  changePassword: (currentPassword: string, newPassword: string) => Promise<SessionUser | null>;
  isAdmin: boolean;
  isPasswordChangeRequired: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<SessionUser | null>;
  signOut: () => void;
  user: SessionUser | null;
};

const STORAGE_KEY = "omega-session-user";

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readStoredUser(): SessionUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.sessionStorage.getItem(STORAGE_KEY);
  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as SessionUser;
    return parsedValue?.role ? parsedValue : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(() => readStoredUser());
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);

  function coerceSessionUser(rawUser: SessionUser | null | undefined, fallbackEmail?: string): SessionUser {
    const role = rawUser?.role;
    return {
      ...rawUser,
      email: normalizeEmail(rawUser?.email ?? fallbackEmail ?? ""),
      role: role === "admin" || role === "manager" ? role : "staff",
      force_password_change: rawUser?.force_password_change ?? false,
    };
  }

  async function signIn(email: string, password: string) {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizeEmail(email),
        password,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { user?: SessionUser };
    const nextUser = coerceSessionUser(payload.user, email);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    setSessionRefreshKey((current) => current + 1);
    return nextUser;
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const response = await fetch("/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { user?: SessionUser };
    const nextUser = coerceSessionUser(payload.user, user?.email);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    setSessionRefreshKey((current) => current + 1);
    return nextUser;
  }

  function signOut() {
    void fetch("/auth/logout", {
      method: "POST",
    }).catch(() => undefined);
    window.sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  useEffect(() => {
    if (!user) {
      return;
    }

    void fetch("/auth/me")
      .then(async (response) => {
        if (response.ok) {
          const payload = (await response.json()) as { user?: SessionUser };
          if (payload.user) {
            const nextUser = coerceSessionUser(payload.user);
            window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
            setUser(nextUser);
          }
          return;
        }

        if (response.status === 401 || response.status === 403) {
          window.sessionStorage.removeItem(STORAGE_KEY);
          setUser(null);
        }
      })
      .catch(() => undefined);
  }, [sessionRefreshKey]);

  const value = useMemo<AuthContextValue>(
    () => ({
      changePassword,
      isAdmin: user?.role === "admin",
      isPasswordChangeRequired: user?.force_password_change === true,
      isSignedIn: user !== null,
      signIn,
      signOut,
      user,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
