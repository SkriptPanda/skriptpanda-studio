// Environment configuration for production
export const ENV = {
  // Check if we're in production
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
  
  // App configuration
  APP_NAME: "SkriptPanda Studio",
  APP_VERSION: "1.0.0",
  
  // API endpoints (can be configured via environment variables)
  
  // Feature flags
  FEATURES: {
    FILE_MANAGEMENT: true,
    THEME_SWITCHING: true,
    EARLY_ACCESS: true,
  },
  
  // Storage keys
  STORAGE_KEYS: {
    THEME: "theme",
    EARLY_ACCESS_CODE: "early-access-code",
    USER_PREFERENCES: "user-preferences",
  },
  
  // Early access configuration
  EARLY_ACCESS: {
    REQUIRED: true,
    CODE: "Isntitcoolguys???",
  },
} as const;

// Type-safe environment variable access
export const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key];
  if (value === undefined && defaultValue === undefined) {
    console.warn(`Environment variable ${key} is not defined`);
    return "";
  }
  return value || defaultValue || "";
};

// Validate required environment variables
export const validateEnvironment = (): boolean => {
  const requiredVars: string[] = [];
  
  // Add any required environment variables here
  // Example: requiredVars.push('VITE_API_URL');
  
  const missing = requiredVars.filter(varName => !getEnvVar(varName));
  
  if (missing.length > 0) {
    console.error("Missing required environment variables:", missing);
    return false;
  }
  
  return true;
};

// Initialize environment validation
if (ENV.isProd) {
  validateEnvironment();
}
