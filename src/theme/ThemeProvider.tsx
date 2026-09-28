import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { palettes, type ColorScheme, type ThemeColors } from './palette';
import { spacing } from './tokens';

const STORAGE_KEY = '@sca/theme-mode';

type ThemeContextValue = {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  toggle: () => void;
  setScheme: (scheme: ColorScheme) => void;
  isDark: boolean;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [scheme, setSchemeState] = useState<ColorScheme>(
    systemScheme === 'dark' ? 'dark' : 'light',
  );
  const [isHydrated, setIsHydrated] = useState(false);

  // Carga la preferencia guardada al iniciar
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          setSchemeState(stored);
        }
      } finally {
        setIsHydrated(true);
      }
    })();
  }, []);

  const setScheme = (next: ColorScheme) => {
    setSchemeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const toggle = () => {
    setScheme(scheme === 'light' ? 'dark' : 'light');
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      colors: palettes[scheme],
      spacing,
      toggle,
      setScheme,
      isDark: scheme === 'dark',
    }),
    [scheme],
  );

  // Evita parpadeo mientras hidrata desde AsyncStorage
  if (!isHydrated) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}