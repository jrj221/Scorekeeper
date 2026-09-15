import { getDealerHintText, getTurnHintText } from "@/utils/game";
import { consumePendingIcon } from "@/utils/icon-picker-state";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CellEditModal } from "@/components/cell-edit-modal";
import { HapticButton } from "@/components/haptic-button";
import { DEALER_PILLS, SectionHeader } from "@/components/setup-form";
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
import { Spacing } from "@/constants/theme";
import { Player, useGamesContext } from "@/context/games-context";
import { getGameType } from "@/game-types/registry";
import { useDraft } from "@/hooks/use-draft";
import { usePlayerSearch } from "@/hooks/use-player-search";
import { useTheme } from "@/hooks/use-theme";
import { useUnsavedChangesScroll } from "@/hooks/use-unsaved-changes-scroll";
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
	const locked = new Set(draft.lockedFields ?? []);

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

	const dealerEnabled = !!draft.dealerEnabled;
	const dealerMode = draft.dealerMode ?? "rotation";
	const fixedDealerId = draft.fixedDealerId ?? null;
	const turnsEnabled = !!draft.turnOrderEnabled;
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

	const gameTypeDef = getGameType(game);

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
					{/* Game Name & Icon — hidden entirely when locked (e.g. Phase 10), since showing
					    it read-only still makes it look editable when it isn't. */}
					{!locked.has("name") && (
						<GameNameCard
							icon={draft.icon}
							onPressIcon={() => router.push("/icon-picker")}
							name={draft.name ?? ""}
							nameEditable={!finished}
							showIcon={!finished}
							onChangeName={(v) => patch({ name: v })}
							returnKeyType="done"
						/>
					)}

					<PlayersSection
						players={players}
						globalPlayers={globalPlayers}
						groups={groups}
						finished={finished}
						removePlayerHint={removePlayerHint}
						onRemovePlayer={(p) => {
							setRemovePlayerHint(false);
							handleRemovePlayer(p);
						}}
						activeDropdown={activeDropdown}
						onTogglePlayerDropdown={() => setActiveDropdown((prev) => (prev === "player" ? null : "player"))}
						onToggleGroupDropdown={() => setActiveDropdown((prev) => (prev === "group" ? null : "group"))}
						playerSearch={playerSearch}
						setPlayerSearch={setPlayerSearch}
						playerSearchError={playerSearchError}
						playerSearchRef={playerSearchRef}
						filteredGlobalPlayers={filteredGlobalPlayers}
						onSubmitPlayerSearch={() => {
							pendingScrollAdjust.current = true;
							submitPlayerSearch();
						}}
						onAddExistingPlayer={(id, name) => {
							pendingScrollAdjust.current = true;
							addExistingPlayer(id, name);
						}}
						onAddGroup={(id) => {
							pendingScrollAdjust.current = true;
							addGroup(id);
						}}
						autoFocusSearch
						onPlayerListLayout={(e) => {
							const h = e.nativeEvent.layout.height;
							const delta = h - playerListHeightRef.current;
							playerListHeightRef.current = h;
							if (pendingScrollAdjust.current && delta !== 0) {
								pendingScrollAdjust.current = false;
								const target = Math.max(0, scrollYRef.current + delta);
								scrollRef.current?.scrollTo({ y: target, animated: true });
							}
						}}
					/>

					{!(locked.has("rounds") && locked.has("rankByLowest")) && (
						<GameConditionsSection
							showRounds={!locked.has("rounds")}
							showWinner={!locked.has("rankByLowest")}
							finished={finished}
							totalRounds={draft.totalRounds}
							onPressRounds={() => setShowRoundNumpad(true)}
							onToggleIndefinite={() =>
								patch({ totalRounds: draft.totalRounds === undefined ? 10 : undefined })
							}
							rankByLowest={finished ? game.rankByLowest : draft.rankByLowest}
							onChangeRankByLowest={(v) => patch({ rankByLowest: v })}
						/>
					)}

					{gameTypeDef.infoSections?.(game)}

					{/* Options */}
					<View style={styles.group}>
						<SectionHeader label="OPTIONS" />

						<DealerOptionCard
							finished={finished}
							enabled={dealerEnabled}
							onToggleEnabled={() => {
								patch({ dealerEnabled: dealerEnabled ? undefined : true });
								setActiveDropdown(null);
							}}
							mode={dealerMode}
							onChangeMode={(m) => {
								if (m === "random") patch({ dealerMode: "random" });
								else patch({ dealerMode: m, fixedDealerId: fixedDealerId ?? players[0]?.id });
								setActiveDropdown(null);
							}}
							pillOptions={DEALER_PILLS}
							players={players}
							fixedDealerId={fixedDealerId}
							onSelectFixedDealer={(pid) => {
								patch({ fixedDealerId: pid });
								setActiveDropdown(null);
							}}
							dropdownOpen={activeDropdown === "fixedDealer"}
							onToggleDropdown={() =>
								setActiveDropdown((prev) => (prev === "fixedDealer" ? null : "fixedDealer"))
							}
							hint={dealerHint}
						/>

						<FirstPlayerOptionCard
							finished={finished}
							enabled={turnsEnabled}
							onToggleEnabled={() => {
								patch({ turnOrderEnabled: !turnsEnabled });
								setActiveDropdown(null);
							}}
							mode={firstPlayerMode}
							onChangeMode={(m) => {
								if (m === "left-of-dealer") patch({ firstPlayerMode: "left-of-dealer", firstPlayerId: undefined });
								else if (m === "rotation")
									patch({ firstPlayerMode: undefined, firstPlayerId: firstPlayerId ?? players[0]?.id });
								else patch({ firstPlayerMode: undefined, firstPlayerId: undefined });
								setActiveDropdown(null);
							}}
							dealerEnabled={dealerEnabled}
							players={players}
							selectedPlayerId={firstPlayerId}
							onSelectPlayer={(pid) => {
								patch({ firstPlayerMode: undefined, firstPlayerId: pid });
								setActiveDropdown(null);
							}}
							dropdownOpen={activeDropdown === "firstPlayer"}
							onToggleDropdown={() =>
								setActiveDropdown((prev) => (prev === "firstPlayer" ? null : "firstPlayer"))
							}
							hint={turnHint}
						/>

						{!finished && (
							<ExtrasOptionCards
								hideDice={locked.has("extras.dice")}
								hideTimer={locked.has("extras.timer")}
								dice={!!draft.extras?.dice}
								onToggleDice={() => patch({ extras: { ...draft.extras, dice: !draft.extras?.dice } })}
								timer={!!draft.extras?.timer}
								onToggleTimer={() => patch({ extras: { ...draft.extras, timer: !draft.extras?.timer } })}
							/>
						)}
					</View>

					{/* Cancel / Save Changes */}
					{!finished && isDirty && (
						<View style={[styles.actionsContainer, highlightStyle]}>
							<HapticButton
								style={[styles.cancelBtn, { backgroundColor: theme.backgroundElement }]}
								onPress={() => {
									exitSafely();
									resetDraft();
									router.back();
								}}
							>
								<ThemedText type="small" themeColor="textSecondary">
									Cancel Changes
								</ThemedText>
							</HapticButton>
							<HapticButton
								style={[styles.templateBtn, { backgroundColor: theme.accent }]}
								onPress={() => {
									exitSafely();
									saveDraft();
									router.back();
								}}
							>
								<ThemedText type="smallBold" style={{ color: theme.accentText }}>
									Save Changes
								</ThemedText>
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
