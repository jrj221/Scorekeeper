import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { setBackgroundColorAsync } from "expo-system-ui";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GamesProvider } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";

const HEADER_H = 39;

function CustomHeader({ options, back, route }: { options: any; back?: { title: string }; route: any }) {
	const theme = useTheme();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const tint = options.headerTintColor ?? theme.text;
	const bg = options.headerStyle?.backgroundColor ?? theme.backgroundElement;

	let titleNode: React.ReactNode;
	if (typeof options.headerTitle === "function") {
		titleNode = options.headerTitle({
			children: options.title ?? route.name,
			tintColor: tint,
			allowFontScaling: true,
			style: {},
		});
	} else {
		titleNode = (
			<Text style={[styles.title, { color: tint }]} numberOfLines={1}>
				{(options.headerTitle as string | undefined) ?? options.title ?? route.name}
			</Text>
		);
	}

	const rightNode = options.headerRight?.({ tintColor: tint, canGoBack: !!back });

	return (
		<View style={{ backgroundColor: bg, paddingTop: insets.top, height: HEADER_H + insets.top }}>
			<View style={styles.header}>
				<View style={styles.side}>
					{back ? (
						<TouchableOpacity
							onPress={() => router.back()}
							style={styles.backBtn}
							activeOpacity={0.5}
							hitSlop={8}
						>
							<SymbolView
								name="chevron.left"
								size={18}
								tintColor={tint}
								style={{ backgroundColor: "transparent" }}
							/>
							{options.headerBackTitle ? (
								<Text style={[styles.backLabel, { color: tint }]} numberOfLines={1}>
									{options.headerBackTitle}
								</Text>
							) : null}
						</TouchableOpacity>
					) : null}
				</View>
				<View style={styles.titleContainer}>{titleNode}</View>
				<View style={[styles.side, styles.sideRight]}>{rightNode ?? null}</View>
			</View>
		</View>
	);
}

export default function RootLayout() {
	const theme = useTheme();

	useEffect(() => {
		setBackgroundColorAsync(theme.background);
	}, [theme.background]);

	return (
		<GamesProvider>
			<View style={{ flex: 1, backgroundColor: theme.background }}>
				<Stack
					screenOptions={{
						headerShadowVisible: false,
						contentStyle: { backgroundColor: theme.background },
						header: ({ options, back, route }) => (
							<CustomHeader options={options} back={back} route={route} />
						),
					}}
				/>
			</View>
		</GamesProvider>
	);
}

const styles = StyleSheet.create({
	header: {
		height: 44,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 4,
	},
	side: {
		minWidth: 90,
		justifyContent: "center",
	},
	sideRight: {
		alignItems: "flex-end",
	},
	backBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 3,
		paddingHorizontal: 8,
		paddingVertical: 6,
	},
	backLabel: {
		fontSize: 17,
		maxWidth: 80,
	},
	titleContainer: {
		flex: 1,
		alignItems: "center",
	},
	title: {
		fontSize: 16,
		fontWeight: "600",
	},
});
