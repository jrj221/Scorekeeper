"use client";
import { FontAwesome5 } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { usePlayerSearch } from "@/hooks/use-player-search";
import { consumePendingIcon } from "@/utils/icon-picker-state";
import { HapticButton } from "@/components/haptic-button";
import { forms } from '@/styles/forms';

type ActiveDropdown = "player" | "group" | "fixedDealer" | "firstPlayer" | null;

export default function NewGameScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { templateId } = useLocalSearchParams<{ templateId?: string }>();
	const { createGame, globalPlayers, getTemplate, groups } = useGamesContext();

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
		if (tmpl.icon !== undefined) setSelectedIcon(tmpl.icon ?? null);
		if (tmpl.dealerEnabled !== undefined) setDealerEnabled(!!tmpl.dealerEnabled);
		if (tmpl.dealerMode !== undefined) setDealerMode(tmpl.dealerMode);
		if (tmpl.turnOrderEnabled !== undefined) setTurnOrderEnabled(!!tmpl.turnOrderEnabled);
		if (tmpl.firstPlayerSetting !== undefined) setFirstPlayerMode(tmpl.firstPlayerSetting);
	}, [templateId]);

	const toggleDropdown = (d: ActiveDropdown) => setActiveDropdown((prev) => (prev === d ? null : d));

	const {
		playerSearch, setPlayerSearch,
		playerSearchError,
		playerSearchRef,
		filteredGlobalPlayers,
		addById: addExistingPlayer,
		submit: submitPlayerSearch,
		addGroup,
	} = usePlayerSearch(players, (next) => {
		setPlayers(next);
		setPlayersError(false);
	});

	const removePlayer = useCallback((id: string) => {
		setPlayers((prev) => prev.filter((p) => p.id !== id));
	}, []);

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

	const availableGroups = groups.filter((g) => !g.playerIds.every((pid) => players.some((p) => p.id === pid)));

	// Derived hint text
	const dealerHint = getDealerHintText(dealerEnabled, dealerMode, players.find(p => p.id === fixedDealerId)?.name);
	const turnHint = getTurnHintText(turnOrderEnabled, firstPlayerMode, players.find(p => p.id === firstPlayerSpecificId)?.name);
	const card = [forms.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }];
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
						<View style={forms.labelRow}>
							<ThemedText style={forms.label} themeColor="textSecondary">
								GAME NAME
							</ThemedText>
							<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary">
								{" "}
								(OPTIONAL)
							</ThemedText>
						</View>
						<View style={forms.nameRow}>
							<HapticButton
								style={[forms.iconBtn, { backgroundColor: theme.background }]}
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
						<View style={forms.labelRow}>
							<ThemedText style={forms.label} themeColor="textSecondary">
								DESCRIPTION
							</ThemedText>
							<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary">
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
							forms.card,
							{
								backgroundColor: theme.backgroundElement,
								borderColor:
									playersError && players.length === 0 ? "#C05050" : theme.backgroundSelected,
								borderWidth: playersError && players.length === 0 ? 1.5 : StyleSheet.hairlineWidth },
						]}
					>
						<View style={forms.labelRow}>
							<ThemedText
								style={[forms.label, playersError && { color: "#C05050" }]}
								themeColor={playersError ? undefined : "textSecondary"}
							>
								PLAYERS
							</ThemedText>
							{players.length > 0 && (
								<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary">
									{" "}
									{players.length}
								</ThemedText>
							)}
						</View>

						{playersError && players.length === 0 && (
							<ThemedText style={forms.fieldError}>
								Add at least one player to create the game.
							</ThemedText>
						)}

						{players.length > 0 && (
							<View style={forms.chipRow}>
								{players.map((p) => (
									<HapticButton
										key={p.id}
										style={[forms.chip, inner]}
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

						<View style={forms.dropdownBtns}>
							<HapticButton
								style={[
									forms.dropdownTrigger,
									inner,
									activeDropdown === "player" && forms.dropdownTriggerActive,
								]}
								onPress={() => toggleDropdown("player")}
							>
								<ThemedText type="small" style={{ color: "#0077B6" }}>
									Add Player
								</ThemedText>
								<ThemedText style={forms.chevron}>
									{activeDropdown === "player" ? "▴" : "▾"}
								</ThemedText>
							</HapticButton>
							{groups.length > 0 && (
								<HapticButton
									style={[
										forms.dropdownTrigger,
										inner,
										activeDropdown === "group" && forms.dropdownTriggerActive,
									]}
									onPress={() => toggleDropdown("group")}
								>
									<ThemedText type="small" style={{ color: "#0077B6" }}>
										Add Group
									</ThemedText>
									<ThemedText style={forms.chevron}>
										{activeDropdown === "group" ? "▴" : "▾"}
									</ThemedText>
								</HapticButton>
							)}
						</View>

						{activeDropdown === "player" && (
							<View
								style={[
									forms.dropdown,
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
										onChangeText={setPlayerSearch}
										onSubmitEditing={submitPlayerSearch}
										maxLength={15}
										returnKeyType="done"
										submitBehavior="submit"
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
											style={forms.dropdownEmpty}
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
											style={forms.dropdownEmpty}
										>
											No saved players — type a name to create one
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
							<View
								style={[
									forms.dropdown,
									{ backgroundColor: theme.backgroundSelected, borderColor: theme.background },
								]}
							>
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
						<ThemedText style={forms.label} themeColor="textSecondary">
							ROUNDS
						</ThemedText>
						{!isIndefinite && (
							<View style={forms.roundsRow}>
								<HapticButton
									style={[forms.roundsInput, inner]}
									onPress={() => setShowRoundNumpad(true)}
								>
									<ThemedText style={{ color: theme.text, fontSize: 16, textAlign: "center" }}>
										{roundCountStr || "—"}
									</ThemedText>
								</HapticButton>
								<ThemedText type="default">rounds</ThemedText>
							</View>
						)}
						<HapticButton style={[forms.toggleRow, inner]} onPress={() => setIsIndefinite((v) => !v)}>
							<ThemedText type="default">Endless Mode</ThemedText>
							<View
								style={[
									forms.toggle,
									{ backgroundColor: isIndefinite ? "#0077B6" : theme.backgroundElement },
								]}
							>
								<View style={[forms.toggleThumb, isIndefinite && forms.toggleThumbOn]} />
							</View>
						</HapticButton>
					</View>

					{/* Winner */}
					<View style={card}>
						<ThemedText style={forms.label} themeColor="textSecondary">
							WINNER
						</ThemedText>
						<View style={forms.segmentRow}>
							<HapticButton
								style={[
									forms.segLeft,
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
									forms.segRight,
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
						<View style={forms.labelRow}>
							<ThemedText style={forms.label} themeColor="textSecondary">
								DEALER
							</ThemedText>
							<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary">
								{" "}
								(OPTIONAL)
							</ThemedText>
						</View>
						<HapticButton
							style={[forms.toggleRow, inner]}
							onPress={() => {
								setDealerEnabled((v) => !v);
								setActiveDropdown(null);
							}}
						>
							<ThemedText type="default">Track dealer</ThemedText>
							<View
								style={[
									forms.toggle,
									{ backgroundColor: dealerEnabled ? "#0077B6" : theme.backgroundElement },
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
									<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
									<HapticButton
										style={[
											forms.segMid,
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
									<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
									<HapticButton
										style={[
											forms.segRight,
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
												forms.dropdownTrigger,
												inner,
												activeDropdown === "fixedDealer" && forms.dropdownTriggerActive,
											]}
											onPress={() => toggleDropdown("fixedDealer")}
										>
											<ThemedText type="small" style={{ color: "#0077B6" }}>
												{fixedDealerId
													? (players.find((p) => p.id === fixedDealerId)?.name ??
														"Pick Dealer")
													: "Pick Dealer"}
											</ThemedText>
											<ThemedText style={forms.chevron}>
												{activeDropdown === "fixedDealer" ? "▴" : "▾"}
											</ThemedText>
										</HapticButton>
										{activeDropdown === "fixedDealer" && (
											<View
												style={[
													forms.dropdown,
													{
														backgroundColor: theme.backgroundSelected,
														borderColor: theme.background },
												]}
											>
												{players.length === 0 ? (
													<ThemedText
														type="small"
														themeColor="textSecondary"
														style={forms.dropdownEmpty}
													>
														Add players first
													</ThemedText>
												) : (
													players.map((p, i) => (
														<HapticButton
															key={p.id}
															style={[
																forms.dropdownRow,
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
								{dealerHint && <ThemedText style={forms.hint}>{dealerHint}</ThemedText>}
							</>
						)}
					</View>

					{/* Turn Order */}
					<View style={card}>
						<View style={forms.labelRow}>
							<ThemedText style={forms.label} themeColor="textSecondary">
								WHO GOES FIRST
							</ThemedText>
							<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary">
								{" "}
								(OPTIONAL)
							</ThemedText>
						</View>
						<HapticButton
							style={[forms.toggleRow, inner]}
							onPress={() => {
								setTurnOrderEnabled((v) => !v);
								setActiveDropdown(null);
							}}
						>
							<ThemedText type="default">Track who goes first</ThemedText>
							<View
								style={[
									forms.toggle,
									{ backgroundColor: turnOrderEnabled ? "#0077B6" : theme.backgroundElement },
								]}
							>
								<View style={[forms.toggleThumb, turnOrderEnabled && forms.toggleThumbOn]} />
							</View>
						</HapticButton>

						{turnOrderEnabled && (
							<>
								<View style={forms.segmentRow}>
									{dealerEnabled && (
										<>
											<HapticButton
												style={[
													forms.segLeft,
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
											<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
										</>
									)}
									<HapticButton
										style={[
											dealerEnabled ? forms.segMid : forms.segLeft,
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
									<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
									<HapticButton
										style={[
											forms.segRight,
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
												forms.dropdownTrigger,
												inner,
												activeDropdown === "firstPlayer" && forms.dropdownTriggerActive,
											]}
											onPress={() => toggleDropdown("firstPlayer")}
										>
											<ThemedText type="small" style={{ color: "#0077B6" }}>
												{firstPlayerSpecificId
													? (players.find((p) => p.id === firstPlayerSpecificId)?.name ??
														"Pick Player")
													: "Pick Player"}
											</ThemedText>
											<ThemedText style={forms.chevron}>
												{activeDropdown === "firstPlayer" ? "▴" : "▾"}
											</ThemedText>
										</HapticButton>
										{activeDropdown === "firstPlayer" && (
											<View
												style={[
													forms.dropdown,
													{
														backgroundColor: theme.backgroundSelected,
														borderColor: theme.background },
												]}
											>
												{players.length === 0 ? (
													<ThemedText
														type="small"
														themeColor="textSecondary"
														style={forms.dropdownEmpty}
													>
														Add players first
													</ThemedText>
												) : (
													players.map((p, i) => (
														<HapticButton
															key={p.id}
															style={[
																forms.dropdownRow,
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
								{turnHint && <ThemedText style={forms.hint}>{turnHint}</ThemedText>}
							</>
						)}
					</View>

					{/* Create */}
					<HapticButton
						style={[shared.button, forms.createBtn, { backgroundColor: "#0077B6" }]}
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
	iconBtn: {
		borderRadius: Spacing.two,
		aspectRatio: 1,
		alignItems: "center",
		justifyContent: "center",
		// height matches shared.input padding: Spacing.two*2 + fontSize 16 lineheight ≈ 40
		width: 40 } });
