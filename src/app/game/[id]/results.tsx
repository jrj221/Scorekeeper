import { FontAwesome5 } from "@expo/vector-icons";
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
import { buildTiers } from "@/utils/game";

const PODIUM_H = 260;
const PLATFORM_H = [150, 108, 76];
// Column order: left=2nd(idx1), centre=1st(idx0), right=3rd(idx2)
const COL_RANK = [1, 0, 2];
const RISE_DELAYS = [500, 1000, 1500];

const RANK_ICONS = [
	{ name: "trophy", color: "#FFD700" },
	{ name: "medal", color: "#888888" },
	{ name: "medal", color: "#CD7F32" },
] as const;


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

	const tiers = buildTiers(sortedPlayers, totals);

	useEffect(() => {
		const ranksToAnimate = [2, 1, 0].filter((rankIdx) => (tiers[rankIdx]?.length ?? 0) > 0);
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
				const riseDuration = (PLATFORM_H[rankIdx] / 150) * 500;
				setTimeout(() => {
					Animated.timing(nameOpacity[rankIdx], {
						toValue: 1,
						duration: 300,
						useNativeDriver: true,
					}).start(() => {
						if (rankIdx === 0) {
							Animated.parallel([
								Animated.timing(restOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
								Animated.spring(restTranslateY, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 120 }),
							]).start();
						}
					});
				}, riseDuration * 0.8);
			}, delay);
		});
	}, []);

	if (!game) return null;

	const restTiers = tiers.slice(3);
	const accentColors = [theme.accent, theme.backgroundSelected, theme.backgroundSelected];

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "Final Scores", headerBackTitle: "Home" }} />
			<SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
				<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
					{/* Podium */}
					<View style={[styles.podiumWrapper, { backgroundColor: theme.backgroundElement }]}>
						<View style={styles.podiumRow}>
							{COL_RANK.map((rankIdx, colIdx) => {
								const tierPlayers = tiers[rankIdx] ?? [];
								const tierScore = tierPlayers[0] ? (totals[tierPlayers[0].id] ?? 0) : 0;
								return (
									<View key={colIdx} style={styles.podiumCol}>
										{tierPlayers.length > 0 && (
											<Animated.View
												style={[
													styles.playerInfo,
													{
														bottom: PLATFORM_H[rankIdx] + Spacing.two,
														opacity: nameOpacity[rankIdx],
													},
												]}
											>
												<View
													style={[
														styles.rankIcon,
														{
															borderColor: theme.accent + "55",
															shadowColor: theme.accent,
															backgroundColor: theme.accent + "18",
														},
													]}
												>
													<FontAwesome5
														name={RANK_ICONS[rankIdx].name as any}
														size={18}
														color={RANK_ICONS[rankIdx].color}
													/>
												</View>
												<View style={styles.names}>
													{tierPlayers.map((p) => (
														<ThemedText key={p.id} style={styles.playerName} numberOfLines={1}>
															{p.name}
														</ThemedText>
													))}
												</View>
												<ThemedText style={[styles.playerScore, { color: theme.accent }]}>
													{tierScore}
												</ThemedText>
											</Animated.View>
										)}
										<Animated.View
											style={[
												styles.platform,
												{
													height: platforms[rankIdx],
													backgroundColor: accentColors[rankIdx],
												},
											]}
										>
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

					{/* 4th place and below — dense ranked, fade in after podium */}
					{restTiers.length > 0 && (
						<Animated.View
							style={[
								styles.restList,
								{ backgroundColor: theme.backgroundElement },
								{ opacity: restOpacity, transform: [{ translateY: restTranslateY }] },
							]}
						>
							{restTiers.map((tierPlayers, tierIdx) =>
								tierPlayers.map((player) => (
									<View
										key={player.id}
										style={[styles.restRow, { borderBottomColor: theme.backgroundSelected }]}
									>
										<ThemedText style={[styles.restRank, { color: theme.textSecondary }]}>
											#{tierIdx + 4}
										</ThemedText>
										<ThemedText style={styles.restName} numberOfLines={1}>
											{player.name}
										</ThemedText>
										<ThemedText style={[styles.restScore, { color: theme.text }]}>
											{totals[player.id] ?? 0}
										</ThemedText>
									</View>
								))
							)}
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
	podiumRow: { flexDirection: "row", height: PODIUM_H, alignItems: "flex-end" },
	podiumCol: { flex: 1, height: PODIUM_H, position: "relative", alignItems: "center" },
	playerInfo: { position: "absolute", left: 4, right: 4, alignItems: "center", gap: 2 },
	playerName: { fontSize: 12, fontWeight: "600", textAlign: "center" },
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
	rankIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		borderWidth: 1.5,
		alignItems: "center",
		justifyContent: "center",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.5,
		shadowRadius: 4,
		elevation: 4,
	},
	names: { gap: 0, alignItems: "center" },
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
