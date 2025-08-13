// Utility functions for testing authentication
// These can be called from the browser console for testing

export const clearAuth = () => {
  localStorage.removeItem("skriptpanda.early_access_authenticated");
  window.location.reload();
};

export const setAuth = () => {
  localStorage.setItem("skriptpanda.early_access_authenticated", "true");
  window.location.reload();
};

export const checkAuth = () => {
  const isAuth = localStorage.getItem("skriptpanda.early_access_authenticated") === "true";
  console.log("Authentication status:", isAuth);
  return isAuth;
};

// Make functions available globally for testing
if (typeof window !== "undefined") {
  (window as any).authTest = {
    clearAuth,
    setAuth,
    checkAuth,
  };
}
