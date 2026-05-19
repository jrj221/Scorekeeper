import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Alert, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CellEditModal } from "@/components/cell-edit-modal";
import { EditGameModal } from "@/components/edit-game-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { Player } from "@/context/games-context";
import { useGame } from "@/hooks/use-game";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";

const SCREEN_W = Dimensions.get("window").width;
const H_PAD = Spacing.three * 2;
const PLAYER_COL = 96;
const TOTAL_COL = 40;
const DIVIDER_W = 3;
const ROUND_COL = Math.floor((SCREEN_W - H_PAD - PLAYER_COL - TOTAL_COL - DIVIDER_W) / 5);
// All rows (header + player rows) share the same height
const ROW_H = 44;

const MEDALS = ["🥇", "🥈", "🥉"];
const CURRENT_TINT = "#0077B6";

export default function GameScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const theme = useTheme();
	const {
		game,
		showEditGame,
		openEditGame,
		closeEditGame,
		updateSettings,
		endGame,
		addPlayer,
		deletePlayer,
		renamePlayer,
		updateScore,
		totals,
		sortedPlayers,
		visibleRoundCount,
	} = useGame(id);

	const [editCell, setEditCell] = useState<{ roundIndex: number; player: Player } | null>(null);
	const finished = !!game?.finishedAt;

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

	// Current round = first round where not all players have a score
	let currentRoundIndex = visibleRoundCount - 1;
	for (let i = 0; i < visibleRoundCount; i++) {
		const r = game.rounds[i] ?? {};
		if (game.players.some((p) => r[p.id] === undefined)) {
			currentRoundIndex = i;
			break;
		}
	}

	const showCurrentInFront = currentRoundIndex >= 5;

	type Col = { roundIndex: number; isCurrent: boolean };
	const columns: Col[] = [];
	if (!showCurrentInFront) {
		for (let i = 0; i < visibleRoundCount; i++) {
			columns.push({ roundIndex: i, isCurrent: i === currentRoundIndex });
		}
	} else {
		columns.push({ roundIndex: currentRoundIndex, isCurrent: true });
		for (let i = 0; i < visibleRoundCount; i++) {
			if (i !== currentRoundIndex) columns.push({ roundIndex: i, isCurrent: false });
		}
	}

	const firstRoundComplete =
		game.players.length > 0 && game.players.every((p) => (game.rounds[0] ?? {})[p.id] !== undefined);

	const rowBg = (i: number) => (i % 2 === 0 ? theme.background : theme.backgroundElement + "55");

	const roundLabel =
		game.totalRounds !== undefined
			? `Round ${currentRoundIndex + 1} of ${game.totalRounds}`
			: `Round ${currentRoundIndex + 1}`;

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
								onPress={openEditGame}
							>
								<ThemedText type="small" themeColor="textSecondary">
									Edit Game
								</ThemedText>
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Table: fixed left + scrollable rounds */}
				<View style={styles.tableOuter}>
					{/* Fixed left: player name + total */}
					<View>
						{/* Header */}
						<View style={[styles.headerRow, { height: ROW_H, backgroundColor: theme.backgroundSelected }]}>
							<View style={[styles.cell, { width: PLAYER_COL }]}>
								<ThemedText style={styles.colHeader}>Player</ThemedText>
							</View>
							<View
								style={[
									styles.cell,
									styles.borderLeft,
									{ width: TOTAL_COL, borderColor: theme.background },
								]}
							>
								<ThemedText style={styles.colHeader}>Total</ThemedText>
							</View>
						</View>

						{sortedPlayers.map((p, i) => (
							<View key={p.id} style={[styles.playerRow, { height: ROW_H, backgroundColor: rowBg(i) }]}>
								<View style={[styles.cell, { width: PLAYER_COL }]}>
									<ThemedText style={styles.playerName} numberOfLines={1}>
										{firstRoundComplete && i < MEDALS.length ? MEDALS[i] + " " : ""}
										{p.name}
									</ThemedText>
								</View>
								<View
									style={[
										styles.cell,
										styles.borderLeft,
										{ width: TOTAL_COL, borderColor: theme.backgroundSelected },
									]}
								>
									<ThemedText style={styles.totalScore}>{totals[p.id] ?? 0}</ThemedText>
								</View>
							</View>
						))}
					</View>

					{/* Scrollable rounds */}
					<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
						<View>
							{/* Header */}
							<View
								style={[styles.headerRow, { height: ROW_H, backgroundColor: theme.backgroundSelected }]}
							>
								{columns.map((col, ci) => (
									<View key={col.roundIndex} style={styles.colWithDivider}>
										{showCurrentInFront && ci === 1 && (
											<View
												style={{
													width: DIVIDER_W,
													height: ROW_H,
													backgroundColor: CURRENT_TINT + "70",
												}}
											/>
										)}
										<View
											style={[
												styles.cell,
												ci > 0 && styles.borderLeft,
												{ width: ROUND_COL, height: ROW_H, borderColor: theme.background },
												col.isCurrent && { backgroundColor: CURRENT_TINT + "28" },
											]}
										>
											<ThemedText
												style={[styles.colHeader, col.isCurrent && { color: CURRENT_TINT }]}
											>
												{col.roundIndex + 1}
											</ThemedText>
										</View>
									</View>
								))}
							</View>

							{/* Player rows */}
							{sortedPlayers.map((p, pi) => (
								<View
									key={p.id}
									style={[styles.playerRow, { height: ROW_H, backgroundColor: rowBg(pi) }]}
								>
									{columns.map((col, ci) => {
										const s = getScore(col.roundIndex, p.id);
										const Cell = col.isCurrent && !finished ? TouchableOpacity : View;
										return (
											<View key={col.roundIndex} style={styles.colWithDivider}>
												{showCurrentInFront && ci === 1 && (
													<View
														style={{
															width: DIVIDER_W,
															height: ROW_H,
															backgroundColor: CURRENT_TINT + "70",
														}}
													/>
												)}
												<Cell
													style={[
														styles.cell,
														ci > 0 && styles.borderLeft,
														{
															width: ROUND_COL,
															height: ROW_H,
															borderColor: theme.backgroundSelected,
														},
														col.isCurrent && { backgroundColor: CURRENT_TINT + "10" },
													]}
													{...(col.isCurrent
														? {
																onPress: () =>
																	setEditCell({
																		roundIndex: col.roundIndex,
																		player: p,
																	}),
															}
														: {})}
												>
													<ThemedText
														style={s === null ? styles.emptyScore : styles.score}
														themeColor={s === null ? "textSecondary" : "text"}
													>
														{s !== null ? s : "–"}
													</ThemedText>
												</Cell>
											</View>
										);
									})}
								</View>
							))}
						</View>
					</ScrollView>
				</View>

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

			<EditGameModal
				visible={showEditGame}
				players={game.players}
				totalRounds={game.totalRounds}
				rankByLowest={game.rankByLowest}
				onAdd={addPlayer}
				onDelete={deletePlayer}
				onRename={renamePlayer}
				onSaveSettings={updateSettings}
				onClose={closeEditGame}
			/>

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
	},
	roundLabel: {
		fontSize: 22,
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
	tableOuter: {
		flexDirection: "row",
		flex: 1,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	playerRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	colWithDivider: {
		flexDirection: "row",
		alignItems: "stretch",
	},
	cell: {
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 4,
	},
	borderLeft: {
		borderLeftWidth: StyleSheet.hairlineWidth,
	},
	colHeader: {
		fontSize: 12,
		fontWeight: "600",
		textAlign: "center",
		letterSpacing: 0.2,
	},
	playerName: {
		fontSize: 13,
		fontWeight: "500",
	},
	totalScore: {
		fontSize: 13,
		fontWeight: "700",
		textAlign: "center",
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
});
