import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff } from "lucide-react";

// Apply the default theme on mount
const applyDefaultTheme = () => {
  const savedTheme = localStorage.getItem("skriptpanda.theme") || "sp-dark";
  const themes = [
    { key: "sp-dark", dark: true },
    { key: "sp-light", dark: false },
    { key: "dracula", dark: true },
    { key: "solarized", dark: false },
  ];

  const theme = themes.find(t => t.key === savedTheme) || themes[0];
  document.body.classList.remove(...themes.map(t => `theme-${t.key}`), "dark");
  document.body.classList.add(`theme-${theme.key}`);
  if (theme.dark) document.body.classList.add("dark");
};

const EARLY_ACCESS_CODE = "Isntitcoolguys???";
const STORAGE_KEY = "skriptpanda.early_access_authenticated";

interface EarlyAccessAuthProps {
  onAuthenticated: () => void;
}

export function EarlyAccessAuth({ onAuthenticated }: EarlyAccessAuthProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is already authenticated on mount and apply theme
  useEffect(() => {
    applyDefaultTheme();
    const isAuthenticated = localStorage.getItem(STORAGE_KEY) === "true";
    if (isAuthenticated) {
      onAuthenticated();
    }
  }, [onAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simulate a brief loading state for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    if (code === EARLY_ACCESS_CODE) {
      localStorage.setItem(STORAGE_KEY, "true");
      onAuthenticated();
    } else {
      setError("Invalid early access code. Please check your code and try again.");
      setCode("");
    }
    
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value);
    if (error) setError(""); // Clear error when user starts typing
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 overflow-hidden">
            <img
              src="/panda3.png"
              alt="SkriptPanda Logo"
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            SkriptPanda<span style={{ color: "hsl(var(--brand-orange))" }}>.</span>
          </h1>
          <p className="text-muted-foreground">Studio Early Access</p>
        </div>

        {/* Authentication Card */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-xl">Early Access Required</CardTitle>
            <CardDescription>
              Enter your early access code to continue to SkriptPanda Studio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="access-code" className="text-sm font-medium">
                  Access Code
                </label>
                <div className="relative">
                  <Input
                    id="access-code"
                    type={showCode ? "text" : "password"}
                    value={code}
                    onChange={handleInputChange}
                    placeholder="Enter your early access code"
                    className="pr-10"
                    disabled={isLoading}
                    autoComplete="off"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCode(!showCode)}
                    disabled={isLoading}
                  >
                    {showCode ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={!code.trim() || isLoading}
              >
                {isLoading ? "Verifying..." : "Access Studio"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Don't have an early access code?</p>
          <p className="mt-1">Contact the development team for access.</p>
        </div>
      </div>
    </div>
  );
}
