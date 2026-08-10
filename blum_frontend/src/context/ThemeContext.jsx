import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const THEME_STORAGE_KEY = "blum-theme";
export const THEME_OPTIONS = ["light", "dark", "system"];

function getSystemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme) {
  if (theme === "dark" || theme === "light") return theme;
  return getSystemTheme();
}

export function applyResolvedTheme(resolved) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#09090b" : "#2563eb");
  }
}

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (THEME_OPTIONS.includes(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "system";
}

const ThemeContext = createContext({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    resolveTheme(readStoredTheme()),
  );

  const setTheme = useCallback((next) => {
    const value = THEME_OPTIONS.includes(next) ? next : "system";
    setThemeState(value);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    const resolved = resolveTheme(value);
    setResolvedTheme(resolved);
    applyResolvedTheme(resolved);
  }, []);

  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyResolvedTheme(resolved);

    if (
      theme !== "system" ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = resolveTheme("system");
      setResolvedTheme(next);
      applyResolvedTheme(next);
    };
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, [theme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
