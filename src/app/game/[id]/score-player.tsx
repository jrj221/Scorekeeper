import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useGame } from "@/hooks/use-game";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";
import { HapticButton } from "@/components/haptic-button";

const SCREEN_W = Dimensions.get("window").width;
const SCREEN_H = Dimensions.get("window").height;
const PAD = Spacing.four;
const GAP = 10;
const KEY_W = Math.floor((SCREEN_W - PAD * 2 - GAP * 2) / 3);

const ROWS = [
	["1", "2", "3"],
	["4", "5", "6"],
	["7", "8", "9"],
	["±", "0", "⌫"],
] as const;

const CURRENT_TINT = "#0077B6";

export default function ScorePlayerScreen() {
	const { id, playerId, roundIndex: roundIndexStr } = useLocalSearchParams<{
		id: string;
		playerId: string;
		roundIndex: string;
	}>();
	const router = useRouter();
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { game, updateScore } = useGame(id);

	// Compute square key size that fits the available vertical space
	const keySize = useMemo(() => {
		// Fixed heights: header (~56) + paddingTop + roundLabel + display + doneBtn + gaps + bottom inset
		const fixed = 56 + Spacing.three + 24 + 96 + 60 + Spacing.three * 3 + GAP * 3 + insets.bottom;
		const available = SCREEN_H - fixed;
		return Math.min(KEY_W, Math.max(52, Math.floor(available / 4)));
	}, [insets.bottom]);

	const roundIndex = parseInt(roundIndexStr ?? "0", 10);
	const player = game?.players.find((p) => p.id === playerId);

	const existingScore =
		game?.rounds[roundIndex]?.[playerId] !== undefined
			? game.rounds[roundIndex][playerId]
			: null;

	const [numStr, setNumStr] = useState("");
	const [negative, setNegative] = useState(false);
	// First keypress overwrites when there's an existing value
	const [overwriteNext, setOverwriteNext] = useState(false);

	useEffect(() => {
		if (existingScore !== null) {
			setNumStr(Math.abs(existingScore).toString());
			setNegative(existingScore < 0);
			setOverwriteNext(true);
		} else {
			setNumStr("");
			setNegative(false);
			setOverwriteNext(false);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	if (!game || !player) {
		return (
			<ThemedView style={shared.screen}>
				<ThemedText type="default">Player not found.</ThemedText>
			</ThemedView>
		);
	}

	const allowNegative = true;

	const pressKey = (key: string) => {
		if (key === "±") {
			if (allowNegative) {
				setNegative((v) => !v);
				setOverwriteNext(false);
			}
		} else if (key === "⌫") {
			setOverwriteNext(false);
			setNumStr((prev) => prev.slice(0, -1));
		} else {
			if (overwriteNext) {
				setNumStr(key);
				setOverwriteNext(false);
			} else {
				setNumStr((prev) => (prev.length >= 6 ? prev : prev + key));
			}
		}
	};

	const handleDone = () => {
		if (!numStr) {
			// No input at all — keep existing value (don't clear it)
			if (existingScore === null) {
				updateScore(roundIndex, playerId, null);
			}
		} else {
			const n = parseInt(numStr, 10);
			updateScore(roundIndex, playerId, isNaN(n) ? null : negative ? -n : n);
		}
		router.back();
	};

	const hasValue = numStr.length > 0;
	const displayColor = hasValue && negative ? "#4CABD4" : theme.text;
	const displayText = hasValue ? `${negative ? "−" : ""}${numStr}` : "–";

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: player.name }} />
			<SafeAreaView style={[styles.safe, { paddingBottom: insets.bottom + Spacing.two }]} edges={["bottom"]}>
				<ThemedText style={[styles.roundLabel, { color: theme.textSecondary }]}>
					Round {roundIndex + 1}
				</ThemedText>

				<View style={styles.displayArea}>
					<ThemedText style={[styles.display, { color: displayColor }]}>
						{displayText}
					</ThemedText>
				</View>

				<View style={styles.numpad}>
					{ROWS.map((row, ri) => (
						<View key={ri} style={styles.keyRow}>
							{row.map((key) => {
								const isSign = key === "±";
								const isBack = key === "⌫";
								const signActive = isSign && negative;
								const disabled = isSign && !allowNegative;
								const bg = disabled
									? theme.backgroundElement
									: signActive
									? CURRENT_TINT
									: isSign || isBack
									? theme.backgroundSelected
									: theme.backgroundElement;
								return (
									<HapticButton
										key={key}
										style={[styles.key, { width: keySize, height: keySize, backgroundColor: bg }]}
										onPress={() => !disabled && pressKey(key)}
										activeOpacity={disabled ? 1 : 0.6}
									>
										<ThemedText
											style={[
												styles.keyText,
												{
													color: disabled
														? "transparent"
														: signActive
														? "#fff"
														: theme.text },
											]}
										>
											{key}
										</ThemedText>
									</HapticButton>
								);
							})}
						</View>
					))}
				</View>

				<HapticButton
					style={[styles.doneBtn, { backgroundColor: CURRENT_TINT }]}
					onPress={handleDone}
				>
					<ThemedText type="smallBold" style={{ color: "#fff", fontSize: 18 }}>
						Done
					</ThemedText>
				</HapticButton>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
		paddingHorizontal: PAD,
		paddingTop: Spacing.two,
		gap: Spacing.three },
	roundLabel: {
		fontSize: 15,
		textAlign: "center",
		letterSpacing: 0.3 },
	displayArea: {
		height: 100,
		justifyContent: "center",
		alignItems: "center" },
	display: {
		fontSize: 72,
		lineHeight: 88,
		fontWeight: "300",
		letterSpacing: -2,
		textAlign: "center" },
	numpad: {
		gap: GAP },
	keyRow: {
		flexDirection: "row",
		gap: GAP },
	key: {
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center" },
	keyText: {
		fontSize: 28,
		lineHeight: 34,
		fontWeight: "400" },
	doneBtn: {
		height: 60,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center" } });
