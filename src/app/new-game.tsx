"use client";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CellEditModal } from "@/components/cell-edit-modal";
import { HapticButton } from "@/components/haptic-button";
import {
	DealerOptionCard,
	ExtrasOptionCards,
	FirstPlayerOptionCard,
	GameConditionsSection,
	GameNameCard,
	PlayersSection,
} from "@/components/setup";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getClassicGame } from "@/constants/classic-games";
import { Spacing } from "@/constants/theme";
import { DealerMode, GameType, Player, useGamesContext } from "@/context/games-context";
import { DEALER_PILLS, SectionHeader } from "@/components/setup-form";
import { getGameType } from "@/game-types/registry";
import { usePlayerSearch } from "@/hooks/use-player-search";
import { useTheme } from "@/hooks/use-theme";
import { forms } from "@/styles/forms";
import { shared } from "@/styles/shared";
import { getDealerHintText, getTurnHintText } from "@/utils/game";
import { consumePendingIcon } from "@/utils/icon-picker-state";

type ActiveDropdown = "player" | "group" | "fixedDealer" | "firstPlayer" | null;
type FirstPlayerMode = "random" | "left-of-dealer" | "rotation";
type PhaseSubsetChoice = "all" | "odd" | "even";

export default function NewGameScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { templateId, classicId } = useLocalSearchParams<{ templateId?: string; classicId?: string }>();
	const { createGame, globalPlayers, groups, registerGlobalPlayer, getTemplate } = useGamesContext();

	const [name, setName] = useState("");
	const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

	useFocusEffect(
		useCallback(() => {
			const icon = consumePendingIcon();
			if (icon !== undefined) setSelectedIcon(icon);
		}, []),
	);
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

	// Classic games (optional) — locked rule fields, e.g. Phase 10
	const [gameType, setGameType] = useState<GameType | undefined>(undefined);
	const [lockedFields, setLockedFields] = useState<string[]>([]);
	const [phaseSubsetChoice, setPhaseSubsetChoice] = useState<PhaseSubsetChoice>("all");
	const locked = new Set(lockedFields);

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

	useEffect(() => {
		if (!classicId) return;
		const classic = getClassicGame(classicId);
		if (!classic) return;
		setName(classic.name);
		setSelectedIcon(classic.icon ?? null);
		setRankByLowest(classic.rankByLowest);
		setIsIndefinite(classic.totalRounds === undefined);
		setGameType(classic.gameType);
		setLockedFields(classic.lockedFields ?? []);
		if (classic.lockedFields?.includes("extras.dice")) setExtraDice(false);
		if (classic.lockedFields?.includes("extras.timer")) setExtraTimer(false);
	}, [classicId]);

	const toggleDropdown = (d: ActiveDropdown) => setActiveDropdown((prev) => (prev === d ? null : d));

	const {
		playerSearch,
		setPlayerSearch,
		playerSearchError,
		playerSearchRef,
		filteredGlobalPlayers,
		addById: addExistingPlayer,
		submit: submitPlayerSearch,
		addGroup,
	} = usePlayerSearch(
		players,
		(next) => {
			setPlayers(next);
			setPlayersError(false);
		},
		{ deferGlobalSave: true },
	);

	const removePlayer = useCallback((p: Player) => {
		setPlayers((prev) => prev.filter((pl) => pl.id !== p.id));
	}, []);

	const handleCreate = useCallback(() => {
		if (players.length === 0) {
			setPlayersError(true);
			return;
		}
		for (const p of players) registerGlobalPlayer(p);
		const totalRounds = locked.has("rounds")
			? undefined
			: !isIndefinite
				? Math.max(1, parseInt(roundCountStr, 10) || 1)
				: undefined;

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
			extras:
				extraDice || extraTimer ? { dice: extraDice || undefined, timer: extraTimer || undefined } : undefined,
			gameType,
			lockedFields: lockedFields.length > 0 ? lockedFields : undefined,
			phaseSubset: gameType === "phase10" && phaseSubsetChoice !== "all" ? phaseSubsetChoice : undefined,
		});
		router.replace(`/game/${id}`);
	}, [
		name,
		players,
		isIndefinite,
		roundCountStr,
		rankByLowest,
		gameType,
		lockedFields,
		phaseSubsetChoice,
		turnOrderEnabled,
		firstPlayerMode,
		firstPlayerSpecificId,
		dealerEnabled,
		dealerMode,
		fixedDealerId,
		extraDice,
		extraTimer,
		createGame,
		registerGlobalPlayer,
		router,
		selectedIcon,
	]);

	// Derived hint text
	const dealerHint = getDealerHintText(dealerEnabled, dealerMode, players.find((p) => p.id === fixedDealerId)?.name);
	const turnHint = getTurnHintText(
		turnOrderEnabled,
		firstPlayerMode,
		players.find((p) => p.id === firstPlayerSpecificId)?.name,
	);

	const canCreate = players.length > 0;

	const gameTypeDef = getGameType({ gameType });

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: templateId ? "New Game from Template" : "New Game" }} />
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<ScrollView
					contentContainerStyle={styles.scroll}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<GameNameCard
						icon={selectedIcon}
						iconEditable={!locked.has("icon")}
						onPressIcon={() => router.push("/icon-picker")}
						name={name}
						nameEditable={!locked.has("name")}
						onChangeName={setName}
						optional={!locked.has("name")}
					/>

					<PlayersSection
						players={players}
						globalPlayers={globalPlayers}
						groups={groups}
						requiredError={playersError}
						onRemovePlayer={removePlayer}
						activeDropdown={activeDropdown}
						onTogglePlayerDropdown={() => toggleDropdown("player")}
						onToggleGroupDropdown={() => toggleDropdown("group")}
						playerSearch={playerSearch}
						setPlayerSearch={setPlayerSearch}
						playerSearchError={playerSearchError}
						playerSearchRef={playerSearchRef}
						filteredGlobalPlayers={filteredGlobalPlayers}
						onSubmitPlayerSearch={submitPlayerSearch}
						onAddExistingPlayer={addExistingPlayer}
						onAddGroup={addGroup}
					/>

					{!(locked.has("rounds") && locked.has("rankByLowest")) && (
						<GameConditionsSection
							showRounds={!locked.has("rounds")}
							showWinner={!locked.has("rankByLowest")}
							totalRounds={isIndefinite ? undefined : parseInt(roundCountStr, 10) || undefined}
							onPressRounds={() => setShowRoundNumpad(true)}
							onToggleIndefinite={() => setIsIndefinite((v) => !v)}
							rankByLowest={rankByLowest}
							onChangeRankByLowest={setRankByLowest}
						/>
					)}

					{gameTypeDef.setupSections?.(
						{ phaseSubsetChoice },
						{ onChangePhaseSubset: setPhaseSubsetChoice },
					)}

					{/* Options */}
					<View style={styles.group}>
						<SectionHeader label="OPTIONS" />
						<DealerOptionCard
							enabled={dealerEnabled}
							onToggleEnabled={() => {
								setDealerEnabled((v) => !v);
								setActiveDropdown(null);
							}}
							mode={dealerMode}
							onChangeMode={(m) => {
								setDealerMode(m);
								if (m !== "random" && !fixedDealerId) setFixedDealerId(players[0]?.id ?? null);
								setActiveDropdown(null);
							}}
							pillOptions={DEALER_PILLS}
							players={players}
							fixedDealerId={fixedDealerId}
							onSelectFixedDealer={(pid) => {
								setFixedDealerId(pid);
								setActiveDropdown(null);
							}}
							dropdownOpen={activeDropdown === "fixedDealer"}
							onToggleDropdown={() => toggleDropdown("fixedDealer")}
							hint={dealerHint}
						/>

						<FirstPlayerOptionCard
							enabled={turnOrderEnabled}
							onToggleEnabled={() => {
								setTurnOrderEnabled((v) => !v);
								setActiveDropdown(null);
							}}
							mode={firstPlayerMode}
							onChangeMode={(m) => {
								setFirstPlayerMode(m);
								if (m === "rotation" && !firstPlayerSpecificId)
									setFirstPlayerSpecificId(players[0]?.id ?? null);
								setActiveDropdown(null);
							}}
							dealerEnabled={dealerEnabled}
							players={players}
							selectedPlayerId={firstPlayerSpecificId}
							onSelectPlayer={(pid) => {
								setFirstPlayerSpecificId(pid);
								setActiveDropdown(null);
							}}
							dropdownOpen={activeDropdown === "firstPlayer"}
							onToggleDropdown={() => toggleDropdown("firstPlayer")}
							hint={turnHint}
						/>

						<ExtrasOptionCards
							hideDice={locked.has("extras.dice")}
							hideTimer={locked.has("extras.timer")}
							dice={extraDice}
							onToggleDice={() => setExtraDice((v) => !v)}
							timer={extraTimer}
							onToggleTimer={() => setExtraTimer((v) => !v)}
						/>
					</View>

					{/* Create */}
					<View style={{ gap: Spacing.one }}>
						<HapticButton
							style={[
								shared.button,
								forms.createBtn,
								{
									backgroundColor: canCreate ? theme.accent : theme.backgroundElement,
									opacity: canCreate ? 1 : 0.6,
								},
							]}
							onPress={handleCreate}
							disabled={!canCreate}
						>
							<ThemedText type="smallBold" style={{ color: canCreate ? theme.accentText : theme.textSecondary }}>
								Create Game
							</ThemedText>
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
	group: { gap: Spacing.two },
});
