import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useGame } from "@/hooks/use-game";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_H = 260;
// Heights for 1st, 2nd, 3rd place platforms
const PLATFORM_H = [150, 108, 76];
// Column order on podium: left=2nd, centre=1st, right=3rd
const COL_RANK = [1, 0, 2];
// Stagger: 3rd rises first, then 2nd, then 1st
const RISE_DELAYS = [1000, 3000, 5000];

export default function ResultsScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { game, totals, sortedPlayers } = useGame(id);
	const theme = useTheme();

	const platforms = [
		useRef(new Animated.Value(0)).current,
		useRef(new Animated.Value(0)).current,
		useRef(new Animated.Value(0)).current,
	];
	const nameOpacity = [
		useRef(new Animated.Value(0)).current,
		useRef(new Animated.Value(0)).current,
		useRef(new Animated.Value(0)).current,
	];
	const restOpacity = useRef(new Animated.Value(0)).current;
	const restTranslateY = useRef(new Animated.Value(20)).current;

	useEffect(() => {
		// Animate in order: rank-index 2 (3rd), 1 (2nd), 0 (1st), skipping missing players
		const ranksToAnimate = [2, 1, 0].filter((rankIdx) => sortedPlayers[rankIdx] != null);
		ranksToAnimate.forEach((rankIdx, i) => {
			const delay = RISE_DELAYS[i];
			setTimeout(() => {
				Animated.spring(platforms[rankIdx], {
					toValue: PLATFORM_H[rankIdx],
					useNativeDriver: false,
					damping: 12,
					stiffness: 100,
					mass: 0.8,
				}).start();
				// Name fades in after platform is ~80% risen
				const riseDuration = (PLATFORM_H[rankIdx] / 150) * 500;
				setTimeout(() => {
					Animated.timing(nameOpacity[rankIdx], {
						toValue: 1,
						duration: 300,
						useNativeDriver: true,
					}).start(() => {
						// After 1st place name fades in, reveal the rest list
						if (rankIdx === 0) {
							Animated.parallel([
								Animated.timing(restOpacity, {
									toValue: 1,
									duration: 400,
									useNativeDriver: true,
								}),
								Animated.spring(restTranslateY, {
									toValue: 0,
									useNativeDriver: true,
									damping: 14,
									stiffness: 120,
								}),
							]).start();
						}
					});
				}, riseDuration * 0.8);
			}, delay);
		});
	}, []);

	if (!game) return null;

	const podiumPlayers = COL_RANK.map((rankIdx) => sortedPlayers[rankIdx] ?? null);
	const restPlayers = sortedPlayers.slice(3);

	const accentColors = [theme.accent, theme.backgroundSelected, theme.backgroundSelected];

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "Final Scores", headerBackTitle: "Home" }} />
			<SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
				<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
					{/* Podium */}
					<View style={[styles.podiumWrapper, { backgroundColor: theme.backgroundElement }]}>
						<View style={styles.podiumRow}>
							{podiumPlayers.map((player, colIdx) => {
								const rankIdx = COL_RANK[colIdx];
								if (!player) return <View key={colIdx} style={styles.podiumCol} />;
								return (
									<View key={player.id} style={styles.podiumCol}>
										{/* Player info — positioned just above where platform will end */}
										<Animated.View
											style={[
												styles.playerInfo,
												{
													bottom: PLATFORM_H[rankIdx] + Spacing.two,
													opacity: nameOpacity[rankIdx],
												},
											]}
										>
											<ThemedText style={styles.medal}>{MEDALS[rankIdx]}</ThemedText>
											<ThemedText style={styles.playerName} numberOfLines={2}>
												{player.name}
											</ThemedText>
											<ThemedText style={[styles.playerScore, { color: theme.accent }]}>
												{totals[player.id] ?? 0}
											</ThemedText>
										</Animated.View>

										{/* Platform block — grows from bottom */}
										<Animated.View
											style={[
												styles.platform,
												{
													height: platforms[rankIdx],
													backgroundColor: accentColors[rankIdx],
												},
											]}
										>
											{/* Rank number on platform */}
											<ThemedText
												style={[
													styles.rankNum,
													{ color: rankIdx === 0 ? theme.accentText : theme.textSecondary },
												]}
											>
												{["1st", "2nd", "3rd"][rankIdx]}
											</ThemedText>
										</Animated.View>
									</View>
								);
							})}
						</View>
					</View>

					{/* Players ranked 4th and below — hidden until podium is fully revealed */}
					{restPlayers.length > 0 && (
						<Animated.View
							style={[
								styles.restList,
								{ backgroundColor: theme.backgroundElement },
								{ opacity: restOpacity, transform: [{ translateY: restTranslateY }] },
							]}
						>
							{restPlayers.map((player, i) => (
								<View
									key={player.id}
									style={[styles.restRow, { borderBottomColor: theme.backgroundSelected }]}
								>
									<ThemedText style={[styles.restRank, { color: theme.textSecondary }]}>
										#{i + 4}
									</ThemedText>
									<ThemedText style={styles.restName} numberOfLines={1}>
										{player.name}
									</ThemedText>
									<ThemedText style={[styles.restScore, { color: theme.text }]}>
										{totals[player.id] ?? 0}
									</ThemedText>
								</View>
							))}
						</Animated.View>
					)}
				</ScrollView>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
	podiumWrapper: { borderRadius: Spacing.two, overflow: "hidden" },
	podiumRow: {
		flexDirection: "row",
		height: PODIUM_H,
		alignItems: "flex-end",
	},
	podiumCol: {
		flex: 1,
		height: PODIUM_H,
		position: "relative",
		alignItems: "center",
	},
	playerInfo: {
		position: "absolute",
		left: 4,
		right: 4,
		alignItems: "center",
		gap: 2,
	},
	medal: { fontSize: 28, lineHeight: 34 },
	playerName: { fontSize: 13, fontWeight: "600", textAlign: "center" },
	playerScore: { fontSize: 20, fontWeight: "700" },
	platform: {
		position: "absolute",
		bottom: 0,
		left: 2,
		right: 2,
		borderTopLeftRadius: 6,
		borderTopRightRadius: 6,
		alignItems: "center",
		justifyContent: "flex-start",
		paddingTop: Spacing.one,
	},
	rankNum: { fontSize: 22, fontWeight: "700", opacity: 0.4 },
	restList: {
		borderRadius: Spacing.two,
		overflow: "hidden",
	},
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
