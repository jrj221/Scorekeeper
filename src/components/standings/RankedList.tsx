import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { Player } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";

import { SecondaryStat } from "./Podium";

type Theme = ReturnType<typeof useTheme>;

export interface RankedListProps {
	/** Tiers for 4th place and below (already sliced from the full `buildTiers` output). */
	tiers: Player[][];
	totals: Record<string, number>;
	theme: Theme;
	secondaryStat?: SecondaryStat;
	/** When true, reproduces the results-screen fade+translate-in once `revealed` becomes true. */
	animated?: boolean;
	/** Animated mode only: flips true once the podium has finished its rise, triggering the reveal. */
	revealed?: boolean;
}

export function RankedList({ tiers, totals, theme, secondaryStat, animated = false, revealed = true }: RankedListProps) {
	const opacity = useRef(new Animated.Value(animated && !revealed ? 0 : 1)).current;
	const translateY = useRef(new Animated.Value(animated && !revealed ? 20 : 0)).current;

	useEffect(() => {
		if (!animated) {
			opacity.setValue(1);
			translateY.setValue(0);
			return;
		}
		if (revealed) {
			Animated.parallel([
				Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
				Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 120 }),
			]).start();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [animated, revealed]);

	if (tiers.length === 0) return null;

	return (
		<Animated.View
			style={[
				styles.restList,
				{ backgroundColor: theme.backgroundElement },
				{ opacity, transform: [{ translateY }] },
			]}
		>
			{tiers.map((tierPlayers, tierIdx) =>
				tierPlayers.map((player) => {
					const stat = secondaryStat?.(player.id);
					return (
						<View key={player.id} style={[styles.restRow, { borderBottomColor: theme.backgroundSelected }]}>
							<ThemedText style={[styles.restRank, { color: theme.textSecondary }]}>
								#{tierIdx + 4}
							</ThemedText>
							<ThemedText style={styles.restName} numberOfLines={1}>
								{player.name}
							</ThemedText>
							{stat && (
								<ThemedText type="small" themeColor="textSecondary">
									{stat.short}
								</ThemedText>
							)}
							<ThemedText style={[styles.restScore, { color: theme.text }]}>
								{totals[player.id] ?? 0}
							</ThemedText>
						</View>
					);
				}),
			)}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	restList: { borderRadius: Spacing.two, overflow: "hidden" },
	restRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two + 2,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: Spacing.two,
	},
	restRank: { fontSize: 13, fontWeight: "600", width: 32 },
	restName: { flex: 1, fontSize: 16 },
	restScore: { fontSize: 18, fontWeight: "600" },
});
