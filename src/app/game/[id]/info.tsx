import { Stack, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CellEditModal } from "@/components/cell-edit-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { Player, useGamesContext } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";

const TINT = "#0077B6";
type Section = "winCondition" | "gameLength" | "players" | "dealer" | "turns" | null;
type ActiveDropdown = "player" | "fixedDealer" | "firstPlayer" | null;

export default function GameInfoScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { getGame, updateGame, globalPlayers, addGlobalPlayer } = useGamesContext();
	const theme = useTheme();
	const game = getGame(id);

	// Local draft — changes only persist when user presses Save Changes
	const [draft, setDraft] = useState(game);
	const [isDirty, setIsDirty] = useState(false);

	const [editing, setEditing] = useState<Section>(null);
	const [showRoundNumpad, setShowRoundNumpad] = useState(false);
	const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
	const [playerSearch, setPlayerSearch] = useState("");
	const [playerSearchError, setPlayerSearchError] = useState("");
	const [removePlayerHint, setRemovePlayerHint] = useState(false);
	const playerSearchRef = useRef<TextInput>(null);

	const toggleEdit = (section: Section) => {
		setEditing((prev) => (prev === section ? null : section));
		setActiveDropdown(null);
		setPlayerSearch("");
		setPlayerSearchError("");
		setRemovePlayerHint(false);
	};

	const patch = (fields: object) => {
		setDraft((prev) => (prev ? { ...prev, ...(fields as any) } : prev));
		setIsDirty(true);
	};

	const patchPlayers = (next: Player[]) => {
		if (!draft) return;
		const origIds = new Set(draft.players.map((p) => p.id));
		const newIds = new Set(next.map((p) => p.id));
		let rounds = draft.rounds.map((r) => {
			const copy = { ...r };
			for (const pid of origIds) if (!newIds.has(pid)) delete copy[pid];
			return copy;
		});
		for (const p of next) {
			if (!origIds.has(p.id)) {
				rounds = rounds.map((r) => {
					const hasExisting = next.some((pl) => origIds.has(pl.id) && r[pl.id] !== undefined);
					return hasExisting ? { ...r, [p.id]: 0 } : r;
				});
			}
		}
		const existingOrder = draft.turnOrder ?? draft.players.map((p) => p.id);
		const turnOrder = [
			...existingOrder.filter((pid) => newIds.has(pid)),
			...next.filter((p) => !origIds.has(p.id)).map((p) => p.id),
		];
		const firstPlayerId = draft.firstPlayerId && newIds.has(draft.firstPlayerId) ? draft.firstPlayerId : undefined;
		setDraft((prev) => (prev ? { ...prev, players: next, rounds, turnOrder, firstPlayerId } : prev));
		setIsDirty(true);
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

	const filteredGlobalPlayers = globalPlayers.filter(
		(gp) =>
			!players.some((p) => p.id === gp.id) &&
			(playerSearch === "" || gp.name.toLowerCase().includes(playerSearch.toLowerCase())),
	);

	const addExistingPlayer = (pid: string, name: string) => {
		if (players.some((p) => p.id === pid)) return;
		patchPlayers([...players, { id: pid, name }]);
		setPlayerSearch("");
		setPlayerSearchError("");
	};

	const submitPlayerSearch = () => {
		const trimmed = playerSearch.trim();
		if (!trimmed) return;
		const match = globalPlayers.find(
			(gp) => gp.name.toLowerCase() === trimmed.toLowerCase() && !players.some((p) => p.id === gp.id),
		);
		if (match) {
			addExistingPlayer(match.id, match.name);
			return;
		}
		if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
			setPlayerSearchError(`"${trimmed}" is already in this game`);
			return;
		}
		setPlayerSearchError("");
		const global = addGlobalPlayer(trimmed);
		const player = global ?? { id: `p_${Date.now()}`, name: trimmed };
		addExistingPlayer(player.id, player.name);
		playerSearchRef.current?.focus();
	};

	const dealerEnabled = !!draft.dealerEnabled;
	const dealerMode = draft.dealerMode ?? "rotation";
	const fixedDealerId = draft.fixedDealerId ?? null;
	const turnsEnabled = Array.isArray(draft.turnOrder);
	const leftOfDealer = draft.firstPlayerMode === "left-of-dealer";
	const firstPlayerId = draft.firstPlayerId ?? null;

	const dealerHint = dealerEnabled
		? dealerMode === "random"
			? "The dealer will be randomly determined each round."
			: dealerMode === "rotation"
				? fixedDealerId
					? `${players.find((p) => p.id === fixedDealerId)?.name ?? "The selected player"} deals first, then it rotates to the next player each round.`
					: "Dealing rotates through all players each round."
				: fixedDealerId
					? `${players.find((p) => p.id === fixedDealerId)?.name ?? "The selected player"} will deal every round.`
					: "The same player will deal every round."
		: null;

	const turnHint = turnsEnabled
		? leftOfDealer
			? "The player to the left of the dealer goes first each round."
			: !firstPlayerId
				? "The first player will be randomly determined each round."
				: `${players.find((p) => p.id === firstPlayerId)?.name ?? "The selected player"} goes first in Round 1, then it rotates to the next player each round.`
		: null;

	function EditIcon({ section }: { section: Section }) {
		if (finished) return null;
		return (
			<TouchableOpacity onPress={() => toggleEdit(section)} hitSlop={8}>
				<SymbolView
					name={editing === section ? "xmark.circle" : "pencil"}
					size={15}
					tintColor={editing === section ? theme.textSecondary : TINT}
					style={{ backgroundColor: "transparent" }}
				/>
			</TouchableOpacity>
		);
	}

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "Game Info", headerBackTitle: game.name }} />
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<ScrollView
					contentContainerStyle={styles.scroll}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* Win Condition */}
					<View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={styles.cardHeader}>
							<ThemedText style={styles.label} themeColor="textSecondary">
								WIN CONDITION
							</ThemedText>
							<EditIcon section="winCondition" />
						</View>
						{editing === "winCondition" ? (
							<View style={styles.segmentRow}>
								<TouchableOpacity
									style={[
										styles.segLeft,
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
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.segRight,
										{ backgroundColor: game.rankByLowest ? TINT : theme.backgroundSelected },
									]}
									onPress={() => patch({ rankByLowest: true })}
								>
									<ThemedText type="small" style={{ color: game.rankByLowest ? "#fff" : theme.text }}>
										Lowest score
									</ThemedText>
								</TouchableOpacity>
							</View>
						) : (
							<ThemedText type="default">
								{game.rankByLowest ? "Lowest score wins" : "Highest score wins"}
							</ThemedText>
						)}
					</View>

					{/* Game Length */}
					<View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={styles.cardHeader}>
							<ThemedText style={styles.label} themeColor="textSecondary">
								GAME LENGTH
							</ThemedText>
							<EditIcon section="gameLength" />
						</View>
						{editing === "gameLength" ? (
							<View style={{ gap: Spacing.two }}>
								<View style={styles.segmentRow}>
									<TouchableOpacity
										style={[
											styles.segLeft,
											{
												backgroundColor:
													game.totalRounds === undefined ? TINT : theme.backgroundSelected,
											},
										]}
										onPress={() => patch({ totalRounds: undefined })}
									>
										<ThemedText
											type="small"
											style={{ color: game.totalRounds === undefined ? "#fff" : theme.text }}
										>
											Indefinite
										</ThemedText>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.segRight,
											{
												backgroundColor:
													game.totalRounds !== undefined ? TINT : theme.backgroundSelected,
											},
										]}
										onPress={() => {
											if (game.totalRounds === undefined) patch({ totalRounds: 10 });
											else setShowRoundNumpad(true);
										}}
									>
										<ThemedText
											type="small"
											style={{ color: game.totalRounds !== undefined ? "#fff" : theme.text }}
										>
											Set number
										</ThemedText>
									</TouchableOpacity>
								</View>
								{game.totalRounds !== undefined && (
									<TouchableOpacity
										style={[
											shared.input,
											{ backgroundColor: theme.backgroundSelected, justifyContent: "center" },
										]}
										onPress={() => setShowRoundNumpad(true)}
									>
										<ThemedText style={{ color: theme.text, fontSize: 16 }}>
											{game.totalRounds}
										</ThemedText>
									</TouchableOpacity>
								)}
							</View>
						) : (
							<ThemedText type="default">
								{game.totalRounds !== undefined ? `${game.totalRounds} rounds` : "Indefinite"}
							</ThemedText>
						)}
					</View>

					{/* Players */}
					<View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={styles.cardHeader}>
							<ThemedText style={styles.label} themeColor="textSecondary">
								PLAYERS
							</ThemedText>
							<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
								<ThemedText style={styles.label} themeColor="textSecondary">
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
								<View style={styles.chipRow}>
									{players.map((p) => (
										<TouchableOpacity
											key={p.id}
											style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}
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
										</TouchableOpacity>
									))}
								</View>
								<TouchableOpacity
									style={[
										styles.dropdownTrigger,
										{ backgroundColor: theme.backgroundSelected },
										activeDropdown === "player" && { opacity: 0.7 },
									]}
									onPress={() => setActiveDropdown((prev) => (prev === "player" ? null : "player"))}
								>
									<ThemedText type="small" style={{ color: TINT }}>
										Add Player
									</ThemedText>
									<ThemedText style={styles.chevron}>
										{activeDropdown === "player" ? "▴" : "▾"}
									</ThemedText>
								</TouchableOpacity>
								{activeDropdown === "player" && (
									<View
										style={[
											styles.dropdown,
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
												onChangeText={(v) => {
													setPlayerSearch(v);
													setPlayerSearchError("");
												}}
												onSubmitEditing={submitPlayerSearch}
												maxLength={15}
												returnKeyType="done"
												submitBehavior="submit"
												autoFocus
											/>
											{playerSearchError ? (
												<ThemedText style={styles.inputError}>{playerSearchError}</ThemedText>
											) : null}
										</View>
										{filteredGlobalPlayers.length > 0 && (
											<View style={[styles.dropdownList, { borderTopColor: theme.background }]}>
												{filteredGlobalPlayers.map((gp, i) => (
													<TouchableOpacity
														key={gp.id}
														style={[
															styles.dropdownRow,
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
													</TouchableOpacity>
												))}
											</View>
										)}
										{filteredGlobalPlayers.length === 0 && playerSearch === "" && (
											<ThemedText
												type="small"
												themeColor="textSecondary"
												style={styles.dropdownEmpty}
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
												style={styles.dropdownEmpty}
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
					<View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={styles.cardHeader}>
							<ThemedText style={styles.label} themeColor="textSecondary">
								DEALER
							</ThemedText>
							<EditIcon section="dealer" />
						</View>
						{editing === "dealer" ? (
							<View style={{ gap: Spacing.two }}>
								<TouchableOpacity
									style={[styles.toggleRow, { backgroundColor: theme.backgroundSelected }]}
									onPress={() => {
										patch({ dealerEnabled: dealerEnabled ? undefined : true });
										setActiveDropdown(null);
									}}
								>
									<ThemedText type="default">Track dealer</ThemedText>
									<View
										style={[
											styles.toggle,
											{ backgroundColor: dealerEnabled ? TINT : theme.backgroundElement },
										]}
									>
										<View style={[styles.toggleThumb, dealerEnabled && styles.toggleThumbOn]} />
									</View>
								</TouchableOpacity>
								{dealerEnabled && (
									<>
										<ThemedText style={[styles.subLabel]} themeColor="textSecondary">
											DEALER IS
										</ThemedText>
										<View style={styles.segmentRow}>
											<TouchableOpacity
												style={[
													styles.segLeft,
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
											</TouchableOpacity>
											<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
											<TouchableOpacity
												style={[
													styles.segMid,
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
											</TouchableOpacity>
											<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
											<TouchableOpacity
												style={[
													styles.segRight,
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
											</TouchableOpacity>
										</View>
										{(dealerMode === "fixed" || dealerMode === "rotation") && (
											<>
												<TouchableOpacity
													style={[
														styles.dropdownTrigger,
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
													<ThemedText style={styles.chevron}>
														{activeDropdown === "fixedDealer" ? "▴" : "▾"}
													</ThemedText>
												</TouchableOpacity>
												{activeDropdown === "fixedDealer" && (
													<View
														style={[
															styles.dropdown,
															{
																backgroundColor: theme.backgroundSelected,
																borderColor: theme.background,
															},
														]}
													>
														{players.map((p, i) => (
															<TouchableOpacity
																key={p.id}
																style={[
																	styles.dropdownRow,
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
															</TouchableOpacity>
														))}
													</View>
												)}
											</>
										)}
										{dealerHint && <ThemedText style={styles.hint}>{dealerHint}</ThemedText>}
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
					<View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={styles.cardHeader}>
							<ThemedText style={styles.label} themeColor="textSecondary">
								WHO GOES FIRST
							</ThemedText>
							<EditIcon section="turns" />
						</View>
						{editing === "turns" ? (
							<View style={{ gap: Spacing.two }}>
								<TouchableOpacity
									style={[styles.toggleRow, { backgroundColor: theme.backgroundSelected }]}
									onPress={() => {
										patch({ turnOrder: turnsEnabled ? undefined : players.map((p) => p.id) });
										setActiveDropdown(null);
									}}
								>
									<ThemedText type="default">Track who goes first</ThemedText>
									<View
										style={[
											styles.toggle,
											{ backgroundColor: turnsEnabled ? TINT : theme.backgroundElement },
										]}
									>
										<View style={[styles.toggleThumb, turnsEnabled && styles.toggleThumbOn]} />
									</View>
								</TouchableOpacity>
								{turnsEnabled && (
									<>
										<ThemedText style={styles.subLabel} themeColor="textSecondary">
											FIRST PLAYER EACH ROUND IS
										</ThemedText>
										<View style={styles.segmentRow}>
											{dealerEnabled && (
												<>
													<TouchableOpacity
														style={[
															styles.segLeft,
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
													</TouchableOpacity>
													<View
														style={[
															styles.segDivider,
															{ backgroundColor: theme.background },
														]}
													/>
												</>
											)}
											<TouchableOpacity
												style={[
													dealerEnabled ? styles.segMid : styles.segLeft,
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
											</TouchableOpacity>
											<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
											<TouchableOpacity
												style={[
													styles.segRight,
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
											</TouchableOpacity>
										</View>
										{!leftOfDealer && firstPlayerId && (
											<>
												<TouchableOpacity
													style={[
														styles.dropdownTrigger,
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
													<ThemedText style={styles.chevron}>
														{activeDropdown === "firstPlayer" ? "▴" : "▾"}
													</ThemedText>
												</TouchableOpacity>
												{activeDropdown === "firstPlayer" && (
													<View
														style={[
															styles.dropdown,
															{
																backgroundColor: theme.backgroundSelected,
																borderColor: theme.background,
															},
														]}
													>
														{players.map((p, i) => (
															<TouchableOpacity
																key={p.id}
																style={[
																	styles.dropdownRow,
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
															</TouchableOpacity>
														))}
													</View>
												)}
											</>
										)}
									</>
								)}
								{turnHint && <ThemedText style={styles.hint}>{turnHint}</ThemedText>}
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

					{/* Description */}
					{game.description ? (
						<View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
							<ThemedText style={styles.label} themeColor="textSecondary">
								DESCRIPTION
							</ThemedText>
							<ThemedText type="default">{game.description}</ThemedText>
						</View>
					) : null}

					{/* Save Changes */}
					{!finished && isDirty && (
						<TouchableOpacity
							style={[styles.templateBtn, { backgroundColor: TINT }]}
							onPress={() => {
								updateGame(draft);
								setIsDirty(false);
								setEditing(null);
							}}
						>
							<ThemedText type="smallBold" style={{ color: "#fff" }}>
								Save Changes
							</ThemedText>
						</TouchableOpacity>
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
	card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
	cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	label: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8 },
	subLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, opacity: 0.7 },
	hintError: { fontSize: 12, color: "#C05050" },
	segmentRow: { flexDirection: "row" },
	segDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
	segLeft: {
		flex: 1,
		alignItems: "center",
		paddingVertical: Spacing.two,
		borderTopLeftRadius: Spacing.two,
		borderBottomLeftRadius: Spacing.two,
	},
	segMid: { flex: 1, alignItems: "center", paddingVertical: Spacing.two },
	segRight: {
		flex: 1,
		alignItems: "center",
		paddingVertical: Spacing.two,
		borderTopRightRadius: Spacing.two,
		borderBottomRightRadius: Spacing.two,
	},
	chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
	chip: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: Spacing.one,
	},
	dropdownTrigger: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: Spacing.two,
		paddingVertical: Spacing.two,
		paddingHorizontal: Spacing.three,
		gap: Spacing.one,
	},
	chevron: { fontSize: 18, color: TINT, lineHeight: 22 },
	dropdown: {
		borderRadius: Spacing.two,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: "hidden",
		padding: Spacing.two,
		gap: Spacing.two,
	},
	dropdownList: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.one },
	dropdownRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: Spacing.two,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: Spacing.two,
	},
	dropdownEmpty: { textAlign: "center", opacity: 0.6, paddingVertical: Spacing.one },
	inputError: { fontSize: 12, color: "#C05050" },
	toggleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two,
	},
	toggle: { width: 44, height: 26, borderRadius: 13, justifyContent: "center", paddingHorizontal: 3 },
	toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
	toggleThumbOn: { alignSelf: "flex-end" },
	templateBtn: {
		borderRadius: Spacing.two,
		borderWidth: StyleSheet.hairlineWidth,
		paddingVertical: Spacing.three,
		alignItems: "center",
	},
	hint: { fontSize: 13, lineHeight: 18, opacity: 0.7 },
});
