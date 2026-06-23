import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

const API_BASE = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`;
setBaseUrl(API_BASE);

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem("auth_token"),
          AsyncStorage.getItem("auth_user"),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as AuthUser);
          setAuthTokenGetter(() => storedToken);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (newToken: string, newUser: AuthUser) => {
    await Promise.all([
      AsyncStorage.setItem("auth_token", newToken),
      AsyncStorage.setItem("auth_user", JSON.stringify(newUser)),
    ]);
    setToken(newToken);
    setUser(newUser);
    setAuthTokenGetter(() => newToken);
  };

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem("auth_token"),
      AsyncStorage.removeItem("auth_user"),
    ]);
    setToken(null);
    setUser(null);
    setAuthTokenGetter(() => null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
