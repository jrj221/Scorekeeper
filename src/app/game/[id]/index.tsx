import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useRef, useState } from "react";
import { Alert, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CellEditModal } from "@/components/cell-edit-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { Player } from "@/context/games-context";
import { useGame } from "@/hooks/use-game";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";
import { getTurnState } from "@/utils/game";

const SCREEN_W = Dimensions.get("window").width;
const H_PAD = Spacing.three * 2;
const ROUND_LABEL_W = 48;
const ROW_H = 44;

const MEDALS = ["🥇", "🥈", "🥉"];
const CURRENT_TINT = "#0077B6";

export default function GameScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const theme = useTheme();
	const { game, endGame, updateScore, advanceRound, totals, sortedPlayers, visibleRoundCount, currentRoundIndex } =
		useGame(id);

	const [editCell, setEditCell] = useState<{ roundIndex: number; player: Player } | null>(null);
	const [viewMode, setViewMode] = useState<"scores" | "turns">(game?.turnOrder ? "turns" : "scores");
	const finished = !!game?.finishedAt;
	const leftScrollRef = useRef<ScrollView>(null);
	const mainScrollRef = useRef<ScrollView>(null);
	const handleMainScroll = useCallback((e: any) => {
		leftScrollRef.current?.scrollTo({ y: e.nativeEvent.contentOffset.y, animated: false });
	}, []);

	const confirmEndGame = () =>
		Alert.alert("End Game", "Lock this game? Scores will be frozen and cannot be edited.", [
			{ text: "Cancel", style: "cancel" },
			{ text: "End Game", style: "destructive", onPress: endGame },
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

	// Column width: fill evenly for ≤4 players, fixed for 5+
	const availableW = SCREEN_W - H_PAD - ROUND_LABEL_W;
	const visibleCols = Math.min(sortedPlayers.length, 4);
	const colW = visibleCols > 0 ? Math.floor(availableW / visibleCols) : availableW;
	const needsHScroll = sortedPlayers.length > 4;

	const rowBg = (i: number) => (i % 2 === 0 ? theme.background : theme.backgroundElement + "55");

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: game.name }} />
			<SafeAreaView style={styles.safe} edges={["bottom"]}>
				{/* Round label row */}
				<View style={styles.roundLabelRow}>
					<ThemedText style={styles.roundLabel}>{finished ? "Finished" : roundLabel}</ThemedText>
					<View style={styles.headerBtns}>
						<TouchableOpacity onPress={() => router.push(`/game/${id}/info`)} hitSlop={8}>
							<SymbolView name="info.circle" size={20} tintColor={CURRENT_TINT} />
						</TouchableOpacity>
						{!finished && (
							<TouchableOpacity
								style={[styles.editGameBtn, { backgroundColor: theme.backgroundElement }]}
								onPress={() => router.push(`/game/${id}/edit`)}
							>
								<ThemedText type="small" themeColor="textSecondary">
									Edit Game
								</ThemedText>
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Scores / Current Turn tab toggle */}
				{!finished && game.turnOrder && (
					<View style={styles.viewToggle}>
						<TouchableOpacity
							style={[
								styles.viewTab,
								viewMode === "scores" && { backgroundColor: theme.backgroundSelected },
							]}
							onPress={() => setViewMode("scores")}
						>
							<ThemedText
								type="small"
								style={{ color: viewMode === "scores" ? theme.text : theme.textSecondary }}
							>
								Scorecard
							</ThemedText>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.viewTab,
								viewMode === "turns" && { backgroundColor: theme.backgroundSelected },
							]}
							onPress={() => setViewMode("turns")}
						>
							<ThemedText
								type="small"
								style={{ color: viewMode === "turns" ? theme.text : theme.textSecondary }}
							>
								Current Turn
							</ThemedText>
						</TouchableOpacity>
					</View>
				)}

				{/* Current Turn view */}
				{viewMode === "turns" && !finished && game.turnOrder
					? (() => {
							const { firstPlayerId, dealerId } = getTurnState(game, currentRoundIndex);
							const playerMap = Object.fromEntries(game.players.map((p) => [p.id, p]));
							const displayOrder = game.turnOrder;
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
									<ScrollView
										style={[styles.turnList, { flex: 1 }]}
										showsVerticalScrollIndicator={false}
									>
										{displayOrder.map((pid) => {
											const p = playerMap[pid];
											if (!p) return null;
											const isDealer = pid === dealerId;
											const hasScore = getScore(currentRoundIndex, pid) !== null;
											return (
												<TouchableOpacity
													key={pid}
													style={[
														styles.turnRow,
														{ borderBottomColor: theme.backgroundSelected },
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
															<ThemedText style={styles.turnCheckmark}>✓</ThemedText>
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
														<ThemedText style={styles.turnScore}>
															{totals[pid] ?? 0}
														</ThemedText>
													</View>
												</TouchableOpacity>
											);
										})}
									</ScrollView>
									{allScored && (
										<TouchableOpacity
											style={[styles.nextRoundBtn, { backgroundColor: CURRENT_TINT }]}
											onPress={advanceRound}
										>
											<ThemedText type="smallBold" style={{ color: "#fff" }}>
												Next Round
											</ThemedText>
										</TouchableOpacity>
									)}
									<TouchableOpacity
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
									</TouchableOpacity>
								</View>
							);
						})()
					: null}

				{/* Scorecard: players as columns, rounds as rows */}
				{viewMode === "scores" || finished
					? (() => {
							const MAX_VISIBLE_ROWS = 10;
							const CURRENT_ROW_BG = CURRENT_TINT + "40";
							return (
								<View style={{ flexDirection: "row", alignItems: "flex-start" }}>
									{/* Fixed left: round number column */}
									<View style={{ width: ROUND_LABEL_W }}>
										<View
											style={[
												styles.labelCell,
												{ height: ROW_H, backgroundColor: theme.backgroundSelected },
											]}
										/>
										<ScrollView
											ref={leftScrollRef}
											scrollEnabled={false}
											showsVerticalScrollIndicator={false}
											style={{ maxHeight: MAX_VISIBLE_ROWS * ROW_H }}
										>
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
										</ScrollView>
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
										horizontal
										scrollEnabled={sortedPlayers.length > 4}
										directionalLockEnabled
										showsHorizontalScrollIndicator={false}
										style={{ flex: 1 }}
									>
										<View style={{ alignItems: "flex-start" }}>
											{/* Player names header */}
											<View
												style={[
													styles.headerRow,
													{ backgroundColor: theme.backgroundSelected },
												]}
											>
												{sortedPlayers.map((p, i) => (
													<View
														key={p.id}
														style={[styles.nameCell, { width: colW, height: ROW_H }]}
													>
														{finished ? (
															<TouchableOpacity
																onPress={() => router.push(`/player/${p.id}`)}
															>
																<ThemedText style={styles.colHeader} numberOfLines={1}>
																	{firstRoundComplete && i < MEDALS.length
																		? MEDALS[i] + " "
																		: ""}
																	{p.name}
																</ThemedText>
															</TouchableOpacity>
														) : (
															<ThemedText style={styles.colHeader} numberOfLines={1}>
																{firstRoundComplete && i < MEDALS.length
																	? MEDALS[i] + " "
																	: ""}
																{p.name}
															</ThemedText>
														)}
													</View>
												))}
											</View>

											{/* Score rows */}
											<ScrollView
												ref={mainScrollRef}
												onScroll={handleMainScroll}
												scrollEventThrottle={16}
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
															{sortedPlayers.map((p) => {
																const s = getScore(ri, p.id);
																const tappable = !finished && ri <= currentRoundIndex;
																const Cell = tappable ? TouchableOpacity : View;
																return (
																	<Cell
																		key={p.id}
																		style={[
																			styles.scoreCell,
																			{ width: colW, height: ROW_H },
																		]}
																		{...(tappable
																			? {
																					onPress: () =>
																						setEditCell({
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
																				s === null ? "textSecondary" : "text"
																			}
																		>
																			{s !== null ? s : "–"}
																		</ThemedText>
																	</Cell>
																);
															})}
														</View>
													);
												})}
											</ScrollView>

											{/* Total row */}
											<View
												style={[
													styles.scoreRow,
													{ backgroundColor: theme.backgroundSelected },
													finished && { backgroundColor: CURRENT_TINT + "10" },
												]}
											>
												{sortedPlayers.map((p) => (
													<View
														key={p.id}
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
												))}
											</View>
										</View>
									</ScrollView>
								</View>
							);
						})()
					: null}

				{/* Next Round (scorecard view) */}
				{viewMode === "scores" &&
					!finished &&
					(() => {
						const allScored =
							game.players.length > 0 &&
							game.players.every((p) => getScore(currentRoundIndex, p.id) !== null);
						return allScored ? (
							<TouchableOpacity
								style={[styles.nextRoundBtn, { backgroundColor: CURRENT_TINT }]}
								onPress={advanceRound}
							>
								<ThemedText type="smallBold" style={{ color: "#fff" }}>
									Next Round
								</ThemedText>
							</TouchableOpacity>
						) : null;
					})()}

				{/* End Game */}
				{!finished && (
					<TouchableOpacity
						style={[
							styles.endGameBtn,
							{ borderColor: theme.backgroundElement, backgroundColor: theme.backgroundSelected },
						]}
						onPress={confirmEndGame}
					>
						<ThemedText type="small" style={styles.endGameText}>
							End Game
						</ThemedText>
					</TouchableOpacity>
				)}
			</SafeAreaView>

			<CellEditModal
				visible={editCell !== null}
				title={`Round ${(editCell?.roundIndex ?? 0) + 1}  ·  ${editCell?.player.name ?? ""}`}
				initialValue={editCell ? getScore(editCell.roundIndex, editCell.player.id) : null}
				onSave={(value) => {
					if (editCell) updateScore(editCell.roundIndex, editCell.player.id, value);
					setEditCell(null);
				}}
				onCancel={() => setEditCell(null)}
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
		padding: 5,
	},
	roundLabel: {
		fontSize: 25,
		fontWeight: "700",
		letterSpacing: -0.3,
	},
	headerBtns: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
	},
	editGameBtn: {
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.two,
		paddingVertical: Spacing.one,
	},
	viewToggle: {
		flexDirection: "row",
		borderRadius: Spacing.two,
		overflow: "hidden",
	},
	viewTab: {
		flex: 1,
		alignItems: "center",
		paddingVertical: Spacing.one,
		borderRadius: Spacing.two,
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
	endGameText: {
		color: "#C05050",
	},
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
	turnScore: {
		fontSize: 22,
		fontWeight: "600",
		minWidth: 50,
		textAlign: "right",
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
		color: CURRENT_TINT,
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
});
