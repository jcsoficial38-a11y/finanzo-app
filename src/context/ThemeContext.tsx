import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeId, ThemeConfig, getThemeConfig, DEFAULT_THEME_ID } from '../utils/themeConfig';

const THEME_STORAGE_KEY = 'finanzo_app_theme';

interface ThemeContextType {
  themeId: ThemeId;
  theme: ThemeConfig;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: DEFAULT_THEME_ID,
  theme: getThemeConfig(DEFAULT_THEME_ID),
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode; initialThemeId?: ThemeId }> = ({
  children,
  initialThemeId,
}) => {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    try {
      if (initialThemeId) return initialThemeId;
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
      if (stored && ['blue', 'green', 'black', 'yellow-black', 'purple', 'rose'].includes(stored)) {
        return stored;
      }
    } catch {
      // ignore
    }
    return DEFAULT_THEME_ID;
  });

  const theme = getThemeConfig(themeId);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
      document.documentElement.setAttribute('data-theme', themeId);
    } catch {
      // ignore
    }
  }, [themeId]);

  const setTheme = (id: ThemeId) => {
    setThemeId(id);
  };

  return (
    <ThemeContext.Provider value={{ themeId, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
