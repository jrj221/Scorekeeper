import { getDealerHintText, getTurnHintText } from "@/utils/game";
import { consumePendingIcon } from "@/utils/icon-picker-state";
import { FontAwesome5 } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CellEditModal } from "@/components/cell-edit-modal";
import { HapticButton } from "@/components/haptic-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
	AddPlayerGroupRow,
	DEALER_PILLS,
	OptionCard,
	PersonPicker,
	PillOption,
	Pills,
	PlayerRow,
	SectionHeader,
	SetupCard,
} from "@/components/setup-form";
import { Spacing } from "@/constants/theme";
import { Player, useGamesContext } from "@/context/games-context";
import { useDraft } from "@/hooks/use-draft";
import { usePlayerSearch } from "@/hooks/use-player-search";
import { useTheme } from "@/hooks/use-theme";
import { useUnsavedChangesScroll } from "@/hooks/use-unsaved-changes-scroll";
import { forms } from "@/styles/forms";
import { shared } from "@/styles/shared";

type ActiveDropdown = "player" | "group" | "fixedDealer" | "firstPlayer" | null;
type FirstPlayerMode = "random" | "left-of-dealer" | "rotation";

export default function GameInfoScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { getGame, updateGame, globalPlayers, groups } = useGamesContext();
	const theme = useTheme();
	const router = useRouter();
	const game = getGame(id);

	const { draft, patch, isDirty, save: saveDraft, reset: resetDraft } = useDraft(game, updateGame);
	const scrollRef = useRef<ScrollView>(null);
	const { highlightStyle, exitSafely } = useUnsavedChangesScroll(isDirty, scrollRef);

	// Keep the player search field visually steady: when the player list grows or
	// shrinks, scroll by the same amount so the field stays put. The add/remove
	// handlers arm `pendingScrollAdjust`; the list's onLayout applies the delta.
	const scrollYRef = useRef(0);
	const pendingScrollAdjust = useRef(false);
	const playerListHeightRef = useRef(0);

	// Pick up icon selected in icon-picker screen
	useFocusEffect(
		useCallback(() => {
			const icon = consumePendingIcon();
			if (icon !== undefined) patch({ icon: icon ?? undefined });
		}, []),
	);

	const [showRoundNumpad, setShowRoundNumpad] = useState(false);
	const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
	const [removePlayerHint, setRemovePlayerHint] = useState(false);

	const patchPlayers = (next: Player[]) => {
		if (!draft) return;
		const origIds = new Set(draft.players.map((p: Player) => p.id));
		const newIds = new Set(next.map((p: Player) => p.id));
		let rounds = draft.rounds.map((r: Record<string, number>) => {
			const copy = { ...r };
			for (const pid of origIds) if (!newIds.has(pid)) delete copy[pid as string];
			return copy;
		});
		for (const p of next) {
			if (!origIds.has(p.id)) {
				rounds = rounds.map((r: Record<string, number>) => {
					const hasExisting = next.some((pl: Player) => origIds.has(pl.id) && r[pl.id] !== undefined);
					return hasExisting ? { ...r, [p.id]: 0 } : r;
				});
			}
		}
		const existingOrder = draft.turnOrder ?? draft.players.map((p: Player) => p.id);
		const turnOrder = [
			...existingOrder.filter((pid: string) => newIds.has(pid)),
			...next.filter((p: Player) => !origIds.has(p.id)).map((p: Player) => p.id),
		];
		const firstPlayerId = draft.firstPlayerId && newIds.has(draft.firstPlayerId) ? draft.firstPlayerId : undefined;
		patch({ players: next, rounds, turnOrder, firstPlayerId });
	};

	if (!game || !draft) {
		return (
			<ThemedView style={shared.screen}>
				<SafeAreaView style={shared.safeArea}>
					<ThemedText type="default">Game not found.</ThemedText>
				</SafeAreaView>
			</ThemedView>
		);
	}

	const finished = !!game.finishedAt;
	const players = draft.players;

	const handleRemovePlayer = (p: Player) => {
		if (players.length <= 1) {
			setRemovePlayerHint(true);
			return;
		}
		Alert.alert("Remove Player", `Remove ${p.name} from this game? Their scores will be deleted.`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Remove",
				style: "destructive",
				onPress: () => {
					pendingScrollAdjust.current = true;
					patchPlayers(players.filter((pl) => pl.id !== p.id));
				},
			},
		]);
	};

	const {
		playerSearch,
		setPlayerSearch,
		playerSearchError,
		playerSearchRef,
		filteredGlobalPlayers,
		addById: addExistingPlayer,
		submit: submitPlayerSearch,
		addGroup,
	} = usePlayerSearch(players, patchPlayers);

	const availableGroups = groups.filter(
		(g) => !g.playerIds.every((pid) => players.some((p) => p.id === pid)),
	);

	const dealerEnabled = !!draft.dealerEnabled;
	const dealerMode = draft.dealerMode ?? "rotation";
	const fixedDealerId = draft.fixedDealerId ?? null;
	const turnsEnabled = Array.isArray(draft.turnOrder);
	const leftOfDealer = draft.firstPlayerMode === "left-of-dealer";
	const firstPlayerId = draft.firstPlayerId ?? null;
	const firstPlayerMode: FirstPlayerMode = leftOfDealer ? "left-of-dealer" : firstPlayerId ? "rotation" : "random";

	const dealerHint = getDealerHintText(
		dealerEnabled,
		dealerMode,
		fixedDealerId ? players.find((p) => p.id === fixedDealerId)?.name : undefined,
	);
	const turnHint = getTurnHintText(
		turnsEnabled,
		firstPlayerMode,
		firstPlayerId ? players.find((p) => p.id === firstPlayerId)?.name : undefined,
	);

	const firstPlayerPills: PillOption<FirstPlayerMode>[] = dealerEnabled
		? [
			{ key: "left-of-dealer", label: "Left of Dealer", icon: "angle-left" },
			{ key: "rotation", label: "Rotating", icon: "sync-alt" },
			{ key: "random", label: "Random", icon: "random" },
		]
		: [
			{ key: "rotation", label: "Rotating", icon: "sync-alt" },
			{ key: "random", label: "Random", icon: "random" },
		];

	const innerInput = { backgroundColor: theme.background, color: theme.text } as const;

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "Game Info", headerBackTitle: game.name }} />
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<ScrollView
					ref={scrollRef}
					contentContainerStyle={styles.scroll}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					scrollEventThrottle={16}
					onScroll={(e) => {
						scrollYRef.current = e.nativeEvent.contentOffset.y;
					}}
				>
					{/* Game Name & Icon */}
					<SetupCard>
						<View style={forms.labelRow}>
							<ThemedText style={forms.label} themeColor="textSecondary">GAME NAME</ThemedText>
							<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary"> (OPTIONAL)</ThemedText>
						</View>
						{finished ? (
							<ThemedText type="default">{draft.name || "Untitled Game"}</ThemedText>
						) : (
							<View style={forms.nameRow}>
								<HapticButton
									style={[forms.iconBtn, { backgroundColor: theme.background }]}
									onPress={() => router.push("/icon-picker")}
									activeOpacity={0.7}
								>
									<FontAwesome5 name={(draft.icon ?? "users") as any} size={20} color={theme.textSecondary} />
								</HapticButton>
								<TextInput allowFontScaling={false}
									style={[shared.input, innerInput, { flex: 1 }]}
									placeholder="Untitled Game"
									placeholderTextColor={theme.textSecondary}
									value={draft.name ?? ""}
									onChangeText={(v) => patch({ name: v })}
									maxLength={30}
									returnKeyType="done"
								/>
							</View>
						)}
					</SetupCard>

					{/* Players */}
					<View style={styles.group}>
						<SectionHeader
							label="PLAYERS"
							trailing={
								<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary">
									{players.length}
								</ThemedText>
							}
						/>
						<SetupCard>
							{finished ? (
								<ThemedText type="default">{players.map((p) => p.name).join(", ")}</ThemedText>
							) : (
								<>
									{removePlayerHint && (
										<ThemedText style={forms.fieldError}>A game requires at least one player.</ThemedText>
									)}
									{players.length > 0 && (
										<View
											style={forms.playerList}
											onLayout={(e) => {
												const h = e.nativeEvent.layout.height;
												const delta = h - playerListHeightRef.current;
												playerListHeightRef.current = h;
												if (pendingScrollAdjust.current && delta !== 0) {
													pendingScrollAdjust.current = false;
													const target = Math.max(0, scrollYRef.current + delta);
													scrollRef.current?.scrollTo({ y: target, animated: true });
												}
											}}
										>
											{players.map((p) => (
												<PlayerRow
													key={p.id}
													name={p.name}
													onRemove={() => {
														setRemovePlayerHint(false);
														handleRemovePlayer(p);
													}}
												/>
											))}
										</View>
									)}
									<AddPlayerGroupRow
										playerOpen={activeDropdown === "player"}
										groupOpen={activeDropdown === "group"}
										showGroup={groups.length > 0}
										onTogglePlayer={() => setActiveDropdown((prev) => (prev === "player" ? null : "player"))}
										onToggleGroup={() => setActiveDropdown((prev) => (prev === "group" ? null : "group"))}
									/>
									{activeDropdown === "player" && (
										<View style={[forms.dropdown, { backgroundColor: theme.backgroundSelected, borderColor: theme.background }]}>
											<View style={{ gap: 4 }}>
												<TextInput allowFontScaling={false}
													ref={playerSearchRef}
													style={[shared.input, innerInput]}
													placeholder="Search or enter new name"
													placeholderTextColor={theme.textSecondary}
													value={playerSearch}
													onChangeText={setPlayerSearch}
													onSubmitEditing={() => {
														pendingScrollAdjust.current = true;
														submitPlayerSearch();
													}}
													maxLength={15}
													returnKeyType="done"
													submitBehavior="submit"
													autoFocus
												/>
												{playerSearchError ? (
													<ThemedText style={forms.inputError}>{playerSearchError}</ThemedText>
												) : null}
											</View>
											{filteredGlobalPlayers.length > 0 && (
												<View style={[forms.dropdownList, { borderTopColor: theme.background }]}>
													{filteredGlobalPlayers.map((gp: { id: string; name: string }, i: number) => (
														<HapticButton
															key={gp.id}
															style={[
																forms.dropdownRow,
																{ borderBottomColor: theme.background },
																i === filteredGlobalPlayers.length - 1 && { borderBottomWidth: 0 },
															]}
															onPress={() => {
																pendingScrollAdjust.current = true;
																addExistingPlayer(gp.id, gp.name);
															}}
														>
															<ThemedText type="default">{gp.name}</ThemedText>
															<ThemedText type="small" style={{ color: theme.accent }}>+ Add</ThemedText>
														</HapticButton>
													))}
												</View>
											)}
											{filteredGlobalPlayers.length === 0 && playerSearch === "" && (
												<ThemedText type="small" themeColor="textSecondary" style={forms.dropdownEmpty}>
													{globalPlayers.length === 0
														? "Type a name to create a player"
														: "All saved players are in this game"}
												</ThemedText>
											)}
											{filteredGlobalPlayers.length === 0 && playerSearch !== "" && (
												<ThemedText type="small" themeColor="textSecondary" style={forms.dropdownEmpty}>
													Press return to add "{playerSearch}"
												</ThemedText>
											)}
										</View>
									)}
									{activeDropdown === "group" && (
										<View style={[forms.dropdown, { backgroundColor: theme.backgroundSelected, borderColor: theme.background }]}>
											{availableGroups.length === 0 ? (
												<ThemedText type="small" themeColor="textSecondary" style={forms.dropdownEmpty}>
													All groups are already in this game
												</ThemedText>
											) : (
												availableGroups.map((g, i) => {
													const memberNames = g.playerIds
														.map((pid) => globalPlayers.find((p) => p.id === pid)?.name)
														.filter(Boolean)
														.join(", ");
													return (
														<HapticButton
															key={g.id}
															style={[
																forms.dropdownRow,
																{ borderBottomColor: theme.background },
																i === availableGroups.length - 1 && { borderBottomWidth: 0 },
															]}
															onPress={() => {
																pendingScrollAdjust.current = true;
																addGroup(g.id);
															}}
														>
															<View style={{ flex: 1 }}>
																<ThemedText type="default">{g.name}</ThemedText>
																{memberNames ? (
																	<ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
																		{memberNames}
																	</ThemedText>
																) : null}
															</View>
															<ThemedText type="small" style={{ color: theme.accent }}>+ Add</ThemedText>
														</HapticButton>
													);
												})
											)}
										</View>
									)}
								</>
							)}
						</SetupCard>
					</View>

					<View style={styles.group}>
						<SectionHeader label="GAME CONDITIONS" />

					{/* Rounds */}
					<SetupCard>
						<ThemedText style={forms.label} themeColor="textSecondary">ROUNDS</ThemedText>
						{finished ? (
							<ThemedText type="default">
								{draft.totalRounds !== undefined ? `${draft.totalRounds} rounds` : "Indefinite"}
							</ThemedText>
						) : (
							<>
								{draft.totalRounds !== undefined && (
									<View style={forms.roundsRow}>
										<HapticButton
											style={[forms.roundsInput, { backgroundColor: theme.backgroundSelected }]}
											onPress={() => setShowRoundNumpad(true)}
										>
											<ThemedText style={{ color: theme.text, fontSize: 16, textAlign: "center" }}>
												{draft.totalRounds}
											</ThemedText>
										</HapticButton>
										<ThemedText type="default">rounds</ThemedText>
									</View>
								)}
								<HapticButton
									style={[forms.toggleRow, { backgroundColor: theme.backgroundSelected }]}
									onPress={() => patch({ totalRounds: draft.totalRounds === undefined ? 10 : undefined })}
								>
									<ThemedText type="default">Endless Mode</ThemedText>
									<View style={[forms.toggle, { backgroundColor: draft.totalRounds === undefined ? theme.accent : theme.backgroundElement }]}>
										<View style={[forms.toggleThumb, draft.totalRounds === undefined && forms.toggleThumbOn]} />
									</View>
								</HapticButton>
							</>
						)}
					</SetupCard>

					{/* Winner */}
					<SetupCard>
						<ThemedText style={forms.label} themeColor="textSecondary">WINNER</ThemedText>
						{finished ? (
							<ThemedText type="default">{game.rankByLowest ? "Lowest score wins" : "Highest score wins"}</ThemedText>
						) : (
							<View style={forms.segmentRow}>
								<HapticButton
									style={[forms.segLeft, { backgroundColor: !draft.rankByLowest ? theme.accent : theme.backgroundSelected }]}
									onPress={() => patch({ rankByLowest: false })}
								>
									<ThemedText type="small" style={{ color: !draft.rankByLowest ? theme.accentText : theme.text }}>Highest score</ThemedText>
								</HapticButton>
								<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
								<HapticButton
									style={[forms.segRight, { backgroundColor: draft.rankByLowest ? theme.accent : theme.backgroundSelected }]}
									onPress={() => patch({ rankByLowest: true })}
								>
									<ThemedText type="small" style={{ color: draft.rankByLowest ? theme.accentText : theme.text }}>Lowest score</ThemedText>
								</HapticButton>
							</View>
						)}
					</SetupCard>

					</View>

					{/* Options */}
					<View style={styles.group}>
						<SectionHeader label="OPTIONS" />

						{/* Dealer */}
						{finished ? (
							<SetupCard>
								<ThemedText style={forms.label} themeColor="textSecondary">DEALER</ThemedText>
								<ThemedText type="default">
									{!dealerEnabled
										? "Disabled"
										: dealerMode === "fixed"
											? `Fixed: ${players.find((p) => p.id === fixedDealerId)?.name ?? "Not set"}`
											: dealerMode === "rotation"
												? "Rotation"
												: "Random each round"}
								</ThemedText>
							</SetupCard>
						) : (
							<OptionCard
								icon="crown"
								title="Dealer"
								subtitle="Track who deals each round"
								value={dealerEnabled}
								onToggle={() => {
									patch({ dealerEnabled: dealerEnabled ? undefined : true });
									setActiveDropdown(null);
								}}
							>
								<Pills
									options={DEALER_PILLS}
									value={dealerMode}
									onChange={(m) => {
										if (m === "random") patch({ dealerMode: "random" });
										else patch({ dealerMode: m, fixedDealerId: fixedDealerId ?? players[0]?.id });
										setActiveDropdown(null);
									}}
								/>
								{(dealerMode === "fixed" || dealerMode === "rotation") && (
									<PersonPicker
										players={players}
										selectedId={fixedDealerId}
										open={activeDropdown === "fixedDealer"}
										onToggleOpen={() => setActiveDropdown((prev) => (prev === "fixedDealer" ? null : "fixedDealer"))}
										onSelect={(pid) => { patch({ fixedDealerId: pid }); setActiveDropdown(null); }}
										placeholder="Pick Dealer"
									/>
								)}
								{dealerHint && <ThemedText style={forms.hint}>{dealerHint}</ThemedText>}
							</OptionCard>
						)}

						{/* Goes first */}
						{finished ? (
							<SetupCard>
								<ThemedText style={forms.label} themeColor="textSecondary">GOES FIRST</ThemedText>
								<ThemedText type="default">
									{!turnsEnabled
										? "Disabled"
										: leftOfDealer
											? "Left of dealer"
											: firstPlayerId
												? `${players.find((p) => p.id === firstPlayerId)?.name ?? "–"} goes first`
												: "Random order"}
								</ThemedText>
							</SetupCard>
						) : (
							<OptionCard
								icon="long-arrow-alt-right"
								title="Goes first"
								subtitle="Track who starts each round"
								value={turnsEnabled}
								onToggle={() => {
									patch({ turnOrder: turnsEnabled ? undefined : players.map((p) => p.id) });
									setActiveDropdown(null);
								}}
							>
								<Pills
									options={firstPlayerPills}
									value={firstPlayerMode}
									onChange={(m) => {
										if (m === "left-of-dealer") patch({ firstPlayerMode: "left-of-dealer", firstPlayerId: undefined });
										else if (m === "rotation") patch({ firstPlayerMode: undefined, firstPlayerId: firstPlayerId ?? players[0]?.id });
										else patch({ firstPlayerMode: undefined, firstPlayerId: undefined });
										setActiveDropdown(null);
									}}
								/>
								{firstPlayerMode === "rotation" && (
									<PersonPicker
										players={players}
										selectedId={firstPlayerId}
										open={activeDropdown === "firstPlayer"}
										onToggleOpen={() => setActiveDropdown((prev) => (prev === "firstPlayer" ? null : "firstPlayer"))}
										onSelect={(pid) => { patch({ firstPlayerMode: undefined, firstPlayerId: pid }); setActiveDropdown(null); }}
										placeholder="Pick Player"
									/>
								)}
								{turnHint && <ThemedText style={forms.hint}>{turnHint}</ThemedText>}
							</OptionCard>
						)}

						{/* Extras */}
						{!finished && (
							<>
								<OptionCard
									icon="dice"
									title="Dice"
									subtitle="Show dice roller in game"
									value={!!draft.extras?.dice}
									onToggle={() => patch({ extras: { ...draft.extras, dice: !draft.extras?.dice } })}
								/>
								<OptionCard
									icon="stopwatch"
									title="Timer"
									subtitle="Show timer in game"
									value={!!draft.extras?.timer}
									onToggle={() => patch({ extras: { ...draft.extras, timer: !draft.extras?.timer } })}
								/>
							</>
						)}
					</View>

					{/* Cancel / Save Changes */}
					{!finished && isDirty && (
						<View style={[styles.actionsContainer, highlightStyle]}>
							<HapticButton
								style={[styles.cancelBtn, { backgroundColor: theme.backgroundElement }]}
								onPress={() => { exitSafely(); resetDraft(); router.back(); }}
							>
								<ThemedText type="small" themeColor="textSecondary">Cancel Changes</ThemedText>
							</HapticButton>
							<HapticButton
								style={[styles.templateBtn, { backgroundColor: theme.accent }]}
								onPress={() => { exitSafely(); saveDraft(); router.back(); }}
							>
								<ThemedText type="smallBold" style={{ color: theme.accentText }}>Save Changes</ThemedText>
							</HapticButton>
						</View>
					)}
				</ScrollView>
				<SafeAreaView edges={["bottom"]} />
			</KeyboardAvoidingView>

			<CellEditModal
				visible={showRoundNumpad}
				title="Number of Rounds"
				initialValue={draft.totalRounds ?? null}
				allowNegative={false}
				minValue={1}
				onSave={(v) => {
					patch({ totalRounds: v && v > 0 ? v : 10 });
					setShowRoundNumpad(false);
				}}
				onCancel={() => setShowRoundNumpad(false)}
			/>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
	group: { gap: Spacing.two },
	actionsContainer: {
		gap: Spacing.two,
		padding: Spacing.one,
	},
	cancelBtn: {
		borderRadius: Spacing.two,
		paddingVertical: Spacing.two,
		alignItems: "center",
	},
	templateBtn: {
		borderRadius: Spacing.two,
		paddingVertical: Spacing.three,
		alignItems: "center",
	},
});
