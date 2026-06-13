import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const LARGE_TEXT_KEY = "@scorekeeper/large-text";

/** Multiplier applied to font sizes when the "Larger Text" setting is enabled. */
export const LARGE_TEXT_SCALE = 1.3;

type TextScaleContextValue = {
	/** Whether the user has opted into larger in-app text. */
	largeText: boolean;
	setLargeText: (value: boolean) => void;
	/** Font-size multiplier to apply to text: 1 normally, LARGE_TEXT_SCALE when enabled. */
	scale: number;
};

const TextScaleContext = createContext<TextScaleContextValue | null>(null);

export function TextScaleProvider({ children }: { children: React.ReactNode }) {
	const [largeText, setLargeTextState] = useState(false);

	useEffect(() => {
		AsyncStorage.getItem(LARGE_TEXT_KEY).then((stored) => {
			if (stored === "true") setLargeTextState(true);
		});
	}, []);

	const setLargeText = useCallback((value: boolean) => {
		setLargeTextState(value);
		AsyncStorage.setItem(LARGE_TEXT_KEY, value ? "true" : "false");
	}, []);

	const scale = largeText ? LARGE_TEXT_SCALE : 1;

	return (
		<TextScaleContext.Provider value={{ largeText, setLargeText, scale }}>
			{children}
		</TextScaleContext.Provider>
	);
}

export function useTextScaleContext() {
	const ctx = useContext(TextScaleContext);
	if (!ctx) throw new Error("useTextScaleContext must be used within TextScaleProvider");
	return ctx;
}

/** Convenience hook returning just the font-size multiplier. */
export function useTextScale() {
	return useTextScaleContext().scale;
}
