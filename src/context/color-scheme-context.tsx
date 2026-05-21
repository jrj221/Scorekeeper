import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  COLOR_SCHEMES,
  ColorSchemeId,
  ColorSchemeDefinition,
  DEFAULT_SCHEME_ID,
} from '@/constants/color-schemes';

export type ColorMode = 'system' | 'light' | 'dark';

const SCHEME_KEY = '@scorekeeper/color-scheme';
const MODE_KEY = '@scorekeeper/color-mode';

type ColorSchemeContextValue = {
  schemeId: ColorSchemeId;
  scheme: ColorSchemeDefinition;
  setSchemeId: (id: ColorSchemeId) => void;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

export function ColorSchemeProvider({ children }: { children: React.ReactNode }) {
  const [schemeId, setSchemeIdState] = useState<ColorSchemeId>(DEFAULT_SCHEME_ID);
  const [colorMode, setColorModeState] = useState<ColorMode>('system');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(SCHEME_KEY),
      AsyncStorage.getItem(MODE_KEY),
    ]).then(([storedScheme, storedMode]) => {
      if (storedScheme && COLOR_SCHEMES.some((s) => s.id === storedScheme)) {
        setSchemeIdState(storedScheme as ColorSchemeId);
      }
      if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'system') {
        setColorModeState(storedMode);
      }
    });
  }, []);

  const setSchemeId = useCallback((id: ColorSchemeId) => {
    setSchemeIdState(id);
    AsyncStorage.setItem(SCHEME_KEY, id);
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    AsyncStorage.setItem(MODE_KEY, mode);
  }, []);

  const scheme = COLOR_SCHEMES.find((s) => s.id === schemeId) ?? COLOR_SCHEMES[0];

  return (
    <ColorSchemeContext.Provider value={{ schemeId, scheme, setSchemeId, colorMode, setColorMode }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorSchemeContext() {
  const ctx = useContext(ColorSchemeContext);
  if (!ctx) throw new Error('useColorSchemeContext must be used within ColorSchemeProvider');
  return ctx;
}
