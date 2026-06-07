import {
  createContext,
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

type AuthContextValue = {
  isAdmin: boolean;
  isSignedIn: boolean;
  signIn: (email: string) => void;
  signOut: () => void;
  user: SessionUser | null;
};

const STORAGE_KEY = "omega-session-user";

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function resolveRole(email: string): SessionRole {
  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail === "admin@omega.local") {
    return "admin";
  }

  if (normalizedEmail.length > 0) {
    return "staff";
  }

  return null;
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

  function signIn(email: string) {
    const role = resolveRole(email);
    if (!role) {
      return;
    }

    const nextUser = { email: normalizeEmail(email), role };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function signOut() {
    window.sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

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
