'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { THEMES, DEFAULT_THEME } from '@/lib/themes.mjs';

const ThemeContext = createContext({ theme: DEFAULT_THEME, setTheme: () => {}, themes: THEMES });

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children, initialTheme }) {
  const [theme, setThemeState] = useState(initialTheme || DEFAULT_THEME);

  const applyTheme = useCallback((id) => {
    const t = THEMES[id] || THEMES[DEFAULT_THEME];
    const root = document.documentElement;
    root.setAttribute('data-theme', id);
    Object.entries(t.colors).forEach(([key, val]) => {
      root.style.setProperty(`--craft-${key}`, val);
    });
    if (id === 'light') {
      root.style.setProperty('color', 'rgba(0, 0, 0, 0.87)');
    } else {
      root.style.setProperty('color', 'rgba(255, 255, 255, 0.92)');
    }
  }, []);

  const setTheme = useCallback((id) => {
    setThemeState(id);
    applyTheme(id);
    try {
      localStorage.setItem('craft-theme', id);
    } catch {}
  }, [applyTheme]);

  useEffect(() => {
    let stored = null;
    try {
      stored = localStorage.getItem('craft-theme');
    } catch {}
    const resolved = stored && THEMES[stored] ? stored : (initialTheme || DEFAULT_THEME);
    setThemeState(resolved);
    applyTheme(resolved);
  }, [initialTheme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}
