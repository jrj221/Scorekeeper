"use client";
import { FontAwesome5 } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CellEditModal } from "@/components/cell-edit-modal";
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
import { DealerMode, Player, useGamesContext } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";
import { usePlayerSearch } from "@/hooks/use-player-search";
import { consumePendingIcon } from "@/utils/icon-picker-state";
import { HapticButton } from "@/components/haptic-button";
import { forms } from "@/styles/forms";
import { getDealerHintText, getTurnHintText } from "@/utils/game";

type ActiveDropdown = "player" | "group" | "fixedDealer" | "firstPlayer" | null;
type FirstPlayerMode = "random" | "left-of-dealer" | "rotation";

export default function NewGameScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { templateId } = useLocalSearchParams<{ templateId?: string }>();
	const { createGame, globalPlayers, getTemplate, groups, registerGlobalPlayer } = useGamesContext();

	const [name, setName] = useState("");
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
	const [turnOrderEnabled, setTurnOrderEnabled] = useState(false);
	const [firstPlayerMode, setFirstPlayerMode] = useState<FirstPlayerMode>("rotation");
	const [firstPlayerSpecificId, setFirstPlayerSpecificId] = useState<string | null>(null);

	// Extras (optional)
	const [extraDice, setExtraDice] = useState(false);
	const [extraTimer, setExtraTimer] = useState(false);

	useEffect(() => {
		if (!templateId) return;
		const tmpl = getTemplate(templateId);
		if (!tmpl) return;
		setName(tmpl.name);
		setIsIndefinite(tmpl.totalRounds === undefined);
		setRoundCountStr(tmpl.totalRounds !== undefined ? tmpl.totalRounds.toString() : "10");
		setRankByLowest(tmpl.rankByLowest);
		if (tmpl.icon !== undefined) setSelectedIcon(tmpl.icon ?? null);
		if (tmpl.dealerEnabled !== undefined) setDealerEnabled(!!tmpl.dealerEnabled);
		if (tmpl.dealerMode !== undefined) setDealerMode(tmpl.dealerMode);
		if (tmpl.turnOrderEnabled !== undefined) setTurnOrderEnabled(!!tmpl.turnOrderEnabled);
		if (tmpl.firstPlayerSetting !== undefined) setFirstPlayerMode(tmpl.firstPlayerSetting);
		if (tmpl.extras !== undefined) {
			setExtraDice(!!tmpl.extras.dice);
			setExtraTimer(!!tmpl.extras.timer);
		}
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
	}, { deferGlobalSave: true });

	const removePlayer = useCallback((id: string) => {
		setPlayers((prev) => prev.filter((p) => p.id !== id));
	}, []);

	const handleCreate = useCallback(() => {
		if (players.length === 0) {
			setPlayersError(true);
			return;
		}
		for (const p of players) registerGlobalPlayer(p);
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
			players,
			totalRounds,
			rankByLowest,
			turnOrder: turnOrderEnabled ? players.map((p) => p.id) : undefined,
			firstPlayerId: resolvedFirstPlayerId,
			firstPlayerMode: resolvedFirstPlayerMode,
			dealerEnabled: dealerEnabled || undefined,
			dealerMode: dealerEnabled ? dealerMode : undefined,
			fixedDealerId: dealerEnabled && dealerMode === "fixed" ? (fixedDealerId ?? undefined) : undefined,
			extras: (extraDice || extraTimer) ? { dice: extraDice || undefined, timer: extraTimer || undefined } : undefined,
		});
		router.replace(`/game/${id}`);
	}, [
		name,
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
		extraDice, extraTimer, createGame, registerGlobalPlayer,
		router, selectedIcon,
	]);

	const availableGroups = groups.filter((g) => !g.playerIds.every((pid) => players.some((p) => p.id === pid)));

	// Derived hint text
	const dealerHint = getDealerHintText(dealerEnabled, dealerMode, players.find((p) => p.id === fixedDealerId)?.name);
	const turnHint = getTurnHintText(turnOrderEnabled, firstPlayerMode, players.find((p) => p.id === firstPlayerSpecificId)?.name);

	const innerInput = { backgroundColor: theme.background, color: theme.text } as const;

	const canCreate = players.length > 0;

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
					<SetupCard>
						<View style={forms.labelRow}>
							<ThemedText style={forms.label} themeColor="textSecondary">GAME NAME</ThemedText>
							<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary"> (OPTIONAL)</ThemedText>
						</View>
						<View style={forms.nameRow}>
							<HapticButton
								style={[forms.iconBtn, { backgroundColor: theme.background }]}
								onPress={() => router.push("/icon-picker")}
								activeOpacity={0.7}
							>
								<FontAwesome5 name={(selectedIcon ?? "users") as any} size={20} color={theme.textSecondary} />
							</HapticButton>
							<TextInput allowFontScaling={false}
								style={[shared.input, innerInput, { flex: 1 }]}
								placeholder="Untitled Game"
								placeholderTextColor={theme.textSecondary}
								value={name}
								onChangeText={setName}
								maxLength={30}
								returnKeyType="next"
							/>
						</View>
					</SetupCard>

					{/* Players */}
					<View style={styles.group}>
						<SectionHeader
							label="PLAYERS"
							trailing={
								<View style={forms.labelRow}>
									{playersError && players.length === 0 && (
										<ThemedText style={[forms.label, { color: theme.danger }]}> REQUIRED</ThemedText>
									)}
									{players.length > 0 && (
										<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary">
											{players.length}
										</ThemedText>
									)}
								</View>
							}
						/>
						<SetupCard error={playersError && players.length === 0}>
							{players.length > 0 && (
								<View style={forms.playerList}>
									{players.map((p) => (
										<PlayerRow key={p.id} name={p.name} onRemove={() => removePlayer(p.id)} />
									))}
								</View>
							)}

							<AddPlayerGroupRow
								playerOpen={activeDropdown === "player"}
								groupOpen={activeDropdown === "group"}
								showGroup={groups.length > 0}
								onTogglePlayer={() => toggleDropdown("player")}
								onToggleGroup={() => toggleDropdown("group")}
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
													<ThemedText type="small" style={{ color: theme.accent }}>+ Add</ThemedText>
												</HapticButton>
											))}
										</View>
									)}
									{filteredGlobalPlayers.length === 0 && playerSearch === "" && globalPlayers.length > 0 && (
										<ThemedText type="small" themeColor="textSecondary" style={forms.dropdownEmpty}>
											All saved players are in this game
										</ThemedText>
									)}
									{filteredGlobalPlayers.length === 0 && playerSearch === "" && globalPlayers.length === 0 && (
										<ThemedText type="small" themeColor="textSecondary" style={forms.dropdownEmpty}>
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
													onPress={() => addGroup(g.id)}
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

							{playersError && players.length === 0 && (
								<ThemedText style={forms.fieldError}>
									Add at least one player to create the game.
								</ThemedText>
							)}
						</SetupCard>
					</View>

					<View style={styles.group}>
						<SectionHeader label="GAME CONDITIONS" />

					{/* Rounds */}
					<SetupCard>
						<ThemedText style={forms.label} themeColor="textSecondary">ROUNDS</ThemedText>
						{!isIndefinite && (
							<View style={forms.roundsRow}>
								<HapticButton
									style={[forms.roundsInput, { backgroundColor: theme.backgroundSelected }]}
									onPress={() => setShowRoundNumpad(true)}
								>
									<ThemedText style={{ color: theme.text, fontSize: 16, textAlign: "center" }}>
										{roundCountStr || "—"}
									</ThemedText>
								</HapticButton>
								<ThemedText type="default">rounds</ThemedText>
							</View>
						)}
						<HapticButton
							style={[forms.toggleRow, { backgroundColor: theme.backgroundSelected }]}
							onPress={() => setIsIndefinite((v) => !v)}
						>
							<ThemedText type="default">Endless Mode</ThemedText>
							<View style={[forms.toggle, { backgroundColor: isIndefinite ? theme.accent : theme.backgroundElement }]}>
								<View style={[forms.toggleThumb, isIndefinite && forms.toggleThumbOn]} />
							</View>
						</HapticButton>
					</SetupCard>

					{/* Winner */}
					<SetupCard>
						<ThemedText style={forms.label} themeColor="textSecondary">WINNER</ThemedText>
						<View style={forms.segmentRow}>
							<HapticButton
								style={[forms.segLeft, { backgroundColor: !rankByLowest ? theme.accent : theme.backgroundSelected }]}
								onPress={() => setRankByLowest(false)}
							>
								<ThemedText type="small" style={{ color: !rankByLowest ? theme.accentText : theme.text }}>Highest score</ThemedText>
							</HapticButton>
							<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
							<HapticButton
								style={[forms.segRight, { backgroundColor: rankByLowest ? theme.accent : theme.backgroundSelected }]}
								onPress={() => setRankByLowest(true)}
							>
								<ThemedText type="small" style={{ color: rankByLowest ? theme.accentText : theme.text }}>Lowest score</ThemedText>
							</HapticButton>
						</View>
					</SetupCard>

					</View>

					{/* Options */}
					<View style={styles.group}>
						<SectionHeader label="OPTIONS" />

						{/* Dealer */}
						<OptionCard
							icon="crown"
							title="Dealer"
							subtitle="Track who deals each round"
							value={dealerEnabled}
							onToggle={() => {
								setDealerEnabled((v) => !v);
								setActiveDropdown(null);
							}}
						>
							<Pills
								options={DEALER_PILLS}
								value={dealerMode}
								onChange={(m) => {
									setDealerMode(m);
									if (m !== "random" && !fixedDealerId) setFixedDealerId(players[0]?.id ?? null);
									setActiveDropdown(null);
								}}
							/>
							{(dealerMode === "fixed" || dealerMode === "rotation") && (
								<PersonPicker
									players={players}
									selectedId={fixedDealerId}
									open={activeDropdown === "fixedDealer"}
									onToggleOpen={() => toggleDropdown("fixedDealer")}
									onSelect={(pid) => { setFixedDealerId(pid); setActiveDropdown(null); }}
									placeholder="Pick Dealer"
								/>
							)}
							{dealerHint && <ThemedText style={forms.hint}>{dealerHint}</ThemedText>}
						</OptionCard>

						{/* Goes first */}
						<OptionCard
							icon="long-arrow-alt-right"
							title="Goes first"
							subtitle="Track who starts each round"
							value={turnOrderEnabled}
							onToggle={() => {
								setTurnOrderEnabled((v) => !v);
								setActiveDropdown(null);
							}}
						>
							<Pills
								options={firstPlayerPills}
								value={firstPlayerMode}
								onChange={(m) => {
									setFirstPlayerMode(m);
									if (m === "rotation" && !firstPlayerSpecificId) setFirstPlayerSpecificId(players[0]?.id ?? null);
									setActiveDropdown(null);
								}}
							/>
							{firstPlayerMode === "rotation" && (
								<PersonPicker
									players={players}
									selectedId={firstPlayerSpecificId}
									open={activeDropdown === "firstPlayer"}
									onToggleOpen={() => toggleDropdown("firstPlayer")}
									onSelect={(pid) => { setFirstPlayerSpecificId(pid); setActiveDropdown(null); }}
									placeholder="Pick Player"
								/>
							)}
							{turnHint && <ThemedText style={forms.hint}>{turnHint}</ThemedText>}
						</OptionCard>

						{/* Dice */}
						<OptionCard
							icon="dice"
							title="Dice"
							subtitle="Show dice roller in game"
							value={extraDice}
							onToggle={() => setExtraDice((v) => !v)}
						/>

						{/* Timer */}
						<OptionCard
							icon="stopwatch"
							title="Timer"
							subtitle="Show timer in game"
							value={extraTimer}
							onToggle={() => setExtraTimer((v) => !v)}
						/>
					</View>

					{/* Create */}
					<View style={{ gap: Spacing.one }}>
						<HapticButton
							style={[shared.button, forms.createBtn, { backgroundColor: canCreate ? theme.accent : theme.backgroundElement, opacity: canCreate ? 1 : 0.6 }]}
							onPress={handleCreate}
							disabled={!canCreate}
						>
							<ThemedText type="smallBold" style={{ color: canCreate ? theme.accentText : theme.textSecondary }}>Create Game</ThemedText>
						</HapticButton>
						{!canCreate && (
							<ThemedText type="small" themeColor="textSecondary" style={{ textAlign: "center" }}>
								Add at least one player to start
							</ThemedText>
						)}
					</View>
				</ScrollView>
				<SafeAreaView edges={["bottom"]} />
			</KeyboardAvoidingView>

			<CellEditModal
				visible={showRoundNumpad}
				title="Number of Rounds"
				initialValue={parseInt(roundCountStr) || null}
				allowNegative={false}
				minValue={1}
				onSave={(v) => { setRoundCountStr(v && v > 0 ? v.toString() : "10"); setShowRoundNumpad(false); }}
				onCancel={() => setShowRoundNumpad(false)}
			/>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
	group: { gap: Spacing.two },
});
