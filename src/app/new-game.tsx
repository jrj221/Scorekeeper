"use client";
import { FontAwesome5 } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	TextInputView,
	View,
	TextInput
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CellEditModal } from "@/components/cell-edit-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { DealerMode, Player, useGamesContext } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";
import { consumePendingIcon } from "@/utils/icon-picker-state";
import { HapticButton } from "@/components/haptic-button";

type ActiveDropdown = "player" | "group" | "fixedDealer" | "firstPlayer" | null;

export default function NewGameScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { templateId } = useLocalSearchParams<{ templateId?: string }>();
	const { createGame, globalPlayers, addGlobalPlayer, getTemplate, groups } = useGamesContext();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

	useFocusEffect(useCallback(() => {
		const icon = consumePendingIcon();
		if (icon !== undefined) setSelectedIcon(icon);
	}, []));
	const [players, setPlayers] = useState<Player[]>([]);
	const [isIndefinite, setIsIndefinite] = useState(false);
	const [roundCountStr, setRoundCountStr] = useState("10");
	const [showRoundNumpad, setShowRoundNumpad] = useState(false);
	const [rankByLowest, setRankByLowest] = useState(false);
	const [playersError, setPlayersError] = useState(false);

	const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
	const [playerSearch, setPlayerSearch] = useState("");
	const [playerSearchError, setPlayerSearchError] = useState("");
	const playerSearchRef = useRef<TextInput>(null);

	// Dealer (optional)
	const [dealerEnabled, setDealerEnabled] = useState(false);
	const [dealerMode, setDealerMode] = useState<DealerMode>("rotation");
	const [fixedDealerId, setFixedDealerId] = useState<string | null>(null);

	// Turn order (optional)
	const [turnOrderEnabled, setTurnOrderEnabled] = useState(true);
	const [firstPlayerMode, setFirstPlayerMode] = useState<"random" | "left-of-dealer" | "rotation">("rotation");
	const [firstPlayerSpecificId, setFirstPlayerSpecificId] = useState<string | null>(null);

	useEffect(() => {
		if (!templateId) return;
		const tmpl = getTemplate(templateId);
		if (!tmpl) return;
		setName(tmpl.name);
		setDescription(tmpl.description ?? "");
		setIsIndefinite(tmpl.totalRounds === undefined);
		setRoundCountStr(tmpl.totalRounds !== undefined ? tmpl.totalRounds.toString() : "10");
		setRankByLowest(tmpl.rankByLowest);
	}, [templateId]);

	const toggleDropdown = (d: ActiveDropdown) => setActiveDropdown((prev) => (prev === d ? null : d));

	const addExistingPlayer = useCallback((id: string, playerName: string) => {
		setPlayers((prev) => {
			if (prev.some((p) => p.id === id)) return prev;
			const next = [...prev, { id, name: playerName }];
			if (next.length > 0) setPlayersError(false);
			return next;
		});
		setPlayerSearch("");
		setPlayerSearchError("");
	}, []);

	const submitPlayerSearch = useCallback(() => {
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
			setPlayerSearchError(`"${trimmed}" is already added`);
			return;
		}
		setPlayerSearchError("");
		const global = addGlobalPlayer(trimmed);
		const player = global ?? { id: `p_${Date.now()}`, name: trimmed };
		setPlayers((prev) => {
			if (prev.some((p) => p.id === player.id)) return prev;
			setPlayersError(false);
			return [...prev, player];
		});
		setPlayerSearch("");
		playerSearchRef.current?.focus();
	}, [playerSearch, players, globalPlayers, addGlobalPlayer, addExistingPlayer]);

	const removePlayer = useCallback((id: string) => {
		setPlayers((prev) => prev.filter((p) => p.id !== id));
	}, []);

	const addGroup = useCallback(
		(groupId: string) => {
			const group = groups.find((g) => g.id === groupId);
			if (!group) return;
			setPlayers((prev) => {
				const toAdd = group.playerIds
					.filter((pid) => !prev.some((p) => p.id === pid))
					.map((pid) => {
						const gp = globalPlayers.find((p) => p.id === pid);
						return gp ? { id: gp.id, name: gp.name } : null;
					})
					.filter((p): p is Player => p !== null);
				if (toAdd.length > 0) setPlayersError(false);
				return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
			});
		},
		[groups, globalPlayers],
	);

	const handleCreate = useCallback(() => {
		if (players.length === 0) {
			setPlayersError(true);
			return;
		}
		const totalRounds = !isIndefinite ? Math.max(1, parseInt(roundCountStr, 10) || 1) : undefined;

		let resolvedFirstPlayerId: string | undefined;
		let resolvedFirstPlayerMode: "left-of-dealer" | undefined;
		if (turnOrderEnabled) {
			if (firstPlayerMode === "left-of-dealer") {
				resolvedFirstPlayerMode = "left-of-dealer";
			} else if (firstPlayerMode === "random") {
				resolvedFirstPlayerId = players[Math.floor(Math.random() * players.length)]?.id;
			} else {
				// rotation: starts at chosen player (or first) and rotates each round
				resolvedFirstPlayerId = firstPlayerSpecificId ?? players[0]?.id;
			}
		}

		const id = createGame({
			name: name.trim() || "Untitled Game",
			icon: selectedIcon ?? undefined,
			description: description.trim() || undefined,
			players,
			totalRounds,
			rankByLowest,
			turnOrder: turnOrderEnabled ? players.map((p) => p.id) : undefined,
			firstPlayerId: resolvedFirstPlayerId,
			firstPlayerMode: resolvedFirstPlayerMode,
			dealerEnabled: dealerEnabled || undefined,
			dealerMode: dealerEnabled ? dealerMode : undefined,
			fixedDealerId: dealerEnabled && dealerMode === "fixed" ? (fixedDealerId ?? undefined) : undefined });
		router.replace(`/game/${id}`);
	}, [
		name,
		description,
		players,
		isIndefinite,
		roundCountStr,
		rankByLowest,
		turnOrderEnabled,
		firstPlayerMode,
		firstPlayerSpecificId,
		dealerEnabled,
		dealerMode,
		fixedDealerId,
		createGame,
		router,
	]);

	const filteredGlobalPlayers = globalPlayers.filter(
		(gp) =>
			!players.some((p) => p.id === gp.id) &&
			(playerSearch === "" || gp.name.toLowerCase().includes(playerSearch.toLowerCase())),
	);
	const availableGroups = groups.filter((g) => !g.playerIds.every((pid) => players.some((p) => p.id === pid)));

	// Derived hint text
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

	const turnHint = turnOrderEnabled
		? firstPlayerMode === "random"
			? "The first player will be randomly determined each round."
			: firstPlayerMode === "left-of-dealer"
				? "The player to the left of the dealer goes first each round."
				: firstPlayerSpecificId
					? `${players.find((p) => p.id === firstPlayerSpecificId)?.name ?? "The selected player"} goes first in Round 1, then it rotates to the next player each round.`
					: "The first player rotates through the group each round."
		: null;

	const card = [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }];
	const inner = { backgroundColor: theme.backgroundSelected } as const;
	const innerInput = { backgroundColor: theme.background, color: theme.text } as const;

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: templateId ? "New Game from Template" : "New Game" }} />
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<ScrollView
					contentContainerStyle={styles.scroll}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* Game Name */}
					<View style={card}>
						<View style={styles.labelRow}>
							<ThemedText style={styles.label} themeColor="textSecondary">
								GAME NAME
							</ThemedText>
							<ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary">
								{" "}
								(OPTIONAL)
							</ThemedText>
						</View>
						<View style={styles.nameRow}>
							<HapticButton
								style={[styles.iconBtn, { backgroundColor: theme.background }]}
								onPress={() => router.push("/icon-picker")}
								activeOpacity={0.7}
							>
								<FontAwesome5
									name={(selectedIcon ?? "users") as any}
									size={20}
									color={theme.textSecondary}
								/>
							</HapticButton>
							<TextInput
								style={[shared.input, innerInput, { flex: 1 }]}
								placeholder="Untitled Game"
								placeholderTextColor={theme.textSecondary}
								value={name}
								onChangeText={setName}
								maxLength={30}
								returnKeyType="next"
							/>
						</View>
					</View>

					{/* Description */}
					<View style={card}>
						<View style={styles.labelRow}>
							<ThemedText style={styles.label} themeColor="textSecondary">
								DESCRIPTION
							</ThemedText>
							<ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary">
								{" "}
								(OPTIONAL)
							</ThemedText>
						</View>
						<TextInput
							style={[shared.input, innerInput]}
							placeholder="Add a description"
							placeholderTextColor={theme.textSecondary}
							value={description}
							onChangeText={setDescription}
							maxLength={80}
							returnKeyType="next"
						/>
					</View>

					{/* Players */}
					<View
						style={[
							styles.card,
							{
								backgroundColor: theme.backgroundElement,
								borderColor:
									playersError && players.length === 0 ? "#C05050" : theme.backgroundSelected,
								borderWidth: playersError && players.length === 0 ? 1.5 : StyleSheet.hairlineWidth },
						]}
					>
						<View style={styles.labelRow}>
							<ThemedText
								style={[styles.label, playersError && { color: "#C05050" }]}
								themeColor={playersError ? undefined : "textSecondary"}
							>
								PLAYERS
							</ThemedText>
							{players.length > 0 && (
								<ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary">
									{" "}
									{players.length}
								</ThemedText>
							)}
						</View>

						{playersError && players.length === 0 && (
							<ThemedText style={styles.fieldError}>
								Add at least one player to create the game.
							</ThemedText>
						)}

						{players.length > 0 && (
							<View style={styles.chipRow}>
								{players.map((p) => (
									<HapticButton
										key={p.id}
										style={[styles.chip, inner]}
										onPress={() => removePlayer(p.id)}
									>
										<ThemedText type="small">{p.name}</ThemedText>
										<ThemedText type="small" themeColor="textSecondary">
											{" "}
											×
										</ThemedText>
									</HapticButton>
								))}
							</View>
						)}

						<View style={styles.dropdownBtns}>
							<HapticButton
								style={[
									styles.dropdownTrigger,
									inner,
									activeDropdown === "player" && styles.dropdownTriggerActive,
								]}
								onPress={() => toggleDropdown("player")}
							>
								<ThemedText type="small" style={{ color: "#0077B6" }}>
									Add Player
								</ThemedText>
								<ThemedText style={styles.chevron}>
									{activeDropdown === "player" ? "▴" : "▾"}
								</ThemedText>
							</HapticButton>
							{groups.length > 0 && (
								<HapticButton
									style={[
										styles.dropdownTrigger,
										inner,
										activeDropdown === "group" && styles.dropdownTriggerActive,
									]}
									onPress={() => toggleDropdown("group")}
								>
									<ThemedText type="small" style={{ color: "#0077B6" }}>
										Add Group
									</ThemedText>
									<ThemedText style={styles.chevron}>
										{activeDropdown === "group" ? "▴" : "▾"}
									</ThemedText>
								</HapticButton>
							)}
						</View>

						{activeDropdown === "player" && (
							<View
								style={[
									styles.dropdown,
									{ backgroundColor: theme.backgroundSelected, borderColor: theme.background },
								]}
							>
								<View style={{ gap: 4 }}>
									<TextInput
										ref={playerSearchRef}
										style={[shared.input, innerInput]}
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
									/>
									{playerSearchError ? (
										<ThemedText style={styles.inputError}>{playerSearchError}</ThemedText>
									) : null}
								</View>
								{filteredGlobalPlayers.length > 0 && (
									<View style={[styles.dropdownList, { borderTopColor: theme.background }]}>
										{filteredGlobalPlayers.map((gp, i) => (
											<HapticButton
												key={gp.id}
												style={[
													styles.dropdownRow,
													{ borderBottomColor: theme.background },
													i === filteredGlobalPlayers.length - 1 && { borderBottomWidth: 0 },
												]}
												onPress={() => addExistingPlayer(gp.id, gp.name)}
											>
												<ThemedText type="default">{gp.name}</ThemedText>
												<ThemedText type="small" style={{ color: "#0077B6" }}>
													+ Add
												</ThemedText>
											</HapticButton>
										))}
									</View>
								)}
								{filteredGlobalPlayers.length === 0 &&
									playerSearch === "" &&
									globalPlayers.length > 0 && (
										<ThemedText
											type="small"
											themeColor="textSecondary"
											style={styles.dropdownEmpty}
										>
											All saved players are in this game
										</ThemedText>
									)}
								{filteredGlobalPlayers.length === 0 &&
									playerSearch === "" &&
									globalPlayers.length === 0 && (
										<ThemedText
											type="small"
											themeColor="textSecondary"
											style={styles.dropdownEmpty}
										>
											No saved players — type a name to create one
										</ThemedText>
									)}
								{filteredGlobalPlayers.length === 0 && playerSearch !== "" && (
									<ThemedText type="small" themeColor="textSecondary" style={styles.dropdownEmpty}>
										Press return to add "{playerSearch}"
									</ThemedText>
								)}
							</View>
						)}

						{activeDropdown === "group" && (
							<View
								style={[
									styles.dropdown,
									{ backgroundColor: theme.backgroundSelected, borderColor: theme.background },
								]}
							>
								{availableGroups.length === 0 ? (
									<ThemedText type="small" themeColor="textSecondary" style={styles.dropdownEmpty}>
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
													styles.dropdownRow,
													{ borderBottomColor: theme.background },
													i === availableGroups.length - 1 && { borderBottomWidth: 0 },
												]}
												onPress={() => addGroup(g.id)}
											>
												<View style={{ flex: 1 }}>
													<ThemedText type="default">{g.name}</ThemedText>
													{memberNames ? (
														<ThemedText
															type="small"
															themeColor="textSecondary"
															numberOfLines={1}
														>
															{memberNames}
														</ThemedText>
													) : null}
												</View>
												<ThemedText type="small" style={{ color: "#0077B6" }}>
													+ Add
												</ThemedText>
											</HapticButton>
										);
									})
								)}
							</View>
						)}
					</View>

					{/* Rounds */}
					<View style={card}>
						<ThemedText style={styles.label} themeColor="textSecondary">
							ROUNDS
						</ThemedText>
						{!isIndefinite && (
							<View style={styles.roundsRow}>
								<HapticButton
									style={[styles.roundsInput, inner]}
									onPress={() => setShowRoundNumpad(true)}
								>
									<ThemedText style={{ color: theme.text, fontSize: 16, textAlign: "center" }}>
										{roundCountStr || "—"}
									</ThemedText>
								</HapticButton>
								<ThemedText type="default">rounds</ThemedText>
							</View>
						)}
						<HapticButton style={[styles.toggleRow, inner]} onPress={() => setIsIndefinite((v) => !v)}>
							<ThemedText type="default">Endless Mode</ThemedText>
							<View
								style={[
									styles.toggle,
									{ backgroundColor: isIndefinite ? "#0077B6" : theme.backgroundElement },
								]}
							>
								<View style={[styles.toggleThumb, isIndefinite && styles.toggleThumbOn]} />
							</View>
						</HapticButton>
					</View>

					{/* Winner */}
					<View style={card}>
						<ThemedText style={styles.label} themeColor="textSecondary">
							WINNER
						</ThemedText>
						<View style={styles.segmentRow}>
							<HapticButton
								style={[
									styles.segLeft,
									{ backgroundColor: !rankByLowest ? "#0077B6" : theme.backgroundSelected },
								]}
								onPress={() => setRankByLowest(false)}
							>
								<ThemedText type="small" style={{ color: !rankByLowest ? "#fff" : theme.text }}>
									Highest score
								</ThemedText>
							</HapticButton>
							<HapticButton
								style={[
									styles.segRight,
									{ backgroundColor: rankByLowest ? "#0077B6" : theme.backgroundSelected },
								]}
								onPress={() => setRankByLowest(true)}
							>
								<ThemedText type="small" style={{ color: rankByLowest ? "#fff" : theme.text }}>
									Lowest score
								</ThemedText>
							</HapticButton>
						</View>
					</View>

					{/* Dealer */}
					<View style={card}>
						<View style={styles.labelRow}>
							<ThemedText style={styles.label} themeColor="textSecondary">
								DEALER
							</ThemedText>
							<ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary">
								{" "}
								(OPTIONAL)
							</ThemedText>
						</View>
						<HapticButton
							style={[styles.toggleRow, inner]}
							onPress={() => {
								setDealerEnabled((v) => !v);
								setActiveDropdown(null);
							}}
						>
							<ThemedText type="default">Track dealer</ThemedText>
							<View
								style={[
									styles.toggle,
									{ backgroundColor: dealerEnabled ? "#0077B6" : theme.backgroundElement },
								]}
							>
								<View style={[styles.toggleThumb, dealerEnabled && styles.toggleThumbOn]} />
							</View>
						</HapticButton>

						{dealerEnabled && (
							<>
								<ThemedText style={[styles.subLabel]} themeColor="textSecondary">
									DEALER IS
								</ThemedText>
								<View style={styles.segmentRow}>
									<HapticButton
										style={[
											styles.segLeft,
											{
												backgroundColor:
													dealerMode === "rotation" ? "#0077B6" : theme.backgroundSelected },
										]}
										onPress={() => {
											setDealerMode("rotation");
											if (!fixedDealerId) setFixedDealerId(players[0]?.id ?? null);
										}}
									>
										<ThemedText
											type="small"
											style={{ color: dealerMode === "rotation" ? "#fff" : theme.text }}
										>
											Rotation
										</ThemedText>
									</HapticButton>
									<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
									<HapticButton
										style={[
											styles.segMid,
											{
												backgroundColor:
													dealerMode === "random" ? "#0077B6" : theme.backgroundSelected },
										]}
										onPress={() => setDealerMode("random")}
									>
										<ThemedText
											type="small"
											style={{ color: dealerMode === "random" ? "#fff" : theme.text }}
										>
											Random
										</ThemedText>
									</HapticButton>
									<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
									<HapticButton
										style={[
											styles.segRight,
											{
												backgroundColor:
													dealerMode === "fixed" ? "#0077B6" : theme.backgroundSelected },
										]}
										onPress={() => {
											setDealerMode("fixed");
											if (!fixedDealerId) setFixedDealerId(players[0]?.id ?? null);
										}}
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
												styles.dropdownTrigger,
												inner,
												activeDropdown === "fixedDealer" && styles.dropdownTriggerActive,
											]}
											onPress={() => toggleDropdown("fixedDealer")}
										>
											<ThemedText type="small" style={{ color: "#0077B6" }}>
												{fixedDealerId
													? (players.find((p) => p.id === fixedDealerId)?.name ??
														"Pick Dealer")
													: "Pick Dealer"}
											</ThemedText>
											<ThemedText style={styles.chevron}>
												{activeDropdown === "fixedDealer" ? "▴" : "▾"}
											</ThemedText>
										</HapticButton>
										{activeDropdown === "fixedDealer" && (
											<View
												style={[
													styles.dropdown,
													{
														backgroundColor: theme.backgroundSelected,
														borderColor: theme.background },
												]}
											>
												{players.length === 0 ? (
													<ThemedText
														type="small"
														themeColor="textSecondary"
														style={styles.dropdownEmpty}
													>
														Add players first
													</ThemedText>
												) : (
													players.map((p, i) => (
														<HapticButton
															key={p.id}
															style={[
																styles.dropdownRow,
																{ borderBottomColor: theme.background },
																i === players.length - 1 && { borderBottomWidth: 0 },
															]}
															onPress={() => {
																setFixedDealerId(p.id);
																setActiveDropdown(null);
															}}
														>
															<ThemedText type="default">{p.name}</ThemedText>
															{fixedDealerId === p.id && (
																<ThemedText type="small" style={{ color: "#0077B6" }}>
																	✓
																</ThemedText>
															)}
														</HapticButton>
													))
												)}
											</View>
										)}
									</>
								)}
								{dealerHint && <ThemedText style={styles.hint}>{dealerHint}</ThemedText>}
							</>
						)}
					</View>

					{/* Turn Order */}
					<View style={card}>
						<View style={styles.labelRow}>
							<ThemedText style={styles.label} themeColor="textSecondary">
								WHO GOES FIRST
							</ThemedText>
							<ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary">
								{" "}
								(OPTIONAL)
							</ThemedText>
						</View>
						<HapticButton
							style={[styles.toggleRow, inner]}
							onPress={() => {
								setTurnOrderEnabled((v) => !v);
								setActiveDropdown(null);
							}}
						>
							<ThemedText type="default">Track who goes first</ThemedText>
							<View
								style={[
									styles.toggle,
									{ backgroundColor: turnOrderEnabled ? "#0077B6" : theme.backgroundElement },
								]}
							>
								<View style={[styles.toggleThumb, turnOrderEnabled && styles.toggleThumbOn]} />
							</View>
						</HapticButton>

						{turnOrderEnabled && (
							<>
								<View style={styles.segmentRow}>
									{dealerEnabled && (
										<>
											<HapticButton
												style={[
													styles.segLeft,
													{
														backgroundColor:
															firstPlayerMode === "left-of-dealer"
																? "#0077B6"
																: theme.backgroundSelected },
												]}
												onPress={() => setFirstPlayerMode("left-of-dealer")}
											>
												<ThemedText
													type="small"
													style={{
														color:
															firstPlayerMode === "left-of-dealer" ? "#fff" : theme.text }}
												>
													Left of Dealer
												</ThemedText>
											</HapticButton>
											<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
										</>
									)}
									<HapticButton
										style={[
											dealerEnabled ? styles.segMid : styles.segLeft,
											{
												backgroundColor:
													firstPlayerMode === "rotation"
														? "#0077B6"
														: theme.backgroundSelected },
										]}
										onPress={() => {
											setFirstPlayerMode("rotation");
											if (!firstPlayerSpecificId)
												setFirstPlayerSpecificId(players[0]?.id ?? null);
										}}
									>
										<ThemedText
											type="small"
											style={{ color: firstPlayerMode === "rotation" ? "#fff" : theme.text }}
										>
											Rotation
										</ThemedText>
									</HapticButton>
									<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
									<HapticButton
										style={[
											styles.segRight,
											{
												backgroundColor:
													firstPlayerMode === "random" ? "#0077B6" : theme.backgroundSelected },
										]}
										onPress={() => setFirstPlayerMode("random")}
									>
										<ThemedText
											type="small"
											style={{ color: firstPlayerMode === "random" ? "#fff" : theme.text }}
										>
											Random
										</ThemedText>
									</HapticButton>
								</View>
								{firstPlayerMode === "rotation" && (
									<>
										<HapticButton
											style={[
												styles.dropdownTrigger,
												inner,
												activeDropdown === "firstPlayer" && styles.dropdownTriggerActive,
											]}
											onPress={() => toggleDropdown("firstPlayer")}
										>
											<ThemedText type="small" style={{ color: "#0077B6" }}>
												{firstPlayerSpecificId
													? (players.find((p) => p.id === firstPlayerSpecificId)?.name ??
														"Pick Player")
													: "Pick Player"}
											</ThemedText>
											<ThemedText style={styles.chevron}>
												{activeDropdown === "firstPlayer" ? "▴" : "▾"}
											</ThemedText>
										</HapticButton>
										{activeDropdown === "firstPlayer" && (
											<View
												style={[
													styles.dropdown,
													{
														backgroundColor: theme.backgroundSelected,
														borderColor: theme.background },
												]}
											>
												{players.length === 0 ? (
													<ThemedText
														type="small"
														themeColor="textSecondary"
														style={styles.dropdownEmpty}
													>
														Add players first
													</ThemedText>
												) : (
													players.map((p, i) => (
														<HapticButton
															key={p.id}
															style={[
																styles.dropdownRow,
																{ borderBottomColor: theme.background },
																i === players.length - 1 && { borderBottomWidth: 0 },
															]}
															onPress={() => {
																setFirstPlayerSpecificId(p.id);
																setActiveDropdown(null);
															}}
														>
															<ThemedText type="default">{p.name}</ThemedText>
															{firstPlayerSpecificId === p.id && (
																<ThemedText type="small" style={{ color: "#0077B6" }}>
																	✓
																</ThemedText>
															)}
														</HapticButton>
													))
												)}
											</View>
										)}
									</>
								)}
								{turnHint && <ThemedText style={styles.hint}>{turnHint}</ThemedText>}
							</>
						)}
					</View>

					{/* Create */}
					<HapticButton
						style={[shared.button, styles.createBtn, { backgroundColor: "#0077B6" }]}
						onPress={handleCreate}
					>
						<ThemedText type="smallBold" style={{ color: "#fff" }}>
							Create Game
						</ThemedText>
					</HapticButton>
				</ScrollView>
				<SafeAreaView edges={["bottom"]} />
			</KeyboardAvoidingView>

			<CellEditModal
				visible={showRoundNumpad}
				title="Number of Rounds"
				initialValue={parseInt(roundCountStr) || null}
				allowNegative={false}
				minValue={1}
				onSave={(v) => {
					setRoundCountStr(v && v > 0 ? v.toString() : "10");
					setShowRoundNumpad(false);
				}}
				onCancel={() => setShowRoundNumpad(false)}
			/>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
	card: {
		gap: Spacing.two,
		borderRadius: Spacing.two,
		padding: Spacing.three,
		borderWidth: StyleSheet.hairlineWidth },
	labelRow: { flexDirection: "row", alignItems: "baseline" },
	label: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8 },
	subLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, opacity: 0.7 },
	hint: { fontSize: 13, lineHeight: 18, opacity: 0.7 },
	fieldError: { fontSize: 12, color: "#C05050" },
	chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
	chip: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: Spacing.one },
	dropdownBtns: { flexDirection: "row", gap: Spacing.two },
	dropdownTrigger: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: Spacing.two,
		paddingVertical: Spacing.two,
		paddingHorizontal: Spacing.three,
		gap: Spacing.one },
	dropdownTriggerActive: { opacity: 0.75 },
	chevron: { fontSize: 18, color: "#0077B6", lineHeight: 22 },
	dropdown: {
		borderRadius: Spacing.two,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: "hidden",
		padding: Spacing.two,
		gap: Spacing.two },
	dropdownList: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.one },
	dropdownRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: Spacing.two,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: Spacing.two },
	dropdownEmpty: { textAlign: "center", opacity: 0.6, paddingVertical: Spacing.one },
	inputError: { fontSize: 12, color: "#C05050" },
	segmentRow: { flexDirection: "row" },
	segDivider: { width: StyleSheet.hairlineWidth + 1, alignSelf: "stretch" },
	segLeft: {
		flex: 1,
		alignItems: "center",
		paddingVertical: Spacing.two,
		borderTopLeftRadius: Spacing.two,
		borderBottomLeftRadius: Spacing.two },
	segMid: { flex: 1, alignItems: "center", paddingVertical: Spacing.two },
	segRight: {
		flex: 1,
		alignItems: "center",
		paddingVertical: Spacing.two,
		borderTopRightRadius: Spacing.two,
		borderBottomRightRadius: Spacing.two },
	toggleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two },
	toggle: { width: 44, height: 26, borderRadius: 13, justifyContent: "center", paddingHorizontal: 3 },
	toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
	toggleThumbOn: { alignSelf: "flex-end" },
	createBtn: { alignSelf: "stretch", alignItems: "center", paddingVertical: Spacing.three, marginTop: Spacing.one },
	roundsRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
	roundsInput: {
		borderRadius: Spacing.one + 2,
		paddingHorizontal: Spacing.two,
		paddingVertical: Spacing.one,
		minWidth: 52,
		alignItems: "center" },
	nameRow: {
		flexDirection: "row",
		alignItems: "stretch",
		gap: Spacing.two },
	iconBtn: {
		borderRadius: Spacing.two,
		aspectRatio: 1,
		alignItems: "center",
		justifyContent: "center",
		// height matches shared.input padding: Spacing.two*2 + fontSize 16 lineheight ≈ 40
		width: 40 } });
