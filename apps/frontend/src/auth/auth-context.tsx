import {
  createContext,
  useEffect,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

type SessionRole = "admin" | "staff" | null;

type SessionUser = {
  email: string;
  role: SessionRole;
};

type LoginResponse = {
  user?: {
    email?: string;
    role?: SessionRole;
  };
};

type AuthContextValue = {
  isAdmin: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
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
      return false;
    }

    const payload = (await response.json()) as LoginResponse;
    const responseUser = payload.user;
    if (!responseUser?.email || !responseUser.role) {
      return false;
    }

    const nextUser = {
      email: normalizeEmail(responseUser.email),
      role: responseUser.role,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return true;
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

    void fetch("/auth/me").then((response) => {
      if (response.ok) {
        return;
      }

      if (response.status === 401) {
        window.sessionStorage.removeItem(STORAGE_KEY);
        setUser(null);
      }
    }).catch(() => undefined);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAdmin: user?.role === "admin",
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
