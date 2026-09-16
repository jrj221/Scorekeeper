import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Animated as RNAnimated, Dimensions, ScrollView, StyleSheet, View } from "react-native";
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { HapticButton } from "@/components/haptic-button";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { Game, Player } from "@/context/games-context";
import { GameTypeDefinition } from "@/game-types/types";
import { useTheme } from "@/hooks/use-theme";
import { buildTiers } from "@/utils/game";

const SCREEN_W = Dimensions.get("window").width;
const H_PAD = Spacing.three * 2;
const ROUND_LABEL_W = 48;

type Theme = ReturnType<typeof useTheme>;

export interface ScorecardProps {
	game: Game;
	gameType: GameTypeDefinition;
	gameId: string;
	sortedPlayers: Player[];
	totals: Record<string, number>;
	visibleRoundCount: number;
	currentRoundIndex: number;
	finished: boolean;
	theme: Theme;
	tint: string;
	largeText: boolean;
	rowH: number;
	openEditCell: (cell: { roundIndex: number; player: Player }) => void;
	editCell: { roundIndex: number; player: Player } | null;
	editBorderAnim: RNAnimated.Value;
}

/**
 * The main scoring grid: round rows down the left, player columns across the top,
 * with column-reorder drag animation, vertical scroll sync between the round labels
 * and score rows, and per-cell status styling from `gameType.cellStatus`.
 */
export function Scorecard({
	game,
	gameType,
	gameId,
	sortedPlayers,
	totals,
	visibleRoundCount,
	currentRoundIndex,
	finished,
	theme,
	tint: CURRENT_TINT,
	largeText,
	rowH: ROW_H,
	openEditCell,
	editCell,
	editBorderAnim,
}: ScorecardProps) {
	const router = useRouter();
	const secondaryStat = (playerId: string) => gameType.secondaryStat?.(game, playerId) ?? null;
	const hasSecondaryStat = sortedPlayers.some((p) => secondaryStat(p.id));
	// The names row grows a bit taller when there's a secondary-stat subtitle line (e.g. Phase 10's "(Phase X)").
	const NAMES_ROW_H = hasSecondaryStat ? ROW_H + 14 : ROW_H;

	const scorecardHScrollRef = useRef<ScrollView>(null);

	// colW at component level so animation effects can reference it
	const availableW = SCREEN_W - H_PAD - ROUND_LABEL_W;
	const visibleCols = Math.min(sortedPlayers.length, 4);
	const colW = visibleCols > 0 ? Math.floor(availableW / visibleCols) : availableW;

	// Per-player animated translateX values for column reorder animation
	const colXAnim = useRef<{ [id: string]: RNAnimated.Value }>({});
	const getColAnim = (id: string): RNAnimated.Value => {
		if (!colXAnim.current[id]) colXAnim.current[id] = new RNAnimated.Value(0);
		return colXAnim.current[id];
	};

	// Scorecard column reorder animation
	const [displayedScorecardPlayers, setDisplayedScorecardPlayers] = useState<Player[]>(sortedPlayers);
	const prevScorecardOrderRef = useRef(sortedPlayers.map((p) => p.id));
	const pendingScorecardAnim = useRef<{ oldOrder: string[]; newOrder: string[] } | null>(null);

	useEffect(() => {
		sortedPlayers.forEach((p) => getColAnim(p.id)); // ensure values exist
		const newOrder = sortedPlayers.map((p) => p.id);
		if (newOrder.some((id, i) => id !== prevScorecardOrderRef.current[i])) {
			pendingScorecardAnim.current = { oldOrder: prevScorecardOrderRef.current, newOrder };
			prevScorecardOrderRef.current = newOrder;
		}
		setDisplayedScorecardPlayers([...sortedPlayers]);
	}, [sortedPlayers]);

	// After new column order commits: snap each column to its old visual x, then animate to 0
	useLayoutEffect(() => {
		const pending = pendingScorecardAnim.current;
		if (!pending || colW === 0) return;
		pendingScorecardAnim.current = null;
		const { oldOrder, newOrder } = pending;
		newOrder.forEach((id, newIdx) => {
			const oldIdx = oldOrder.indexOf(id);
			if (oldIdx === newIdx) return;
			getColAnim(id).setValue(-(newIdx - oldIdx) * colW); // snap to old visual pos
		});
		RNAnimated.parallel(
			Object.values(colXAnim.current).map((anim) =>
				RNAnimated.timing(anim, { toValue: 0, duration: 350, useNativeDriver: true }),
			),
		).start();
	}, [displayedScorecardPlayers, colW]);

	// Scorecard vertical sync — runs on UI thread, no JS-bridge lag
	const scorecardScrollY = useSharedValue(0);
	const scorecardScrollHandler = useAnimatedScrollHandler((e) => {
		scorecardScrollY.value = e.contentOffset.y;
	});
	const roundLabelAnimStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: -scorecardScrollY.value }],
	}));

	// Rank row reveal: hidden until the first round is complete, then it grows in
	// (height 0 → ROW_H) while its contents slide up into place.
	const firstRoundDone =
		game.players.length > 0 && game.players.every((p) => (game.rounds[0] ?? {})[p.id] !== undefined);
	const rankReveal = useSharedValue(firstRoundDone ? 1 : 0);
	useEffect(() => {
		rankReveal.value = withTiming(firstRoundDone ? 1 : 0, { duration: 320 });
	}, [firstRoundDone, rankReveal]);
	const rankRowRevealStyle = useAnimatedStyle(() => ({
		height: rankReveal.value * ROW_H,
		opacity: rankReveal.value,
	}));
	const rankRowSlideStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: (1 - rankReveal.value) * ROW_H }],
	}));
	// Left corner block spans the rank row + names row; it shrinks to just the
	// names row while the rank row is hidden so the grid stays aligned.
	const rankCornerStyle = useAnimatedStyle(() => ({
		height: NAMES_ROW_H + rankReveal.value * ROW_H,
	}));

	const getScore = (roundIndex: number, playerId: string): number | null => {
		const r = game.rounds[roundIndex];
		if (!r) return null;
		const v = r[playerId];
		return v !== undefined ? v : null;
	};

	const rounds = Array.from({ length: visibleRoundCount }, (_, i) => i);

	const firstRoundComplete =
		game.players.length > 0 && game.players.every((p) => (game.rounds[0] ?? {})[p.id] !== undefined);

	const rowBg = (i: number) => (i % 2 === 0 ? theme.background : theme.backgroundElement + "55");

	// Fewer rows fit on screen with larger text, so cap the visible window
	// lower — the round list scrolls internally and the Next Round / End
	// Game buttons below it stay reachable instead of being pushed off.
	// Next Round is now always rendered (not just once scored), so the
	// window is capped a bit lower to leave room for both buttons.
	const MAX_VISIBLE_ROWS = largeText ? 4 : 8;
	const CURRENT_ROW_BG = CURRENT_TINT + "40";
	const MEDAL_COLORS = ["#FFD700", "#888888", "#CD7F32"];
	// Fixed dark pill so the gold/silver/bronze numbers (and white for the
	// rest) stay high-contrast in every color scheme, light or dark.
	const RANK_PILL_BG = "#1C1C22";
	const RANK_LABELS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
	const tiers = buildTiers(sortedPlayers, totals, game);
	const rankMap = new Map(tiers.flatMap((tier, ti) => tier.map((p) => [p.id, ti])));
	const rankLbl = (tier: number) => (firstRoundComplete ? (RANK_LABELS[tier] ?? `${tier + 1}th`) : "");
	const rankColor = (tier: number) => (tier < 3 ? MEDAL_COLORS[tier] : theme.accentText);

	return (
		<View style={{ flexDirection: "row", alignItems: "flex-start" }}>
			{/* Fixed left: round number column */}
			<View style={{ width: ROUND_LABEL_W }}>
				<Animated.View
					style={[styles.labelCell, rankCornerStyle, { backgroundColor: theme.backgroundSelected }]}
				/>
				<View style={{ maxHeight: MAX_VISIBLE_ROWS * ROW_H, overflow: "hidden" }}>
					<Animated.View style={roundLabelAnimStyle}>
						{rounds.map((ri) => {
							const isCurrent = ri === currentRoundIndex && !finished;
							return (
								<View
									key={ri}
									style={[
										styles.labelCell,
										{ height: ROW_H, backgroundColor: rowBg(ri) },
										isCurrent && { backgroundColor: CURRENT_ROW_BG },
									]}
								>
									<ThemedText style={[styles.labelText, isCurrent && { color: CURRENT_TINT }]}>
										{ri + 1}
									</ThemedText>
								</View>
							);
						})}
					</Animated.View>
				</View>
				<View
					style={[
						styles.labelCell,
						{ height: ROW_H, backgroundColor: theme.backgroundSelected },
						finished && { backgroundColor: CURRENT_TINT + "28" },
					]}
				>
					<ThemedText style={[styles.labelText, { fontWeight: "700" }, finished && { color: CURRENT_TINT }]}>
						Total
					</ThemedText>
				</View>
			</View>

			{/* Horizontally scrollable player columns */}
			<ScrollView
				ref={scorecardHScrollRef}
				horizontal
				scrollEnabled={sortedPlayers.length > 4}
				directionalLockEnabled
				showsHorizontalScrollIndicator={false}
				style={{ flex: 1 }}
			>
				<View style={{ alignItems: "flex-start" }}>
					{/* Rank row — hidden until the first round completes, then slides up into place */}
					<Animated.View
						style={[rankRowRevealStyle, { overflow: "hidden", backgroundColor: theme.backgroundSelected }]}
					>
						<Animated.View style={[styles.headerRow, rankRowSlideStyle]}>
							{displayedScorecardPlayers.map((p) => {
								const tier = rankMap.get(p.id) ?? 99;
								const lbl = rankLbl(tier);
								return (
									<RNAnimated.View
										key={p.id}
										style={[
											styles.nameCell,
											{ width: colW, height: ROW_H },
											{ transform: [{ translateX: getColAnim(p.id) }] },
										]}
									>
										{lbl ? (
											<View style={[styles.rankPill, { backgroundColor: RANK_PILL_BG }]}>
												<ThemedText style={[styles.rankLabel, { color: rankColor(tier) }]}>
													{lbl}
												</ThemedText>
											</View>
										) : null}
									</RNAnimated.View>
								);
							})}
						</Animated.View>
					</Animated.View>

					{/* Player names row */}
					<View style={[styles.headerRow, { backgroundColor: theme.backgroundSelected }]}>
						{displayedScorecardPlayers.map((p) => (
							<RNAnimated.View
								key={p.id}
								style={[
									styles.nameCell,
									{ width: colW, height: NAMES_ROW_H },
									{ transform: [{ translateX: getColAnim(p.id) }] },
								]}
							>
								{finished ? (
									<HapticButton onPress={() => router.push(`/player/${p.id}`)} style={{ alignItems: "center" }}>
										<ThemedText style={styles.colHeader} numberOfLines={1}>
											{p.name}
										</ThemedText>
										{secondaryStat(p.id) && (
											<ThemedText style={styles.colSubHeader} themeColor="textSecondary" numberOfLines={1}>
												({secondaryStat(p.id)!.short})
											</ThemedText>
										)}
									</HapticButton>
								) : (
									<View style={{ alignItems: "center" }}>
										<ThemedText style={styles.colHeader} numberOfLines={1}>
											{p.name}
										</ThemedText>
										{secondaryStat(p.id) && (
											<ThemedText style={styles.colSubHeader} themeColor="textSecondary" numberOfLines={1}>
												({secondaryStat(p.id)!.short})
											</ThemedText>
										)}
									</View>
								)}
							</RNAnimated.View>
						))}
					</View>

					{/* Score rows */}
					<Animated.ScrollView
						onScroll={scorecardScrollHandler}
						scrollEventThrottle={1}
						showsVerticalScrollIndicator={false}
						style={{ maxHeight: MAX_VISIBLE_ROWS * ROW_H }}
						scrollEnabled={rounds.length > MAX_VISIBLE_ROWS}
						directionalLockEnabled
						nestedScrollEnabled
					>
						{rounds.map((ri) => {
							const isCurrent = ri === currentRoundIndex && !finished;
							return (
								<View
									key={ri}
									style={[
										styles.scoreRow,
										{ backgroundColor: rowBg(ri) },
										isCurrent && { backgroundColor: CURRENT_ROW_BG },
									]}
								>
									{displayedScorecardPlayers.map((p) => {
										const s = getScore(ri, p.id);
										const tappable = !finished && ri <= currentRoundIndex;
										const Cell = tappable ? HapticButton : View;
										const status = gameType.cellStatus?.(game, ri, p.id, theme, s !== null);
										return (
											<RNAnimated.View
												key={p.id}
												style={{ transform: [{ translateX: getColAnim(p.id) }] }}
											>
												<Cell
													style={[styles.scoreCell, { width: colW, height: ROW_H }]}
													{...(tappable
														? { onPress: () => openEditCell({ roundIndex: ri, player: p }) }
														: {})}
												>
													{status && (
														<FontAwesome5
															name="bookmark"
															size={10}
															color={status.color}
															style={styles.statusBookmark}
														/>
													)}
													<ThemedText
														style={s === null ? styles.emptyScore : styles.score}
														themeColor={s === null ? "textSecondary" : "text"}
													>
														{s !== null ? s : "–"}
													</ThemedText>
													{editCell?.player.id === p.id && editCell?.roundIndex === ri && (
														<RNAnimated.View
															style={[
																StyleSheet.absoluteFill,
																{
																	borderWidth: 2,
																	borderColor: CURRENT_TINT,
																	borderRadius: 4,
																	opacity: editBorderAnim,
																},
															]}
															pointerEvents="none"
														/>
													)}
												</Cell>
											</RNAnimated.View>
										);
									})}
								</View>
							);
						})}
					</Animated.ScrollView>

					{/* Total row */}
					<View
						style={[
							styles.scoreRow,
							{ backgroundColor: theme.backgroundSelected },
							finished && { backgroundColor: CURRENT_TINT + "10" },
						]}
					>
						{displayedScorecardPlayers.map((p) => (
							<RNAnimated.View key={p.id} style={{ transform: [{ translateX: getColAnim(p.id) }] }}>
								<View style={[styles.scoreCell, { width: colW, height: ROW_H }]}>
									<ThemedText style={[styles.totalScore, finished && { color: CURRENT_TINT }]}>
										{totals[p.id] ?? 0}
									</ThemedText>
								</View>
							</RNAnimated.View>
						))}
					</View>
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	labelCell: {
		alignItems: "center",
		justifyContent: "center",
	},
	labelText: {
		fontSize: 12,
		fontWeight: "600",
		textAlign: "center",
	},
	headerRow: {
		flexDirection: "row",
	},
	nameCell: {
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 4,
	},
	colHeader: {
		fontSize: 12,
		fontWeight: "600",
		textAlign: "center",
	},
	colSubHeader: {
		fontSize: 10,
		textAlign: "center",
		marginTop: 1,
	},
	scoreRow: {
		flexDirection: "row",
	},
	scoreCell: {
		alignItems: "center",
		justifyContent: "center",
		position: "relative",
	},
	statusBookmark: {
		position: "absolute",
		top: 3,
	},
	score: {
		fontSize: 13,
		fontWeight: "500",
		textAlign: "center",
	},
	emptyScore: {
		fontSize: 13,
		textAlign: "center",
		opacity: 0.3,
	},
	totalScore: {
		fontSize: 13,
		fontWeight: "700",
		textAlign: "center",
	},
	rankLabel: {
		fontSize: 12,
		fontWeight: "700",
		textAlign: "center",
		letterSpacing: 0.3,
	},
	rankPill: {
		minWidth: 34,
		width: 50,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
	},
});
