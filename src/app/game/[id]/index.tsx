import { FontAwesome5 } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import { Alert, Platform, Animated as RNAnimated, ScrollView, StyleSheet, UIManager, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

if (Platform.OS === "android") {
	UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

import { CellEditModal } from "@/components/cell-edit-modal";
import { HapticButton } from "@/components/haptic-button";
import { Scorecard } from "@/components/scorecard/Scorecard";
import { TurnList } from "@/components/scorecard/TurnList";
import { Podium } from "@/components/standings/Podium";
import { RankedList } from "@/components/standings/RankedList";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { Player } from "@/context/games-context";
import { useTextScale } from "@/context/text-scale-context";
import { getGameType } from "@/game-types/registry";
import { useGame } from "@/hooks/use-game";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";
import { buildTiers } from "@/utils/game";

const BASE_ROW_H = 44;

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
	const {
		game,
		endGame,
		updateScore,
		advanceRound,
		updatePhased,
		updateGamePartial,
		totals,
		sortedPlayers,
		visibleRoundCount,
		currentRoundIndex,
	} = useGame(id);
	const isPhase10 = game?.gameType === "phase10";
	const gameType = getGameType(game);

	const [editCell, setEditCell] = useState<{ roundIndex: number; player: Player } | null>(null);
	const finished = !!game?.finishedAt;
	const [viewMode, setViewMode] = useState<"scores" | "turns" | "results">(game?.finishedAt ? "scores" : "turns");

	// Cell border fade
	const editBorderAnim = useRef(new RNAnimated.Value(0)).current;
	const openEditCell = (cell: { roundIndex: number; player: Player }) => {
		setEditCell(cell);
		RNAnimated.timing(editBorderAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
	};
	const clearEditCell = () => {
		RNAnimated.timing(editBorderAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
			setEditCell(null);
		});
	};

	const isFinalRound = !!game && gameType.isFinalRound(game, currentRoundIndex);

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

	const allScored = game.players.length > 0 && game.players.every((p) => getScore(currentRoundIndex, p.id) !== null);

	const roundLabel =
		game.totalRounds !== undefined
			? `Round ${currentRoundIndex + 1} of ${game.totalRounds}`
			: `Round ${currentRoundIndex + 1}`;

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
						<ThemedText type="small" style={{ color: viewMode === "scores" ? "#fff" : theme.textSecondary }}>
							Scorecard
						</ThemedText>
					</HapticButton>
					{finished ? (
						<HapticButton
							style={[styles.viewTab, viewMode === "results" && { backgroundColor: CURRENT_TINT }]}
							onPress={() => setViewMode("results")}
						>
							<ThemedText type="small" style={{ color: viewMode === "results" ? "#fff" : theme.textSecondary }}>
								Final Results
							</ThemedText>
						</HapticButton>
					) : (
						<HapticButton
							style={[styles.viewTab, viewMode === "turns" && { backgroundColor: CURRENT_TINT }]}
							onPress={() => setViewMode("turns")}
						>
							<ThemedText type="small" style={{ color: viewMode === "turns" ? "#fff" : theme.textSecondary }}>
								Current Round
							</ThemedText>
						</HapticButton>
					)}
				</View>

				{/* Current Turn view */}
				{viewMode === "turns" && !finished && (
					<TurnList
						game={game}
						gameType={gameType}
						gameId={id}
						currentRoundIndex={currentRoundIndex}
						totals={totals}
						allScored={allScored}
						isFinalRound={isFinalRound}
						advanceRound={advanceRound}
						updateGamePartial={updateGamePartial}
						theme={theme}
						tint={CURRENT_TINT}
						largeText={largeText}
						rowH={ROW_H}
					/>
				)}

				{/* Scorecard: players as columns, rounds as rows */}
				{viewMode === "scores" && (
					<Scorecard
						game={game}
						gameType={gameType}
						gameId={id}
						sortedPlayers={sortedPlayers}
						totals={totals}
						visibleRoundCount={visibleRoundCount}
						currentRoundIndex={currentRoundIndex}
						finished={finished}
						theme={theme}
						tint={CURRENT_TINT}
						largeText={largeText}
						rowH={ROW_H}
						openEditCell={openEditCell}
						editCell={editCell}
						editBorderAnim={editBorderAnim}
					/>
				)}

				{/* Static Final Results view (finished games only) */}
				{viewMode === "results" &&
					finished &&
					(() => {
						const tiers = buildTiers(sortedPlayers, totals, game);
						const restTiers = tiers.slice(3);
						const secondaryStat = gameType.secondaryStat
							? (playerId: string) => gameType.secondaryStat!(game, playerId)
							: undefined;
						return (
							<ScrollView
								style={{ flex: 1 }}
								contentContainerStyle={{ gap: Spacing.three, paddingBottom: Spacing.six }}
								showsVerticalScrollIndicator={false}
							>
								<Podium
									tiers={tiers}
									totals={totals}
									theme={theme}
									largeText={largeText}
									animated={false}
									secondaryStat={secondaryStat}
								/>
								<RankedList tiers={restTiers} totals={totals} theme={theme} secondaryStat={secondaryStat} />
							</ScrollView>
						);
					})()}

				{/* Next Round (scorecard view) */}
				{viewMode === "scores" && !finished && !isFinalRound && (
					<HapticButton
						style={[styles.nextRoundBtn, { backgroundColor: allScored ? CURRENT_TINT : theme.backgroundElement }]}
						onPress={advanceRound}
						disabled={!allScored}
					>
						<ThemedText type="smallBold" style={{ color: allScored ? "#fff" : theme.textSecondary }}>
							Next Round
						</ThemedText>
					</HapticButton>
				)}

				{/* End Game / Finish Game — always visible, static; becomes "Finish Game" once the
				    final round is fully scored, since at that point it does the same thing. */}
				{!finished && (
					<HapticButton
						style={[
							styles.endGameBtn,
							{ borderColor: theme.backgroundElement, backgroundColor: theme.backgroundSelected },
						]}
						onPress={isFinalRound && allScored ? handleShowFinalScores : confirmEndGame}
					>
						<ThemedText type="small" style={styles.endGameText}>
							{isFinalRound && allScored ? gameType.finishButtonLabel : "End Game"}
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
				showPhaseToggle={isPhase10 && editCell !== null}
				phased={!!(editCell && game.phasedRounds?.[editCell.roundIndex]?.[editCell.player.id])}
				onTogglePhased={(v) => {
					if (editCell) updatePhased(editCell.roundIndex, editCell.player.id, v);
				}}
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
	endGameBtn: {
		alignItems: "center",
		paddingVertical: Spacing.two,
		marginHorizontal: Spacing.three,
		marginBottom: Spacing.two,
		borderRadius: Spacing.two,
		borderWidth: StyleSheet.hairlineWidth,
	},
	endGameText: {},
	nextRoundBtn: {
		borderRadius: Spacing.two,
		paddingVertical: Spacing.two + 2,
		alignItems: "center",
		marginTop: Spacing.two,
	},
});
