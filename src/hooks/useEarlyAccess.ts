import { useState, useEffect } from "react";

const STORAGE_KEY = "skriptpanda.early_access_authenticated";

export function useEarlyAccess() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = () => {
      const authStatus = localStorage.getItem(STORAGE_KEY) === "true";
      setIsAuthenticated(authStatus);
    };

    checkAuth();

    // Listen for storage changes (in case user logs out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const authenticate = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    authenticate,
    logout,
  };
}
