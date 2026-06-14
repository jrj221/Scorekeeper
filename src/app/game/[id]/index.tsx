import { FontAwesome5 } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
	Alert,
	Dimensions,
	Platform,
	Animated as RNAnimated,
	ScrollView,
	StyleSheet,
	UIManager,
	View,
} from "react-native";
import Animated, {
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

if (Platform.OS === "android") {
	UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

import { CellEditModal } from "@/components/cell-edit-modal";
import { HapticButton } from "@/components/haptic-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { Player } from "@/context/games-context";
import { useTextScale } from "@/context/text-scale-context";
import { useGame } from "@/hooks/use-game";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";
import { buildTiers, getTurnState } from "@/utils/game";

const SCREEN_W = Dimensions.get("window").width;
const H_PAD = Spacing.three * 2;
const ROUND_LABEL_W = 48;
const BASE_ROW_H = 44;
const ROTATION_MS = 400;

const MEDALS = ["🥇", "🥈", "🥉"];

// Podium constants (used in static results view for finished games)
const PODIUM_H = 260;
const PLATFORM_H = [150, 130, 110];
const COL_RANK = [1, 0, 2];
const RANK_ICONS = [
	{ name: "trophy", color: "#FFD700" },
	{ name: "medal", color: "#888888" },
	{ name: "medal", color: "#CD7F32" },
] as const;

// Max tied names shown inside each platform before the list becomes scrollable
const TIE_NAME_LIMIT = [4, 3, 2];
const TIE_ROW_H = 22;

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
					<View key={p.id} style={[podiumStyles.tieRow, { height: rowHeight }]}>
						<ThemedText style={[podiumStyles.tiePlayerName, { color: textColor }]} numberOfLines={1}>
							{p.name}
						</ThemedText>
					</View>
				))}
			</ScrollView>
			{showMore && (
				<ThemedText style={[podiumStyles.tieMore, { color: textColor }]}>•••</ThemedText>
			)}
		</View>
	);
}

export default function GameScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const theme = useTheme();
	const CURRENT_TINT = theme.accent;
	// In large-text mode, grow row heights to match the bigger text so scores/names
	// aren't clipped. Reverts to the base height otherwise.
	const textScale = useTextScale();
	const largeText = textScale !== 1;
	const ROW_H = largeText ? Math.round(BASE_ROW_H * textScale) : BASE_ROW_H;
	const { game, endGame, updateScore, advanceRound, totals, sortedPlayers, visibleRoundCount, currentRoundIndex } =
		useGame(id);

	const [editCell, setEditCell] = useState<{ roundIndex: number; player: Player } | null>(null);
	const finished = !!game?.finishedAt;
	const [viewMode, setViewMode] = useState<"scores" | "turns" | "results">(game?.finishedAt ? "scores" : "turns");
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
	}, [displayedScorecardPlayers]);

	// Cell border fade
	const editBorderAnim = useRef(new RNAnimated.Value(0)).current;
	const [displayedEditCell, setDisplayedEditCell] = useState<{ roundIndex: number; player: Player } | null>(null);
	const openEditCell = (cell: { roundIndex: number; player: Player }) => {
		setDisplayedEditCell(cell);
		setEditCell(cell);
		RNAnimated.timing(editBorderAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
	};
	const clearEditCell = () => {
		setEditCell(null);
		RNAnimated.timing(editBorderAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
			setDisplayedEditCell(null);
		});
	};

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
		!!game && game.players.length > 0 && game.players.every((p) => (game.rounds[0] ?? {})[p.id] !== undefined);
	const rankReveal = useSharedValue(firstRoundDone ? 1 : 0);
	useEffect(() => {
		rankReveal.value = withTiming(firstRoundDone ? 1 : 0, { duration: 320 });
	}, [firstRoundDone]);
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
		height: ROW_H + rankReveal.value * ROW_H,
	}));

	// Turn order rotation animation.
	// Ghost = the OLD first player appended below the list.
	// We animate slideY: 0 → -ROW_H (slide up).
	// At animation end: visible rows are [new[0], new[1], ..., new[n-2], ghost]
	// which maps exactly to new order at slideY=0 → snap is invisible.
	const [displayedOrder, setDisplayedOrder] = useState<string[]>(() =>
		game ? getTurnState(game, 0).orderedIds : [],
	);
	const displayedOrderRef = useRef(displayedOrder);
	// ghostIds: the players entering from the top (K of them for a K-slot scroll)
	const [ghostIds, setGhostIds] = useState<string[]>([]);
	const slideY = useSharedValue(0);
	const prevRoundRef = useRef(currentRoundIndex);
	const pendingOrderRef = useRef<string[]>([]);
	const isAnimatingRef = useRef(false);

	useEffect(() => {
		displayedOrderRef.current = displayedOrder;
	}, [displayedOrder]);

	const turnListAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: slideY.value }],
	}));

	// Detect round change → compute how many slots to scroll (K), set K ghost rows
	useEffect(() => {
		if (!game) return;
		const newOrder = getTurnState(game, currentRoundIndex).orderedIds;
		if (prevRoundRef.current === currentRoundIndex) {
			if (!isAnimatingRef.current) setDisplayedOrder(newOrder);
			return;
		}
		prevRoundRef.current = currentRoundIndex;
		const old = displayedOrderRef.current;
		// Order unchanged (e.g. goes-first off) → no rotation animation
		if (old.length === newOrder.length && old.every((v, i) => v === newOrder[i])) {
			setDisplayedOrder(newOrder);
			return;
		}
		pendingOrderRef.current = newOrder;
		const j = old.indexOf(newOrder[0]);
		// K = right-rotation distance: how far newOrder[0] is from the bottom
		const K = j <= 0 ? 1 : old.length - j;
		setGhostIds(newOrder.slice(0, K));
	}, [currentRoundIndex, game]);

	// After K ghost rows render above the list, slide everything down by K slots
	useEffect(() => {
		if (ghostIds.length === 0) return;
		isAnimatingRef.current = true;
		slideY.value = withTiming(ghostIds.length * ROW_H, { duration: ROTATION_MS });
		const t = setTimeout(() => {
			isAnimatingRef.current = false;
			setDisplayedOrder(pendingOrderRef.current);
			setGhostIds([]);
		}, ROTATION_MS);
		return () => clearTimeout(t);
	}, [ghostIds]);

	// Snap slideY to 0 after new order commits — seamless because the K ghost positions
	// at animation end exactly match the new order at translateY=0.
	useLayoutEffect(() => {
		if (ghostIds.length === 0) slideY.value = 0;
	}, [ghostIds]);

	const isFinalRound = game?.totalRounds !== undefined && currentRoundIndex >= game.totalRounds - 1;

	const handleShowFinalScores = () => {
		endGame();
		router.replace(`/game/${id}/results`);
	};

	const confirmEndGame = () =>
		Alert.alert("End Game", "Finish this game? Scores will be frozen and cannot be edited.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "End Game",
				style: "destructive",
				onPress: () => {
					endGame();
					router.replace(`/game/${id}/results`);
				},
			},
		]);

	if (!game) {
		return (
			<ThemedView style={shared.screen}>
				<SafeAreaView style={shared.safeArea}>
					<ThemedText type="default">Game not found.</ThemedText>
				</SafeAreaView>
			</ThemedView>
		);
	}

	const getScore = (roundIndex: number, playerId: string): number | null => {
		const r = game.rounds[roundIndex];
		if (!r) return null;
		const v = r[playerId];
		return v !== undefined ? v : null;
	};

	// Build round rows (all visible rounds in order)
	const rounds = Array.from({ length: visibleRoundCount }, (_, i) => i);

	const firstRoundComplete =
		game.players.length > 0 && game.players.every((p) => (game.rounds[0] ?? {})[p.id] !== undefined);

	const roundLabel =
		game.totalRounds !== undefined
			? `Round ${currentRoundIndex + 1} of ${game.totalRounds}`
			: `Round ${currentRoundIndex + 1}`;

	const rowBg = (i: number) => (i % 2 === 0 ? theme.background : theme.backgroundElement + "55");

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen
				options={{
					title: game.name,
					headerBackTitle: "Home",
					headerTitle: () => (
						<HapticButton
							style={styles.headerTitleBtn}
							onPress={() => router.push(`/game/${id}/info`)}
							hitSlop={8}
							activeOpacity={0.6}
						>
							<ThemedText style={styles.headerTitleText} numberOfLines={1}>
								{game.name}
							</ThemedText>
							<SymbolView
								name="info.circle"
								size={16}
								tintColor={CURRENT_TINT}
								style={{ backgroundColor: "transparent" }}
							/>
						</HapticButton>
					),
				}}
			/>
			<SafeAreaView style={styles.safe} edges={["bottom"]}>
				{/* Round label row */}
				<View style={styles.roundLabelRow}>
					{!finished && <ThemedText style={styles.roundLabel}>{roundLabel}</ThemedText>}
					{!finished && (game.extras?.dice || game.extras?.timer) && (
						<View style={styles.extraIcons}>
							{game.extras?.dice && (
								<HapticButton
									onPress={() => router.push(`/game/${id}/dice`)}
									hitSlop={8}
									style={[styles.extraIconBtn, { borderColor: CURRENT_TINT }]}
								>
									<FontAwesome5 name="dice" size={22} color={CURRENT_TINT} />
								</HapticButton>
							)}
							{game.extras?.timer && (
								<HapticButton
									onPress={() => router.push(`/game/${id}/timer`)}
									hitSlop={8}
									style={[styles.extraIconBtn, { borderColor: CURRENT_TINT }]}
								>
									<FontAwesome5 name="clock" size={22} color={CURRENT_TINT} />
								</HapticButton>
							)}
						</View>
					)}
				</View>

				{/* Tab toggle */}
				<View style={[styles.viewToggle, { backgroundColor: theme.backgroundElement }]}>
					<HapticButton
						style={[styles.viewTab, viewMode === "scores" && { backgroundColor: CURRENT_TINT }]}
						onPress={() => setViewMode("scores")}
					>
						<ThemedText
							type="small"
							style={{ color: viewMode === "scores" ? "#fff" : theme.textSecondary }}
						>
							Scorecard
						</ThemedText>
					</HapticButton>
					{finished ? (
						<HapticButton
							style={[styles.viewTab, viewMode === "results" && { backgroundColor: CURRENT_TINT }]}
							onPress={() => setViewMode("results")}
						>
							<ThemedText
								type="small"
								style={{ color: viewMode === "results" ? "#fff" : theme.textSecondary }}
							>
								Final Results
							</ThemedText>
						</HapticButton>
					) : (
						<HapticButton
							style={[styles.viewTab, viewMode === "turns" && { backgroundColor: CURRENT_TINT }]}
							onPress={() => setViewMode("turns")}
						>
							<ThemedText
								type="small"
								style={{ color: viewMode === "turns" ? "#fff" : theme.textSecondary }}
							>
								Current Round
							</ThemedText>
						</HapticButton>
					)}
				</View>

				{/* Current Turn view */}
				{viewMode === "turns" && !finished
					? (() => {
							const { firstPlayerId, dealerId } = getTurnState(game, currentRoundIndex);
							const playerMap = Object.fromEntries(game.players.map((p) => [p.id, p]));
							const allScored =
								game.players.length > 0 &&
								game.players.every((p) => getScore(currentRoundIndex, p.id) !== null);
							const firstPlayer = firstPlayerId ? playerMap[firstPlayerId] : null;
							return (
								<View style={{ flex: 1 }}>
									{firstPlayer && (
										<ThemedText style={[styles.goesFirstLabel, { color: theme.textSecondary }]}>
											{firstPlayer.name} goes first this round
										</ThemedText>
									)}
									<View
										style={[
											styles.turnHeaderRow,
											{
												borderBottomColor: theme.backgroundSelected,
												backgroundColor: theme.backgroundSelected,
											},
										]}
									>
										<ThemedText style={styles.turnHeaderCell} themeColor="textSecondary">
											Player
										</ThemedText>
										<ThemedText
											style={[styles.turnHeaderCell, styles.turnHeaderRight]}
											themeColor="textSecondary"
										>
											Points so far
										</ThemedText>
									</View>
									{/* Fixed-height clipped container so rows slide in/out cleanly */}
									<View style={[styles.turnList, { height: displayedOrder.length * ROW_H }]}>
										<Animated.View style={turnListAnimatedStyle}>
											{/* K ghost rows entering from above — first one offset by -K*ROW_H */}
											{ghostIds.map((pid, idx) => {
												const gp = playerMap[pid];
												if (!gp) return null;
												const isDealer = pid === dealerId;
												const hasScore = getScore(currentRoundIndex, pid) !== null;
												const roundScore = getScore(currentRoundIndex, pid);
												const prevTotal = (totals[pid] ?? 0) - (roundScore ?? 0);
												return (
													<View
														key={`ghost-${idx}`}
														style={[
															styles.turnRow,
															{
																height: ROW_H,
																borderBottomColor: theme.backgroundSelected,
																...(idx === 0 && {
																	marginTop: -ghostIds.length * ROW_H,
																}),
															},
														]}
													>
														<View style={styles.turnNameRow}>
															<ThemedText style={styles.turnName} numberOfLines={1}>
																{gp.name}
															</ThemedText>
															{hasScore && (
																<ThemedText
																	style={[
																		styles.turnCheckmark,
																		{ color: CURRENT_TINT },
																	]}
																>
																	✓
																</ThemedText>
															)}
															{isDealer && (
																<View
																	style={[
																		styles.dealerBadge,
																		{ backgroundColor: CURRENT_TINT + "20" },
																	]}
																>
																	<ThemedText
																		style={[
																			styles.dealerLabel,
																			{ color: CURRENT_TINT },
																		]}
																	>
																		DEALER
																	</ThemedText>
																</View>
															)}
														</View>
														<View style={styles.turnScoreArea}>
															<View style={styles.turnScoreRow}>
																<ThemedText style={styles.turnScore}>
																	{prevTotal}
																</ThemedText>
																{roundScore !== null && (
																	<ThemedText
																		style={[
																			styles.turnScoreDelta,
																			{
																				color:
																					roundScore < 0
																						? theme.danger
																						: theme.text,
																			},
																		]}
																	>
																		{roundScore >= 0
																			? ` +${roundScore}`
																			: ` ${roundScore}`}
																	</ThemedText>
																)}
															</View>
														</View>
													</View>
												);
											})}
											{displayedOrder.map((pid: string) => {
												const p = playerMap[pid];
												if (!p) return null;
												const isDealer = pid === dealerId;
												const hasScore = getScore(currentRoundIndex, pid) !== null;
												return (
													<HapticButton
														key={pid}
														style={[
															styles.turnRow,
															{
																height: ROW_H,
																borderBottomColor: theme.backgroundSelected,
															},
														]}
														onPress={() =>
															router.push(
																`/game/${id}/score-player?playerId=${pid}&roundIndex=${currentRoundIndex}`,
															)
														}
														activeOpacity={0.7}
													>
														<View style={styles.turnNameRow}>
															<ThemedText style={styles.turnName} numberOfLines={1}>
																{p.name}
															</ThemedText>
															{hasScore && (
																<ThemedText
																	style={[
																		styles.turnCheckmark,
																		{ color: CURRENT_TINT },
																	]}
																>
																	✓
																</ThemedText>
															)}
															{isDealer && (
																<View
																	style={[
																		styles.dealerBadge,
																		{ backgroundColor: CURRENT_TINT + "20" },
																	]}
																>
																	<ThemedText
																		style={[
																			styles.dealerLabel,
																			{ color: CURRENT_TINT },
																		]}
																	>
																		DEALER
																	</ThemedText>
																</View>
															)}
														</View>
														<View style={styles.turnScoreArea}>
															{(() => {
																const roundScore = getScore(currentRoundIndex, pid);
																const prevTotal =
																	(totals[pid] ?? 0) - (roundScore ?? 0);
																return (
																	<View style={styles.turnScoreRow}>
																		<ThemedText style={styles.turnScore}>
																			{prevTotal}
																		</ThemedText>
																		{roundScore !== null && (
																			<ThemedText
																				style={[
																					styles.turnScoreDelta,
																					{
																						color:
																							roundScore < 0
																								? theme.danger
																								: theme.text,
																					},
																				]}
																			>
																				{roundScore >= 0
																					? ` +${roundScore}`
																					: ` ${roundScore}`}
																			</ThemedText>
																		)}
																	</View>
																);
															})()}
														</View>
													</HapticButton>
												);
											})}
										</Animated.View>
									</View>
									{allScored && (
										<HapticButton
											style={[styles.nextRoundBtn, { backgroundColor: CURRENT_TINT }]}
											onPress={isFinalRound ? handleShowFinalScores : advanceRound}
										>
											<ThemedText type="smallBold" style={{ color: "#fff" }}>
												{isFinalRound ? "Show Final Scores" : "Next Round"}
											</ThemedText>
										</HapticButton>
									)}
									{game.players.length > 0 && (
										<HapticButton
											style={[
												styles.editOrderBtn,
												{
													borderColor: theme.backgroundSelected,
													backgroundColor: theme.backgroundElement,
												},
											]}
											onPress={() => router.push(`/game/${id}/turn-order`)}
										>
											<ThemedText type="small" themeColor="textSecondary">
												Edit Turn Order
											</ThemedText>
										</HapticButton>
									)}
								</View>
							);
						})()
					: null}

				{/* Scorecard: players as columns, rounds as rows */}
				{viewMode === "scores"
					? (() => {
							// Fewer rows fit on screen with larger text, so cap the visible window
							// lower — the round list scrolls internally and the Next Round / End
							// Game buttons below it stay reachable instead of being pushed off.
							const MAX_VISIBLE_ROWS = largeText ? 5 : 10;
							const CURRENT_ROW_BG = CURRENT_TINT + "40";
							const MEDAL_COLORS = ["#FFD700", "#888888", "#CD7F32"];
							// Fixed dark pill so the gold/silver/bronze numbers (and white for the
							// rest) stay high-contrast in every color scheme, light or dark.
							const RANK_PILL_BG = "#1C1C22";
							const RANK_LABELS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
							const tiers = buildTiers(sortedPlayers, totals);
							const rankMap = new Map(tiers.flatMap((tier, ti) => tier.map((p) => [p.id, ti])));
							const rankLbl = (tier: number) =>
								firstRoundComplete ? (RANK_LABELS[tier] ?? `${tier + 1}th`) : "";
							const rankColor = (tier: number) => (tier < 3 ? MEDAL_COLORS[tier] : theme.accentText);
							return (
								<View style={{ flexDirection: "row", alignItems: "flex-start" }}>
									{/* Fixed left: round number column */}
									<View style={{ width: ROUND_LABEL_W }}>
										<Animated.View
											style={[
												styles.labelCell,
												rankCornerStyle,
												{ backgroundColor: theme.backgroundSelected },
											]}
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
															<ThemedText
																style={[
																	styles.labelText,
																	isCurrent && { color: CURRENT_TINT },
																]}
															>
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
											<ThemedText
												style={[
													styles.labelText,
													{ fontWeight: "700" },
													finished && { color: CURRENT_TINT },
												]}
											>
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
												style={[
													rankRowRevealStyle,
													{ overflow: "hidden", backgroundColor: theme.backgroundSelected },
												]}
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
																	<View
																		style={[
																			styles.rankPill,
																			{ backgroundColor: RANK_PILL_BG },
																		]}
																	>
																		<ThemedText
																			style={[
																				styles.rankLabel,
																				{ color: rankColor(tier) },
																			]}
																		>
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
											<View
												style={[
													styles.headerRow,
													{ backgroundColor: theme.backgroundSelected },
												]}
											>
												{displayedScorecardPlayers.map((p) => (
													<RNAnimated.View
														key={p.id}
														style={[
															styles.nameCell,
															{ width: colW, height: ROW_H },
															{ transform: [{ translateX: getColAnim(p.id) }] },
														]}
													>
														{finished ? (
															<HapticButton
																onPress={() => router.push(`/player/${p.id}`)}
															>
																<ThemedText style={styles.colHeader} numberOfLines={1}>
																	{p.name}
																</ThemedText>
															</HapticButton>
														) : (
															<ThemedText style={styles.colHeader} numberOfLines={1}>
																{p.name}
															</ThemedText>
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
																return (
																	<RNAnimated.View
																		key={p.id}
																		style={{
																			transform: [
																				{ translateX: getColAnim(p.id) },
																			],
																		}}
																	>
																		<Cell
																			style={[
																				styles.scoreCell,
																				{ width: colW, height: ROW_H },
																			]}
																			{...(tappable
																				? {
																						onPress: () =>
																							openEditCell({
																								roundIndex: ri,
																								player: p,
																							}),
																					}
																				: {})}
																		>
																			<ThemedText
																				style={
																					s === null
																						? styles.emptyScore
																						: styles.score
																				}
																				themeColor={
																					s === null
																						? "textSecondary"
																						: "text"
																				}
																			>
																				{s !== null ? s : "–"}
																			</ThemedText>
																			{displayedEditCell?.player.id === p.id &&
																				displayedEditCell?.roundIndex ===
																					ri && (
																					<RNAnimated.View
																						style={[
																							StyleSheet.absoluteFill,
																							{
																								borderWidth: 2,
																								borderColor:
																									CURRENT_TINT,
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
													<RNAnimated.View
														key={p.id}
														style={{ transform: [{ translateX: getColAnim(p.id) }] }}
													>
														<View
															style={[styles.scoreCell, { width: colW, height: ROW_H }]}
														>
															<ThemedText
																style={[
																	styles.totalScore,
																	finished && { color: CURRENT_TINT },
																]}
															>
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
						})()
					: null}

				{/* Static Final Results view (finished games only) */}
				{viewMode === "results" &&
					finished &&
					(() => {
						const tiers = buildTiers(sortedPlayers, totals);
						const restTiers = tiers.slice(3);
						const accentColors = [CURRENT_TINT, theme.backgroundSelected, theme.backgroundSelected];
						// Larger text needs taller platforms (and a taller podium) so names/scores fit.
						const podiumScale = largeText ? textScale : 1;
						const podiumH = PODIUM_H * podiumScale;
						const platformH = PLATFORM_H.map((h) => h * podiumScale);
						return (
							<ScrollView
								contentContainerStyle={{ gap: Spacing.three, paddingBottom: Spacing.six }}
								showsVerticalScrollIndicator={false}
							>
								{/* Podium */}
								<View
									style={[podiumStyles.podiumWrapper, { backgroundColor: theme.backgroundElement }]}
								>
									<View style={[podiumStyles.podiumRow, { height: podiumH }]}>
										{COL_RANK.map((rankIdx, colIdx) => {
											const tierPlayers = tiers[rankIdx] ?? [];
											const tierScore = tierPlayers[0] ? (totals[tierPlayers[0].id] ?? 0) : 0;
											return (
												<View key={colIdx} style={podiumStyles.podiumCol}>
													{tierPlayers.length > 0 && (
														<View
															style={[
																podiumStyles.playerInfo,
																{ bottom: platformH[rankIdx] + Spacing.two },
															]}
														>
															<View
																style={[
																	podiumStyles.rankIcon,
																	{
																		borderColor: CURRENT_TINT + "55",
																		shadowColor: CURRENT_TINT,
																		backgroundColor: CURRENT_TINT + "18",
																	},
																]}
															>
																<FontAwesome5
																	name={RANK_ICONS[rankIdx].name as any}
																	size={18}
																	color={RANK_ICONS[rankIdx].color}
																/>
															</View>
															{tierPlayers.length > 1 ? (
																<ThemedText style={podiumStyles.tieName}>
																	{tierPlayers.length}-way tie
																</ThemedText>
															) : (
																<View style={podiumStyles.names}>
																	<ThemedText
																		style={podiumStyles.playerName}
																		numberOfLines={1}
																	>
																		{tierPlayers[0]?.name}
																	</ThemedText>
																</View>
															)}
															<ThemedText
																style={[
																	podiumStyles.playerScore,
																	{ color: CURRENT_TINT },
																]}
															>
																{tierScore}
															</ThemedText>
														</View>
													)}
													<View
														style={[
															podiumStyles.platform,
															{
																height: platformH[rankIdx],
																backgroundColor: accentColors[rankIdx],
															},
														]}
													>
														<ThemedText
															style={[
																podiumStyles.rankNum,
																{
																	color:
																		rankIdx === 0
																			? theme.accentText
																			: theme.textSecondary,
																},
															]}
														>
															{["1st", "2nd", "3rd"][rankIdx]}
														</ThemedText>
														{tierPlayers.length > 1 && (
															<TieList
																players={tierPlayers}
																maxVisible={TIE_NAME_LIMIT[rankIdx]}
																rowHeight={TIE_ROW_H * podiumScale}
																textColor={
																	rankIdx === 0
																		? theme.accentText
																		: theme.textSecondary
																}
															/>
														)}
													</View>
												</View>
											);
										})}
									</View>
								</View>

								{/* 4th place and below — dense ranked */}
								{restTiers.length > 0 && (
									<View style={[podiumStyles.restList, { backgroundColor: theme.backgroundElement }]}>
										{restTiers.map((tierPlayers: Player[], tierIdx: number) =>
											tierPlayers.map((player: Player) => (
												<View
													key={player.id}
													style={[
														podiumStyles.restRow,
														{ borderBottomColor: theme.backgroundSelected },
													]}
												>
													<ThemedText
														style={[podiumStyles.restRank, { color: theme.textSecondary }]}
													>
														#{tierIdx + 4}
													</ThemedText>
													<ThemedText style={podiumStyles.restName} numberOfLines={1}>
														{player.name}
													</ThemedText>
													<ThemedText style={[podiumStyles.restScore, { color: theme.text }]}>
														{totals[player.id] ?? 0}
													</ThemedText>
												</View>
											)),
										)}
									</View>
								)}
							</ScrollView>
						);
					})()}

				{/* Next Round (scorecard view) */}
				{viewMode === "scores" &&
					!finished &&
					(() => {
						const allScored =
							game.players.length > 0 &&
							game.players.every((p) => getScore(currentRoundIndex, p.id) !== null);
						return allScored ? (
							<HapticButton
								style={[styles.nextRoundBtn, { backgroundColor: CURRENT_TINT }]}
								onPress={isFinalRound ? handleShowFinalScores : advanceRound}
							>
								<ThemedText type="smallBold" style={{ color: "#fff" }}>
									{isFinalRound ? "Show Final Scores" : "Next Round"}
								</ThemedText>
							</HapticButton>
						) : null;
					})()}

				{/* End Game */}
				{!finished && (
					<HapticButton
						style={[
							styles.endGameBtn,
							{ borderColor: theme.backgroundElement, backgroundColor: theme.backgroundSelected },
						]}
						onPress={confirmEndGame}
					>
						<ThemedText type="small" style={styles.endGameText}>
							End Game
						</ThemedText>
					</HapticButton>
				)}
			</SafeAreaView>

			<CellEditModal
				visible={editCell !== null}
				title={`Round ${(editCell?.roundIndex ?? 0) + 1}  ·  ${editCell?.player.name ?? ""}`}
				initialValue={editCell ? getScore(editCell.roundIndex, editCell.player.id) : null}
				onSave={(value) => {
					if (editCell) updateScore(editCell.roundIndex, editCell.player.id, value);
					clearEditCell();
				}}
				onCancel={() => clearEditCell()}
			/>
		</ThemedView>
	);
}
const styles = StyleSheet.create({
	safe: {
		flex: 1,
		paddingHorizontal: Spacing.three,
		paddingTop: Spacing.two,
		gap: Spacing.two,
	},
	roundLabelRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 5,
		paddingVertical: 4,
	},
	extraIcons: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	extraIconBtn: {
		padding: 8,
		borderRadius: 10,
		borderWidth: 1.5,
	},
	roundLabel: {
		fontSize: 25,
		fontWeight: "700",
		letterSpacing: -0.3,
	},
	headerTitleBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},
	headerTitleText: {
		fontSize: 17,
		fontWeight: "600",
	},
	viewToggle: {
		flexDirection: "row",
		borderRadius: Spacing.two,
		overflow: "hidden",
		padding: 3,
	},
	viewTab: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.one + 2,
		margin: 2,
		borderRadius: Spacing.two - 3,
	},
	// Scorecard
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
	scoreRow: {
		flexDirection: "row",
	},
	scoreCell: {
		alignItems: "center",
		justifyContent: "center",
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
	endGameBtn: {
		alignItems: "center",
		paddingVertical: Spacing.two,
		marginHorizontal: Spacing.three,
		marginBottom: Spacing.two,
		borderRadius: Spacing.two,
		borderWidth: StyleSheet.hairlineWidth,
	},
	endGameText: {},
	// Current Turn view
	turnList: {
		borderRadius: Spacing.two,
		overflow: "hidden",
	},
	turnRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two + 2,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: Spacing.two,
	},
	turnNameRow: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	turnName: {
		flexShrink: 1,
		fontSize: 17,
	},
	dealerBadge: {
		borderRadius: Spacing.one,
		paddingHorizontal: Spacing.one,
		paddingVertical: 2,
	},
	dealerLabel: {
		fontSize: 10,
		fontWeight: "700",
		letterSpacing: 0.5,
	},
	turnScoreArea: {
		alignItems: "flex-end",
		gap: 4,
	},
	turnScoreRow: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: 4,
	},
	turnScore: {
		fontSize: 22,
		fontWeight: "600",
		minWidth: 50,
		textAlign: "right",
	},
	turnScoreDelta: {
		fontSize: 16,
		fontWeight: "500",
		opacity: 0.45,
	},
	addScoreBtn: {
		borderRadius: 6,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	addScoreLabel: {
		fontSize: 13,
		fontWeight: "600",
	},
	editOrderBtn: {
		borderRadius: Spacing.two,
		borderWidth: StyleSheet.hairlineWidth,
		paddingVertical: Spacing.two,
		alignItems: "center",
		marginTop: Spacing.two,
	},
	nextRoundBtn: {
		borderRadius: Spacing.two,
		paddingVertical: Spacing.two + 2,
		alignItems: "center",
		marginTop: Spacing.two,
	},
	turnCheckmark: {
		fontSize: 16,
		fontWeight: "700",
	},
	goesFirstLabel: {
		fontSize: 14,
		paddingVertical: Spacing.two,
	},
	turnHeaderRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.one,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	turnHeaderCell: {
		flex: 1,
		fontSize: 11,
		fontWeight: "600",
		letterSpacing: 0.4,
		textTransform: "uppercase",
	},
	turnHeaderRight: {
		flex: 0,
		textAlign: "right",
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

const podiumStyles = StyleSheet.create({
	podiumWrapper: { borderRadius: Spacing.two, overflow: "hidden" },
	podiumRow: { flexDirection: "row", alignItems: "flex-end" },
	podiumCol: { flex: 1, position: "relative", alignItems: "center" },
	playerInfo: { position: "absolute", left: 4, right: 4, alignItems: "center", gap: 2 },
	medal: { fontSize: 28, lineHeight: 34 },
	playerName: { fontSize: 13, fontWeight: "600", textAlign: "center" },
	tieName: { fontSize: 11, fontWeight: "700", textAlign: "center", opacity: 0.6, letterSpacing: 0.3 },
	tieScroll: { maxHeight: 48, width: "100%" },
	tieRow: { justifyContent: "center", overflow: "hidden" },
	tiePlayerName: { fontSize: 11, fontWeight: "600", textAlign: "center", includeFontPadding: false },
	// Slim "more" hint below the list — must not occupy a full name row.
	tieMore: { fontSize: 9, lineHeight: 10, height: 10, textAlign: "center", opacity: 0.5, includeFontPadding: false },
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
