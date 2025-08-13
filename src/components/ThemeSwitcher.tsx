import { useEffect, useState } from "react";
import { Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const THEMES = [
  { key: "sp-dark", label: "SkriptPanda Dark", dark: true },
  { key: "sp-light", label: "SkriptPanda Light", dark: false },
  { key: "dracula", label: "Dracula", dark: true },
  { key: "solarized", label: "Solarized Light", dark: false },
];

const STORAGE_KEY = "skriptpanda.theme";

export function ThemeSwitcher({ onModeChange }: { onModeChange?: (mode: string) => void }) {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || "sp-dark");

  useEffect(() => {
    applyTheme(theme);
    // Notify parent component of initial theme
    onModeChange?.(theme);
  }, []);

  function applyTheme(key: string) {
    const t = THEMES.find((t) => t.key === key) || THEMES[0];
    document.body.classList.remove(
      ...THEMES.map((t) => `theme-${t.key}`),
      "dark"
    );
    document.body.classList.add(`theme-${t.key}`);
    if (t.dark) document.body.classList.add("dark");
    localStorage.setItem(STORAGE_KEY, key);
    setTheme(key);
    onModeChange?.(key);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Change theme">
          <Paintbrush className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 z-50">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {THEMES.map((t) => (
          <DropdownMenuItem key={t.key} onClick={() => applyTheme(t.key)}>
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
