import { FontAwesome5 } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { Player } from "@/context/games-context";
import { LARGE_TEXT_SCALE } from "@/context/text-scale-context";
import { useTheme } from "@/hooks/use-theme";

export const PODIUM_H = 260;
export const PLATFORM_H = [150, 130, 110];
// Column order: left=2nd(idx1), centre=1st(idx0), right=3rd(idx2)
export const COL_RANK = [1, 0, 2];
export const RISE_DELAYS = [500, 1000, 1500];
// Max tied names shown inside each platform before the list becomes scrollable
export const TIE_NAME_LIMIT = [4, 3, 2];
export const TIE_LINE_H = 22;

export const RANK_ICONS = [
	{ name: "trophy", color: "#FFD700" },
	{ name: "medal", color: "#888888" },
	{ name: "medal", color: "#CD7F32" },
] as const;

export type SecondaryStat = (playerId: string) => { short: string; long: string } | null;

type Theme = ReturnType<typeof useTheme>;

function TieList({
	players,
	maxVisible,
	rowHeight,
	textColor,
}: {
	players: Player[];
	maxVisible: number;
	rowHeight: number;
	textColor: string;
}) {
	// Fixed-height rows so exactly `maxVisible` names fit regardless of font metrics.
	const viewportH = maxVisible * rowHeight;
	const [showMore, setShowMore] = useState(false);
	const listH = useRef(0);
	const contentH = useRef(0);

	const check = (offsetY = 0) => {
		setShowMore(contentH.current > listH.current + offsetY + 2);
	};

	return (
		<View>
			<ScrollView
				style={{ maxHeight: viewportH }}
				onLayout={(e) => {
					listH.current = e.nativeEvent.layout.height;
					check();
				}}
				onContentSizeChange={(_, h) => {
					contentH.current = h;
					check();
				}}
				onScroll={(e) => check(e.nativeEvent.contentOffset.y)}
				scrollEventThrottle={16}
				showsVerticalScrollIndicator={false}
				nestedScrollEnabled
			>
				{players.map((p) => (
					<View key={p.id} style={[styles.tieRow, { height: rowHeight }]}>
						<ThemedText style={[styles.tieName, { color: textColor }]} numberOfLines={1}>
							{p.name}
						</ThemedText>
					</View>
				))}
			</ScrollView>
			{showMore && <ThemedText style={[styles.tieMore, { color: textColor }]}>•••</ThemedText>}
		</View>
	);
}

export interface PodiumProps {
	/** Pre-computed tiers from `buildTiers` — tier 0 is 1st place, etc. */
	tiers: Player[][];
	totals: Record<string, number>;
	theme: Theme;
	largeText: boolean;
	/** When true, reproduces the rise-in animation from the results screen. Static otherwise. */
	animated: boolean;
	/** Forward-compatible hook for a per-player secondary stat line (e.g. Phase 10's "Phase X"). */
	secondaryStat?: SecondaryStat;
	/** Animated mode only: fired once the 1st-place name has faded in, so callers can cue the rest-list reveal. */
	onTopRevealed?: () => void;
}

export function Podium({ tiers, totals, theme, largeText, animated, secondaryStat, onTopRevealed }: PodiumProps) {
	const sizeScale = largeText ? LARGE_TEXT_SCALE : 1;
	const hasSecondary = tiers.slice(0, 3).some((t) => t.some((p) => secondaryStat?.(p.id)));
	const podiumH = PODIUM_H * sizeScale + (hasSecondary ? 24 : 0);
	const platformH = PLATFORM_H.map((h) => h * sizeScale);
	const tieLineH = TIE_LINE_H * sizeScale;

	const platforms = [
		useRef(new Animated.Value(animated ? 0 : platformH[0])).current,
		useRef(new Animated.Value(animated ? 0 : platformH[1])).current,
		useRef(new Animated.Value(animated ? 0 : platformH[2])).current,
	];
	const nameOpacity = [
		useRef(new Animated.Value(animated ? 0 : 1)).current,
		useRef(new Animated.Value(animated ? 0 : 1)).current,
		useRef(new Animated.Value(animated ? 0 : 1)).current,
	];

	useEffect(() => {
		if (!animated) {
			platforms.forEach((v, i) => v.setValue(platformH[i]));
			nameOpacity.forEach((v) => v.setValue(1));
			return;
		}
		const ranksToAnimate = [2, 1, 0].filter((rankIdx) => (tiers[rankIdx]?.length ?? 0) > 0);
		ranksToAnimate.forEach((rankIdx, i) => {
			const delay = RISE_DELAYS[i];
			setTimeout(() => {
				Animated.spring(platforms[rankIdx], {
					toValue: platformH[rankIdx],
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
						if (rankIdx === 0) onTopRevealed?.();
					});
				}, riseDuration * 0.8);
			}, delay);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [animated, sizeScale]);

	const accentColors = [theme.accent, theme.backgroundSelected, theme.backgroundSelected];

	return (
		<View style={[styles.podiumWrapper, { backgroundColor: theme.backgroundElement }]}>
			<View style={[styles.podiumRow, { height: podiumH }]}>
				{COL_RANK.map((rankIdx, colIdx) => {
					const tierPlayers = tiers[rankIdx] ?? [];
					const tierScore = tierPlayers[0] ? (totals[tierPlayers[0].id] ?? 0) : 0;
					const stat = tierPlayers[0] ? secondaryStat?.(tierPlayers[0].id) : null;
					return (
						<View key={colIdx} style={[styles.podiumCol, { height: podiumH }]}>
							{tierPlayers.length > 0 && (
								<Animated.View
									style={[
										styles.playerInfo,
										{
											bottom: platformH[rankIdx] + Spacing.two,
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
										{tierPlayers.length > 1 ? (
											<ThemedText style={styles.playerName} numberOfLines={1}>
												{tierPlayers.length}-way tie
											</ThemedText>
										) : (
											<ThemedText style={styles.playerName} numberOfLines={1}>
												{tierPlayers[0].name}
											</ThemedText>
										)}
									</View>
									<ThemedText style={[styles.playerScore, { color: theme.accent }]}>
										{tierScore}
									</ThemedText>
									{stat && (
										<ThemedText type="small" themeColor="textSecondary">
											{stat.short}
										</ThemedText>
									)}
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
								{tierPlayers.length > 1 && (
									<TieList
										players={tierPlayers}
										maxVisible={TIE_NAME_LIMIT[rankIdx]}
										rowHeight={tieLineH}
										textColor={rankIdx === 0 ? theme.accentText : theme.text}
									/>
								)}
							</Animated.View>
						</View>
					);
				})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
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
	// Fixed-height row so exactly N names fit the scroll viewport regardless of font metrics.
	tieRow: { justifyContent: "center", overflow: "hidden" },
	tieName: { fontSize: 12, fontWeight: "600", textAlign: "center", includeFontPadding: false },
	// Slim "more" hint below the list — must not occupy a full name row.
	tieMore: { fontSize: 9, lineHeight: 10, height: 10, textAlign: "center", opacity: 0.5, includeFontPadding: false },
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
});
