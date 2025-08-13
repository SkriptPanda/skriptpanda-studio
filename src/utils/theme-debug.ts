// Utility functions for debugging theme synchronization
// These can be called from the browser console for testing

export const checkThemeState = () => {
  const bodyClasses = Array.from(document.body.classList);
  const savedTheme = localStorage.getItem("skriptpanda.theme");
  const computedBackground = getComputedStyle(document.body).getPropertyValue("--background");
  const computedForeground = getComputedStyle(document.body).getPropertyValue("--foreground");
  
  const themeInfo = {
    bodyClasses,
    savedTheme,
    computedBackground: computedBackground.trim(),
    computedForeground: computedForeground.trim(),
    isDarkMode: bodyClasses.includes("dark"),
    activeTheme: bodyClasses.find(cls => cls.startsWith("theme-"))?.replace("theme-", "") || "none"
  };
  
  console.log("Theme State Debug:", themeInfo);
  return themeInfo;
};

export const forceApplyTheme = (themeKey: string) => {
  const themes = [
    { key: "sp-dark", dark: true },
    { key: "sp-light", dark: false },
    { key: "dracula", dark: true },
    { key: "solarized", dark: false },
  ];
  
  const theme = themes.find(t => t.key === themeKey) || themes[0];
  
  // Remove all theme classes
  document.body.classList.remove(
    ...themes.map(t => `theme-${t.key}`),
    "dark"
  );
  
  // Apply new theme
  document.body.classList.add(`theme-${theme.key}`);
  if (theme.dark) document.body.classList.add("dark");
  
  // Save to localStorage
  localStorage.setItem("skriptpanda.theme", themeKey);
  
  console.log(`Force applied theme: ${themeKey}`, {
    isDark: theme.dark,
    bodyClasses: Array.from(document.body.classList)
  });
  
  return checkThemeState();
};

export const resetTheme = () => {
  localStorage.removeItem("skriptpanda.theme");
  window.location.reload();
};

export const listAvailableThemes = () => {
  const themes = [
    { key: "sp-dark", label: "SkriptPanda Dark", dark: true },
    { key: "sp-light", label: "SkriptPanda Light", dark: false },
    { key: "dracula", label: "Dracula", dark: true },
    { key: "solarized", label: "Solarized Light", dark: false },
  ];
  
  console.log("Available themes:", themes);
  return themes;
};

// Make functions available globally for testing
if (typeof window !== "undefined") {
  (window as any).themeDebug = {
    checkThemeState,
    forceApplyTheme,
    resetTheme,
    listAvailableThemes,
  };
}
