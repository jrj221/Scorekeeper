import { getDealerHintText, getTurnHintText } from "@/utils/game";
import { consumePendingIcon } from "@/utils/icon-picker-state";
import { FontAwesome5 } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CellEditModal } from "@/components/cell-edit-modal";
import { HapticButton } from "@/components/haptic-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { Player, useGamesContext } from "@/context/games-context";
import { useDraft } from "@/hooks/use-draft";
import { usePlayerSearch } from "@/hooks/use-player-search";
import { useTheme } from "@/hooks/use-theme";
import { useUnsavedChangesScroll } from "@/hooks/use-unsaved-changes-scroll";
import { forms } from "@/styles/forms";
import { shared } from "@/styles/shared";

type Section = "winCondition" | "gameLength" | "players" | "dealer" | "turns" | null;
type ActiveDropdown = "player" | "fixedDealer" | "firstPlayer" | null;

export default function GameInfoScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { getGame, updateGame, globalPlayers } = useGamesContext();
	const theme = useTheme();
	const router = useRouter();
	const TINT = theme.accent;
	const game = getGame(id);

	const { draft, patch, isDirty, save: saveDraft, reset: resetDraft } = useDraft(game, updateGame);
	const scrollRef = useRef<ScrollView>(null);
	const { highlightStyle, exitSafely } = useUnsavedChangesScroll(isDirty, scrollRef);

	// Pick up icon selected in icon-picker screen
	useFocusEffect(
		useCallback(() => {
			const icon = consumePendingIcon();
			if (icon !== undefined) patch({ icon: icon ?? undefined });
		}, []),
	);

	const [editing, setEditing] = useState<Section>(null);
	const [showRoundNumpad, setShowRoundNumpad] = useState(false);
	const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
	const [removePlayerHint, setRemovePlayerHint] = useState(false);

	const toggleEdit = (section: Section) => {
		setEditing((prev) => (prev === section ? null : section));
		setActiveDropdown(null);
		setRemovePlayerHint(false);
	};

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
				onPress: () => patchPlayers(players.filter((pl) => pl.id !== p.id)),
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
	} = usePlayerSearch(players, patchPlayers);

	const dealerEnabled = !!draft.dealerEnabled;
	const dealerMode = draft.dealerMode ?? "rotation";
	const fixedDealerId = draft.fixedDealerId ?? null;
	const turnsEnabled = Array.isArray(draft.turnOrder);
	const leftOfDealer = draft.firstPlayerMode === "left-of-dealer";
	const firstPlayerId = draft.firstPlayerId ?? null;

	const dealerHint = getDealerHintText(
		dealerEnabled,
		dealerMode,
		fixedDealerId ? players.find((p) => p.id === fixedDealerId)?.name : undefined,
	);
	const turnHint = getTurnHintText(
		turnsEnabled,
		leftOfDealer ? "left-of-dealer" : firstPlayerId ? "rotation" : "random",
		firstPlayerId ? players.find((p) => p.id === firstPlayerId)?.name : undefined,
	);
	function EditIcon({ section }: { section: Section }) {
		if (finished) return null;
		return (
			<HapticButton onPress={() => toggleEdit(section)} hitSlop={8}>
				<SymbolView
					name={editing === section ? "xmark.circle" : "pencil"}
					size={15}
					tintColor={editing === section ? theme.textSecondary : TINT}
					style={{ backgroundColor: "transparent" }}
				/>
			</HapticButton>
		);
	}

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "Game Info", headerBackTitle: game.name }} />
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<ScrollView
					ref={scrollRef}
					contentContainerStyle={styles.scroll}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* Game Name & Icon */}
					<View style={[forms.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={forms.labelRow}>
							<ThemedText style={forms.label} themeColor="textSecondary">
								GAME NAME
							</ThemedText>
							<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary">
								{" "}
								(OPTIONAL)
							</ThemedText>
						</View>
						{finished ? (
							<ThemedText type="default">{draft?.name || "Untitled Game"}</ThemedText>
						) : (
							<View style={forms.nameRow}>
								<HapticButton
									style={[forms.iconBtn, { backgroundColor: theme.backgroundSelected }]}
									onPress={() => router.push("/icon-picker")}
									activeOpacity={0.7}
								>
									<FontAwesome5
										name={(draft?.icon ?? "users") as any}
										size={20}
										color={theme.textSecondary}
									/>
								</HapticButton>
								<TextInput
									style={[
										shared.input,
										{ backgroundColor: theme.backgroundSelected, color: theme.text, flex: 1 },
									]}
									placeholder="Untitled Game"
									placeholderTextColor={theme.textSecondary}
									value={draft?.name ?? ""}
									onChangeText={(v) => patch({ name: v })}
									maxLength={30}
									returnKeyType="done"
								/>
							</View>
						)}
					</View>

					{/* Win Condition */}
					<View style={[forms.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={forms.cardHeader}>
							<ThemedText style={forms.label} themeColor="textSecondary">
								WIN CONDITION
							</ThemedText>
							<EditIcon section="winCondition" />
						</View>
						{editing === "winCondition" ? (
							<View style={forms.segmentRow}>
								<HapticButton
									style={[
										forms.segLeft,
										{ backgroundColor: !game.rankByLowest ? TINT : theme.backgroundSelected },
									]}
									onPress={() => patch({ rankByLowest: false })}
								>
									<ThemedText
										type="small"
										style={{ color: !game.rankByLowest ? "#fff" : theme.text }}
									>
										Highest score
									</ThemedText>
								</HapticButton>
								<HapticButton
									style={[
										forms.segRight,
										{ backgroundColor: game.rankByLowest ? TINT : theme.backgroundSelected },
									]}
									onPress={() => patch({ rankByLowest: true })}
								>
									<ThemedText type="small" style={{ color: game.rankByLowest ? "#fff" : theme.text }}>
										Lowest score
									</ThemedText>
								</HapticButton>
							</View>
						) : (
							<ThemedText type="default">
								{game.rankByLowest ? "Lowest score wins" : "Highest score wins"}
							</ThemedText>
						)}
					</View>

					{/* Game Length */}
					<View style={[forms.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={forms.cardHeader}>
							<ThemedText style={forms.label} themeColor="textSecondary">
								GAME LENGTH
							</ThemedText>
							<EditIcon section="gameLength" />
						</View>
						{editing === "gameLength" ? (
							<View style={{ gap: Spacing.two }}>
								<View style={forms.segmentRow}>
									<HapticButton
										style={[
											forms.segLeft,
											{
												backgroundColor:
													draft?.totalRounds === undefined ? TINT : theme.backgroundSelected,
											},
										]}
										onPress={() => patch({ totalRounds: undefined })}
									>
										<ThemedText
											type="small"
											style={{ color: draft?.totalRounds === undefined ? "#fff" : theme.text }}
										>
											Indefinite
										</ThemedText>
									</HapticButton>
									<HapticButton
										style={[
											forms.segRight,
											{
												backgroundColor:
													draft?.totalRounds !== undefined ? TINT : theme.backgroundSelected,
											},
										]}
										onPress={() => {
											if (draft?.totalRounds === undefined) patch({ totalRounds: 10 });
											else setShowRoundNumpad(true);
										}}
									>
										<ThemedText
											type="small"
											style={{ color: draft?.totalRounds !== undefined ? "#fff" : theme.text }}
										>
											Set number
										</ThemedText>
									</HapticButton>
								</View>
								{draft?.totalRounds !== undefined && (
									<HapticButton
										style={[
											shared.input,
											{ backgroundColor: theme.backgroundSelected, justifyContent: "center" },
										]}
										onPress={() => setShowRoundNumpad(true)}
									>
										<ThemedText style={{ color: theme.text, fontSize: 16 }}>
											{draft?.totalRounds}
										</ThemedText>
									</HapticButton>
								)}
							</View>
						) : (
							<ThemedText type="default">
								{draft?.totalRounds !== undefined ? `${draft.totalRounds} rounds` : "Indefinite"}
							</ThemedText>
						)}
					</View>

					{/* Players */}
					<View style={[forms.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={forms.cardHeader}>
							<ThemedText style={forms.label} themeColor="textSecondary">
								PLAYERS
							</ThemedText>
							<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
								<ThemedText style={forms.label} themeColor="textSecondary">
									{players.length}
								</ThemedText>
								<EditIcon section="players" />
							</View>
						</View>
						{editing === "players" ? (
							<View style={{ gap: Spacing.two }}>
								{removePlayerHint && (
									<ThemedText style={styles.hintError}>
										A game requires at least one player.
									</ThemedText>
								)}
								<View style={forms.chipRow}>
									{players.map((p) => (
										<HapticButton
											key={p.id}
											style={[forms.chip, { backgroundColor: theme.backgroundSelected }]}
											onPress={() => {
												setRemovePlayerHint(false);
												handleRemovePlayer(p);
											}}
										>
											<ThemedText type="small">{p.name}</ThemedText>
											<ThemedText type="small" themeColor="textSecondary">
												{" "}
												×
											</ThemedText>
										</HapticButton>
									))}
								</View>
								<HapticButton
									style={[
										forms.dropdownTrigger,
										{ backgroundColor: theme.backgroundSelected },
										activeDropdown === "player" && { opacity: 0.7 },
									]}
									onPress={() => setActiveDropdown((prev) => (prev === "player" ? null : "player"))}
								>
									<ThemedText type="small" style={{ color: TINT }}>
										Add Player
									</ThemedText>
									<ThemedText style={[forms.chevron, { color: theme.accent }]}>
										{activeDropdown === "player" ? "▴" : "▾"}
									</ThemedText>
								</HapticButton>
								{activeDropdown === "player" && (
									<View
										style={[
											forms.dropdown,
											{
												backgroundColor: theme.backgroundSelected,
												borderColor: theme.background,
											},
										]}
									>
										<View style={{ gap: 4 }}>
											<TextInput
												ref={playerSearchRef}
												style={[
													shared.input,
													{ backgroundColor: theme.background, color: theme.text },
												]}
												placeholder="Search or enter new name"
												placeholderTextColor={theme.textSecondary}
												value={playerSearch}
												onChangeText={setPlayerSearch}
												onSubmitEditing={submitPlayerSearch}
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
												{filteredGlobalPlayers.map(
													(gp: { id: string; name: string }, i: number) => (
														<HapticButton
															key={gp.id}
															style={[
																forms.dropdownRow,
																{ borderBottomColor: theme.background },
																i === filteredGlobalPlayers.length - 1 && {
																	borderBottomWidth: 0,
																},
															]}
															onPress={() => addExistingPlayer(gp.id, gp.name)}
														>
															<ThemedText type="default">{gp.name}</ThemedText>
															<ThemedText type="small" style={{ color: TINT }}>
																+ Add
															</ThemedText>
														</HapticButton>
													),
												)}
											</View>
										)}
										{filteredGlobalPlayers.length === 0 && playerSearch === "" && (
											<ThemedText
												type="small"
												themeColor="textSecondary"
												style={forms.dropdownEmpty}
											>
												{globalPlayers.length === 0
													? "Type a name to create a player"
													: "All saved players are in this game"}
											</ThemedText>
										)}
										{filteredGlobalPlayers.length === 0 && playerSearch !== "" && (
											<ThemedText
												type="small"
												themeColor="textSecondary"
												style={forms.dropdownEmpty}
											>
												Press return to add "{playerSearch}"
											</ThemedText>
										)}
									</View>
								)}
							</View>
						) : (
							<ThemedText type="default">{players.map((p) => p.name).join(", ")}</ThemedText>
						)}
					</View>

					{/* Dealer */}
					<View style={[forms.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={forms.cardHeader}>
							<ThemedText style={forms.label} themeColor="textSecondary">
								DEALER
							</ThemedText>
							<EditIcon section="dealer" />
						</View>
						{editing === "dealer" ? (
							<View style={{ gap: Spacing.two }}>
								<HapticButton
									style={[forms.toggleRow, { backgroundColor: theme.backgroundSelected }]}
									onPress={() => {
										patch({ dealerEnabled: dealerEnabled ? undefined : true });
										setActiveDropdown(null);
									}}
								>
									<ThemedText type="default">Track dealer</ThemedText>
									<View
										style={[
											forms.toggle,
											{ backgroundColor: dealerEnabled ? TINT : theme.backgroundElement },
										]}
									>
										<View style={[forms.toggleThumb, dealerEnabled && forms.toggleThumbOn]} />
									</View>
								</HapticButton>
								{dealerEnabled && (
									<>
										<ThemedText style={[forms.subLabel]} themeColor="textSecondary">
											DEALER IS
										</ThemedText>
										<View style={forms.segmentRow}>
											<HapticButton
												style={[
													forms.segLeft,
													{
														backgroundColor:
															dealerMode === "rotation" ? TINT : theme.backgroundSelected,
													},
												]}
												onPress={() =>
													patch({
														dealerMode: "rotation",
														fixedDealerId: fixedDealerId ?? players[0]?.id,
													})
												}
											>
												<ThemedText
													type="small"
													style={{ color: dealerMode === "rotation" ? "#fff" : theme.text }}
												>
													Rotation
												</ThemedText>
											</HapticButton>
											<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
											<HapticButton
												style={[
													forms.segMid,
													{
														backgroundColor:
															dealerMode === "random" ? TINT : theme.backgroundSelected,
													},
												]}
												onPress={() => patch({ dealerMode: "random" })}
											>
												<ThemedText
													type="small"
													style={{ color: dealerMode === "random" ? "#fff" : theme.text }}
												>
													Random
												</ThemedText>
											</HapticButton>
											<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
											<HapticButton
												style={[
													forms.segRight,
													{
														backgroundColor:
															dealerMode === "fixed" ? TINT : theme.backgroundSelected,
													},
												]}
												onPress={() =>
													patch({
														dealerMode: "fixed",
														fixedDealerId: fixedDealerId ?? players[0]?.id,
													})
												}
											>
												<ThemedText
													type="small"
													style={{ color: dealerMode === "fixed" ? "#fff" : theme.text }}
												>
													Fixed
												</ThemedText>
											</HapticButton>
										</View>
										{(dealerMode === "fixed" || dealerMode === "rotation") && (
											<>
												<HapticButton
													style={[
														forms.dropdownTrigger,
														{ backgroundColor: theme.backgroundSelected },
													]}
													onPress={() =>
														setActiveDropdown((prev) =>
															prev === "fixedDealer" ? null : "fixedDealer",
														)
													}
												>
													<ThemedText type="small" style={{ color: TINT }}>
														{fixedDealerId
															? (players.find((p) => p.id === fixedDealerId)?.name ??
																"Pick Dealer")
															: "Pick Dealer"}
													</ThemedText>
													<ThemedText style={[forms.chevron, { color: theme.accent }]}>
														{activeDropdown === "fixedDealer" ? "▴" : "▾"}
													</ThemedText>
												</HapticButton>
												{activeDropdown === "fixedDealer" && (
													<View
														style={[
															forms.dropdown,
															{
																backgroundColor: theme.backgroundSelected,
																borderColor: theme.background,
															},
														]}
													>
														{players.map((p, i) => (
															<HapticButton
																key={p.id}
																style={[
																	forms.dropdownRow,
																	{ borderBottomColor: theme.background },
																	i === players.length - 1 && {
																		borderBottomWidth: 0,
																	},
																]}
																onPress={() => {
																	patch({ fixedDealerId: p.id });
																	setActiveDropdown(null);
																}}
															>
																<ThemedText type="default">{p.name}</ThemedText>
																{fixedDealerId === p.id && (
																	<ThemedText type="small" style={{ color: TINT }}>
																		✓
																	</ThemedText>
																)}
															</HapticButton>
														))}
													</View>
												)}
											</>
										)}
										{dealerHint && <ThemedText style={forms.hint}>{dealerHint}</ThemedText>}
									</>
								)}
							</View>
						) : (
							<ThemedText type="default">
								{!dealerEnabled
									? "Disabled"
									: dealerMode === "fixed"
										? `Fixed: ${players.find((p) => p.id === fixedDealerId)?.name ?? "Not set"}`
										: "Random each round"}
							</ThemedText>
						)}
					</View>

					{/* Turn Order */}
					<View style={[forms.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={forms.cardHeader}>
							<ThemedText style={forms.label} themeColor="textSecondary">
								WHO GOES FIRST
							</ThemedText>
							<EditIcon section="turns" />
						</View>
						{editing === "turns" ? (
							<View style={{ gap: Spacing.two }}>
								<HapticButton
									style={[forms.toggleRow, { backgroundColor: theme.backgroundSelected }]}
									onPress={() => {
										patch({ turnOrder: turnsEnabled ? undefined : players.map((p) => p.id) });
										setActiveDropdown(null);
									}}
								>
									<ThemedText type="default">Track who goes first</ThemedText>
									<View
										style={[
											forms.toggle,
											{ backgroundColor: turnsEnabled ? TINT : theme.backgroundElement },
										]}
									>
										<View style={[forms.toggleThumb, turnsEnabled && forms.toggleThumbOn]} />
									</View>
								</HapticButton>
								{turnsEnabled && (
									<>
										<ThemedText style={forms.subLabel} themeColor="textSecondary">
											FIRST PLAYER EACH ROUND IS
										</ThemedText>
										<View style={forms.segmentRow}>
											{dealerEnabled && (
												<>
													<HapticButton
														style={[
															forms.segLeft,
															{
																backgroundColor: leftOfDealer
																	? TINT
																	: theme.backgroundSelected,
															},
														]}
														onPress={() =>
															patch({
																firstPlayerMode: "left-of-dealer",
																firstPlayerId: undefined,
															})
														}
													>
														<ThemedText
															type="small"
															style={{ color: leftOfDealer ? "#fff" : theme.text }}
														>
															Left of Dealer
														</ThemedText>
													</HapticButton>
													<View
														style={[
															forms.segDivider,
															{ backgroundColor: theme.background },
														]}
													/>
												</>
											)}
											<HapticButton
												style={[
													dealerEnabled ? forms.segMid : forms.segLeft,
													{
														backgroundColor:
															!leftOfDealer && firstPlayerId
																? TINT
																: theme.backgroundSelected,
													},
												]}
												onPress={() => {
													if (!firstPlayerId)
														patch({
															firstPlayerMode: undefined,
															firstPlayerId: players[0]?.id,
														});
													else
														setActiveDropdown((prev) =>
															prev === "firstPlayer" ? null : "firstPlayer",
														);
												}}
											>
												<ThemedText
													type="small"
													style={{
														color: !leftOfDealer && firstPlayerId ? "#fff" : theme.text,
													}}
												>
													Rotation
												</ThemedText>
											</HapticButton>
											<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
											<HapticButton
												style={[
													forms.segRight,
													{
														backgroundColor:
															!leftOfDealer && !firstPlayerId
																? TINT
																: theme.backgroundSelected,
													},
												]}
												onPress={() =>
													patch({ firstPlayerMode: undefined, firstPlayerId: undefined })
												}
											>
												<ThemedText
													type="small"
													style={{
														color: !leftOfDealer && !firstPlayerId ? "#fff" : theme.text,
													}}
												>
													Random
												</ThemedText>
											</HapticButton>
										</View>
										{!leftOfDealer && firstPlayerId && (
											<>
												<HapticButton
													style={[
														forms.dropdownTrigger,
														{ backgroundColor: theme.backgroundSelected },
													]}
													onPress={() =>
														setActiveDropdown((prev) =>
															prev === "firstPlayer" ? null : "firstPlayer",
														)
													}
												>
													<ThemedText type="small" style={{ color: TINT }}>
														{players.find((p) => p.id === firstPlayerId)?.name ??
															"Pick Player"}
													</ThemedText>
													<ThemedText style={[forms.chevron, { color: theme.accent }]}>
														{activeDropdown === "firstPlayer" ? "▴" : "▾"}
													</ThemedText>
												</HapticButton>
												{activeDropdown === "firstPlayer" && (
													<View
														style={[
															forms.dropdown,
															{
																backgroundColor: theme.backgroundSelected,
																borderColor: theme.background,
															},
														]}
													>
														{players.map((p, i) => (
															<HapticButton
																key={p.id}
																style={[
																	forms.dropdownRow,
																	{ borderBottomColor: theme.background },
																	i === players.length - 1 && {
																		borderBottomWidth: 0,
																	},
																]}
																onPress={() => {
																	patch({
																		firstPlayerMode: undefined,
																		firstPlayerId: p.id,
																	});
																	setActiveDropdown(null);
																}}
															>
																<ThemedText type="default">{p.name}</ThemedText>
																{firstPlayerId === p.id && (
																	<ThemedText type="small" style={{ color: TINT }}>
																		✓
																	</ThemedText>
																)}
															</HapticButton>
														))}
													</View>
												)}
											</>
										)}
									</>
								)}
								{turnHint && <ThemedText style={forms.hint}>{turnHint}</ThemedText>}
							</View>
						) : (
							<ThemedText type="default">
								{!turnsEnabled
									? "Disabled"
									: leftOfDealer
										? "Left of dealer"
										: firstPlayerId
											? `${players.find((p) => p.id === firstPlayerId)?.name ?? "–"} goes first`
											: "Random order"}
							</ThemedText>
						)}
					</View>

					{/* Extras */}
					{!finished && (
						<View style={[forms.card, { backgroundColor: theme.backgroundElement }]}>
							<ThemedText style={forms.label} themeColor="textSecondary">EXTRAS</ThemedText>
							<HapticButton
								style={[forms.toggleRow, { backgroundColor: theme.backgroundSelected }]}
								onPress={() => patch({ extras: { ...draft?.extras, dice: !draft?.extras?.dice } })}
							>
								<ThemedText type="default">🎲  Dice</ThemedText>
								<View style={[forms.toggle, { backgroundColor: draft?.extras?.dice ? TINT : theme.backgroundElement }]}>
									<View style={[forms.toggleThumb, draft?.extras?.dice && forms.toggleThumbOn]} />
								</View>
							</HapticButton>
							<HapticButton
								style={[forms.toggleRow, { backgroundColor: theme.backgroundSelected }]}
								onPress={() => patch({ extras: { ...draft?.extras, timer: !draft?.extras?.timer } })}
							>
								<ThemedText type="default">⏱  Timer</ThemedText>
								<View style={[forms.toggle, { backgroundColor: draft?.extras?.timer ? TINT : theme.backgroundElement }]}>
									<View style={[forms.toggleThumb, draft?.extras?.timer && forms.toggleThumbOn]} />
								</View>
							</HapticButton>
						</View>
					)}

					{/* Description */}
					{game.description ? (
						<View style={[forms.card, { backgroundColor: theme.backgroundElement }]}>
							<ThemedText style={forms.label} themeColor="textSecondary">
								DESCRIPTION
							</ThemedText>
							<ThemedText type="default">{game.description}</ThemedText>
						</View>
					) : null}

					{/* Cancel / Save Changes */}
					{!finished && isDirty && (
						<View style={[styles.actionsContainer, highlightStyle]}>
							<HapticButton
								style={[styles.cancelBtn, { backgroundColor: theme.backgroundElement }]}
								onPress={() => { exitSafely(); resetDraft(); setEditing(null); router.back(); }}
							>
								<ThemedText type="small" themeColor="textSecondary">Cancel Changes</ThemedText>
							</HapticButton>
							<HapticButton
								style={[styles.templateBtn, { backgroundColor: TINT }]}
								onPress={() => { exitSafely(); saveDraft(); setEditing(null); router.back(); }}
							>
								<ThemedText type="smallBold" style={{ color: "#fff" }}>Save Changes</ThemedText>
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
	hintError: { fontSize: 12, color: '#C05050' },
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
	iconPreviewRow: { flexDirection: "row", alignItems: "center", gap: Spacing.three },
	iconPreview: { width: 52, height: 52, borderRadius: Spacing.two, alignItems: "center", justifyContent: "center" },
	iconBtn: { borderRadius: Spacing.two, width: 40, alignItems: "center", justifyContent: "center" },
});
