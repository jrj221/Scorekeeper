import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HapticButton } from "@/components/haptic-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";

const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const ROLL_MS = 1500;

function randomFace() { return Math.floor(Math.random() * 6); }

function getDiceRows(count: number): number[][] {
	switch (count) {
		case 1: return [[0]];
		case 2: return [[0, 1]];
		case 3: return [[0, 1, 2]];
		case 4: return [[0, 1], [2, 3]];
		case 5: return [[0, 1, 2], [3, 4]];
		case 6: return [[0, 1, 2], [3, 4, 5]];
		default: return [Array.from({ length: count }, (_, i) => i)];
	}
}

export default function DiceScreen() {
	const theme = useTheme();
	const [count, setCount] = useState(2);
	const [values, setValues] = useState<number[]>([0, 0]);
	const [rolling, setRolling] = useState(false);
	const [rolled, setRolled] = useState(false);

	// One shared spin animation for all question marks
	const spinAnim = useRef(new Animated.Value(0)).current;
	const spinLoop = useRef<Animated.CompositeAnimation | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => () => {
		spinLoop.current?.stop();
		if (timerRef.current) clearTimeout(timerRef.current);
	}, []);

	const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
	// spinFadeAnim: opacity of the spinning ? (fades out while still spinning)
	const spinFadeAnim = useRef(new Animated.Value(1)).current;
	// diceFadeAnim: opacity of the revealed dice faces (fades in after ? disappears)
	const diceFadeAnim = useRef(new Animated.Value(0)).current;

	const roll = () => {
		if (rolling) return;
		const newValues = Array.from({ length: count }, randomFace);

		spinAnim.setValue(0);
		spinFadeAnim.setValue(1);
		diceFadeAnim.setValue(0);

		spinLoop.current = Animated.loop(
			Animated.timing(spinAnim, {
				toValue: 1,
				duration: 400,
				easing: Easing.linear,
				useNativeDriver: true,
			})
		);
		spinLoop.current.start();

		setRolling(true);
		setRolled(false);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		timerRef.current = setTimeout(() => {
			// Fade out ? while spin still runs — no awkward stopping
			Animated.timing(spinFadeAnim, {
				toValue: 0,
				duration: 250,
				useNativeDriver: true,
			}).start(() => {
				// ? is now invisible — stop spin and flip to dice
				spinLoop.current?.stop();
				setValues(newValues);
				setRolling(false);
				setRolled(true);
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
				// Fade dice in
				Animated.timing(diceFadeAnim, {
					toValue: 1,
					duration: 220,
					useNativeDriver: true,
				}).start();
			});
		}, ROLL_MS);
	};

	const changeCount = (n: number) => {
		spinLoop.current?.stop();
		if (timerRef.current) clearTimeout(timerRef.current);
		spinAnim.setValue(0);
		setCount(n);
		setValues(Array.from({ length: n }, randomFace));
		setRolling(false);
		setRolled(false);
	};
	const rows = getDiceRows(count);
	const total = rolled ? values.reduce((s, v) => s + v + 1, 0) : null;

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "Dice" }} />
			<SafeAreaView style={styles.safe} edges={["bottom"]}>
				{/* Count selector */}
				<View style={styles.countRow}>
					{[1, 2, 3, 4, 5, 6].map((n) => (
						<HapticButton
							key={n}
							style={[styles.countBtn, { backgroundColor: n === count ? theme.accent : theme.backgroundElement }]}
							onPress={() => changeCount(n)}
						>
							<ThemedText type="small" style={{ color: n === count ? theme.accentText : theme.text, fontWeight: "700" }}>
								{n}
							</ThemedText>
						</HapticButton>
					))}
				</View>

				{/* Dice */}
				<View style={styles.diceArea}>
					<View style={styles.diceRows}>
						{rows.map((row, ri) => (
							<View key={ri} style={styles.diceRow}>
								{row.map((idx) => (
									<View
										key={idx}
										style={[styles.die, {
											backgroundColor: theme.backgroundElement,
											borderColor: (!rolling && !rolled)
												? theme.backgroundSelected
												: rolled
													? theme.accent
													: theme.backgroundSelected,
										}]}
									>
										{rolling ? (
											<Animated.Text style={[styles.dieFace, { transform: [{ rotate: spin }], opacity: spinFadeAnim, color: theme.textSecondary }]}>
												?
											</Animated.Text>
										) : rolled ? (
											<Animated.Text style={[styles.dieFace, { opacity: diceFadeAnim, color: theme.text }]}>
												{FACES[values[idx] ?? 0]}
											</Animated.Text>
										) : (
											<ThemedText style={[styles.dieFace, { color: theme.textSecondary, opacity: 0.35 }]}>?</ThemedText>
										)}
									</View>
								))}
							</View>
						))}
					</View>

					{/* Fixed-height slot so dice don't shift when total appears */}
					<View style={styles.totalSlot}>
						{total !== null && (
							<ThemedText style={[styles.total, { color: theme.textSecondary }]}>
								Total: <ThemedText style={[styles.total, { color: theme.text }]}>{total}</ThemedText>
							</ThemedText>
						)}
					</View>
				</View>

				{/* Roll */}
				<HapticButton
					style={[styles.rollBtn, { backgroundColor: rolling ? theme.backgroundSelected : theme.accent }]}
					onPress={roll}
					disabled={rolling}
				>
					<ThemedText type="smallBold" style={{ color: rolling ? theme.textSecondary : theme.accentText, fontSize: 20 }}>
						{rolling ? "Rolling…" : "Roll"}
					</ThemedText>
				</HapticButton>
			</SafeAreaView>
		</ThemedView>
	);
}

const DIE_SIZE = 92;

const styles = StyleSheet.create({
	safe: { flex: 1, padding: Spacing.three, gap: Spacing.three },
	countRow: { flexDirection: "row", gap: Spacing.two },
	countBtn: { flex: 1, paddingVertical: Spacing.two, borderRadius: Spacing.two, alignItems: "center" },
	diceArea: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.three },
	diceRows: { gap: Spacing.two, alignItems: "center" },
	diceRow: { flexDirection: "row", gap: Spacing.two, justifyContent: "center" },
	die: { width: DIE_SIZE, height: DIE_SIZE, borderRadius: 18, borderWidth: 2, alignItems: "center", justifyContent: "center" },
	dieFace: { fontSize: 56, lineHeight: 56, textAlign: "center", includeFontPadding: false },
	total: { fontSize: 22, fontWeight: "600" },
	totalSlot: { height: 34, alignItems: "center", justifyContent: "center" },
	rollBtn: { height: 64, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
