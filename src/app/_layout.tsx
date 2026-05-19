import { Stack } from "expo-router";
import { setBackgroundColorAsync } from "expo-system-ui";
import { useEffect } from "react";
import { View } from "react-native";

import { GamesProvider } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";

export default function RootLayout() {
	const theme = useTheme();

	// Keep the iOS window background (visible during swipe-back transitions)
	// in sync with the ocean theme so it never flashes white
	useEffect(() => {
		setBackgroundColorAsync(theme.background);
	}, [theme.background]);

	return (
		<GamesProvider>
			<View style={{ flex: 1, backgroundColor: theme.background }}>
				<Stack
					screenOptions={{
						headerStyle: { backgroundColor: theme.backgroundElement },
						headerTitleStyle: { fontSize: 16, fontWeight: "600" },
						headerTintColor: theme.text,
						headerBackTitleStyle: { fontSize: 13 },
						headerShadowVisible: false,
						contentStyle: { backgroundColor: theme.background },
					}}
				/>
			</View>
		</GamesProvider>
	);
}
