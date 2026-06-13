import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { COLOR_SCHEMES, ColorSchemeDefinition, ColorSchemeId, DEFAULT_SCHEME_ID } from "@/constants/color-schemes";

const SCHEME_KEY = "@scorekeeper/color-scheme";

type ColorSchemeContextValue = {
	schemeId: ColorSchemeId;
	scheme: ColorSchemeDefinition;
	setSchemeId: (id: ColorSchemeId) => void;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

export function ColorSchemeProvider({ children }: { children: React.ReactNode }) {
	const [schemeId, setSchemeIdState] = useState<ColorSchemeId>(DEFAULT_SCHEME_ID);

	useEffect(() => {
		AsyncStorage.getItem(SCHEME_KEY).then((storedScheme) => {
			if (storedScheme && COLOR_SCHEMES.some((s) => s.id === storedScheme)) {
				setSchemeIdState(storedScheme as ColorSchemeId);
			}
		});
	}, []);

	const setSchemeId = useCallback((id: ColorSchemeId) => {
		setSchemeIdState(id);
		AsyncStorage.setItem(SCHEME_KEY, id);
	}, []);

	const scheme = COLOR_SCHEMES.find((s) => s.id === schemeId) ?? COLOR_SCHEMES[0];

	return (
		<ColorSchemeContext.Provider value={{ schemeId, scheme, setSchemeId }}>
			{children}
		</ColorSchemeContext.Provider>
	);
}

export function useColorSchemeContext() {
	const ctx = useContext(ColorSchemeContext);
	if (!ctx) throw new Error("useColorSchemeContext must be used within ColorSchemeProvider");
	return ctx;
}
