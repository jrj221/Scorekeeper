import { RefObject } from "react";
import { TextInput, View } from "react-native";

import { HapticButton } from "@/components/haptic-button";
import { AddPlayerGroupRow, PlayerRow, SectionHeader, SetupCard } from "@/components/setup-form";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { Player, PlayerGroup } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { forms } from "@/styles/forms";
import { shared } from "@/styles/shared";

export type ActiveDropdown = "player" | "group" | "fixedDealer" | "firstPlayer" | null;

/**
 * The full "PLAYERS" card: player list, add-player/add-group dropdowns (search +
 * global-player list + group list), and error/hint states. Pasted near-identically
 * across new-game.tsx and info.tsx; this is the single shared composition, wired to
 * `usePlayerSearch` by the caller (controlled component — no data fetching here).
 */
export function PlayersSection({
	players,
	globalPlayers,
	groups,
	finished = false,
	requiredError = false,
	removePlayerHint = false,
	onRemovePlayer,
	activeDropdown,
	onTogglePlayerDropdown,
	onToggleGroupDropdown,
	playerSearch,
	setPlayerSearch,
	playerSearchError,
	playerSearchRef,
	filteredGlobalPlayers,
	onSubmitPlayerSearch,
	onAddExistingPlayer,
	onAddGroup,
	autoFocusSearch = false,
	onPlayerListLayout,
}: {
	players: Player[];
	globalPlayers: { id: string; name: string }[];
	groups: PlayerGroup[];
	finished?: boolean;
	/** New-game's "add at least one player" required-field error. */
	requiredError?: boolean;
	/** Info screen's "a game requires at least one player" removal hint. */
	removePlayerHint?: boolean;
	onRemovePlayer: (p: Player) => void;
	activeDropdown: ActiveDropdown;
	onTogglePlayerDropdown: () => void;
	onToggleGroupDropdown: () => void;
	playerSearch: string;
	setPlayerSearch: (v: string) => void;
	playerSearchError?: string;
	playerSearchRef: RefObject<TextInput | null>;
	filteredGlobalPlayers: { id: string; name: string }[];
	onSubmitPlayerSearch: () => void;
	onAddExistingPlayer: (id: string, name: string) => void;
	onAddGroup: (id: string) => void;
	autoFocusSearch?: boolean;
	onPlayerListLayout?: (e: any) => void;
}) {
	const theme = useTheme();
	const innerInput = { backgroundColor: theme.background, color: theme.text } as const;
	const availableGroups = groups.filter(
		(g) => !g.playerIds.every((pid: string) => players.some((p) => p.id === pid))
	);

	return (
		<View style={{ gap: Spacing.two }}>
			<SectionHeader
				label="PLAYERS"
				trailing={
					<View style={forms.labelRow}>
						{requiredError && players.length === 0 && (
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
			<SetupCard error={requiredError && players.length === 0}>
				{finished ? (
					<ThemedText type="default">{players.map((p) => p.name).join(", ")}</ThemedText>
				) : (
					<>
						{removePlayerHint && (
							<ThemedText style={forms.fieldError}>A game requires at least one player.</ThemedText>
						)}
						{players.length > 0 && (
							<View style={forms.playerList} onLayout={onPlayerListLayout}>
								{players.map((p) => (
									<PlayerRow key={p.id} name={p.name} onRemove={() => onRemovePlayer(p)} />
								))}
							</View>
						)}

						<AddPlayerGroupRow
							playerOpen={activeDropdown === "player"}
							groupOpen={activeDropdown === "group"}
							showGroup={groups.length > 0}
							onTogglePlayer={onTogglePlayerDropdown}
							onToggleGroup={onToggleGroupDropdown}
						/>

						{activeDropdown === "player" && (
							<View
								style={[forms.dropdown, { backgroundColor: theme.backgroundSelected, borderColor: theme.background }]}
							>
								<View style={{ gap: 4 }}>
									<TextInput
										allowFontScaling={false}
										ref={playerSearchRef}
										style={[shared.input, innerInput]}
										placeholder="Search or enter new name"
										placeholderTextColor={theme.textSecondary}
										value={playerSearch}
										onChangeText={setPlayerSearch}
										onSubmitEditing={onSubmitPlayerSearch}
										maxLength={15}
										returnKeyType="done"
										submitBehavior="submit"
										autoFocus={autoFocusSearch}
									/>
									{playerSearchError ? (
										<ThemedText style={forms.inputError}>{playerSearchError}</ThemedText>
									) : null}
								</View>
								{filteredGlobalPlayers.length > 0 && (
									<View style={[forms.dropdownList, { borderTopColor: theme.background }]}>
										{filteredGlobalPlayers.map((gp, i) => (
											<HapticButton
												key={gp.id}
												style={[
													forms.dropdownRow,
													{ borderBottomColor: theme.background },
													i === filteredGlobalPlayers.length - 1 && { borderBottomWidth: 0 },
												]}
												onPress={() => onAddExistingPlayer(gp.id, gp.name)}
											>
												<ThemedText type="default">{gp.name}</ThemedText>
												<ThemedText type="small" style={{ color: theme.accent }}>
													+ Add
												</ThemedText>
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
										Press return to add &quot;{playerSearch}&quot;
									</ThemedText>
								)}
							</View>
						)}

						{activeDropdown === "group" && (
							<View
								style={[forms.dropdown, { backgroundColor: theme.backgroundSelected, borderColor: theme.background }]}
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
												onPress={() => onAddGroup(g.id)}
											>
												<View style={{ flex: 1 }}>
													<ThemedText type="default">{g.name}</ThemedText>
													{memberNames ? (
														<ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
															{memberNames}
														</ThemedText>
													) : null}
												</View>
												<ThemedText type="small" style={{ color: theme.accent }}>
													+ Add
												</ThemedText>
											</HapticButton>
										);
									})
								)}
							</View>
						)}

						{requiredError && players.length === 0 && (
							<ThemedText style={forms.fieldError}>Add at least one player to create the game.</ThemedText>
						)}
					</>
				)}
			</SetupCard>
		</View>
	);
}
