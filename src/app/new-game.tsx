"use client";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
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
import { DealerMode, Player, useGamesContext } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";

type ActiveDropdown = "player" | "group" | "fixedDealer" | "firstPlayer" | null;

export default function NewGameScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { templateId } = useLocalSearchParams<{ templateId?: string }>();
	const { createGame, globalPlayers, addGlobalPlayer, getTemplate, groups } = useGamesContext();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [players, setPlayers] = useState<Player[]>([]);
	const [isIndefinite, setIsIndefinite] = useState(false);
	const [roundCountStr, setRoundCountStr] = useState("10");
	const [showRoundNumpad, setShowRoundNumpad] = useState(false);
	const [rankByLowest, setRankByLowest] = useState(false);

	const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
	const [playerSearch, setPlayerSearch] = useState("");
	const [playerSearchError, setPlayerSearchError] = useState("");
	const playerSearchRef = useRef<TextInput>(null);

	// Dealer / turns
	const [dealerEnabled, setDealerEnabled] = useState(false);
	const [dealerMode, setDealerMode] = useState<DealerMode>('right-of-first');
	const [fixedDealerId, setFixedDealerId] = useState<string | null>(null);
	const [firstPlayerRandom, setFirstPlayerRandom] = useState(true);
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

	const toggleDropdown = (d: ActiveDropdown) =>
		setActiveDropdown(prev => (prev === d ? null : d));

	const addExistingPlayer = useCallback((id: string, playerName: string) => {
		setPlayers(prev => prev.some(p => p.id === id) ? prev : [...prev, { id, name: playerName }]);
		setPlayerSearch("");
		setPlayerSearchError("");
	}, []);

	const submitPlayerSearch = useCallback(() => {
		const trimmed = playerSearch.trim();
		if (!trimmed) return;
		// Check exact match in global players first
		const match = globalPlayers.find(gp =>
			gp.name.toLowerCase() === trimmed.toLowerCase() && !players.some(p => p.id === gp.id)
		);
		if (match) {
			addExistingPlayer(match.id, match.name);
			return;
		}
		if (players.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
			setPlayerSearchError(`"${trimmed}" is already added`);
			return;
		}
		setPlayerSearchError("");
		const global = addGlobalPlayer(trimmed);
		const player = global ?? { id: `p_${Date.now()}`, name: trimmed };
		setPlayers(prev => prev.some(p => p.id === player.id) ? prev : [...prev, player]);
		setPlayerSearch("");
		playerSearchRef.current?.focus();
	}, [playerSearch, players, globalPlayers, addGlobalPlayer, addExistingPlayer]);

	const removePlayer = useCallback((id: string) => {
		setPlayers(prev => prev.filter(p => p.id !== id));
	}, []);

	const addGroup = useCallback((groupId: string) => {
		const group = groups.find(g => g.id === groupId);
		if (!group) return;
		setPlayers(prev => {
			const toAdd = group.playerIds
				.filter(pid => !prev.some(p => p.id === pid))
				.map(pid => {
					const gp = globalPlayers.find(p => p.id === pid);
					return gp ? { id: gp.id, name: gp.name } : null;
				})
				.filter((p): p is Player => p !== null);
			return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
		});
	}, [groups, globalPlayers]);

	const handleCreate = useCallback(() => {
		const trimmedName = name.trim();
		if (!trimmedName || players.length === 0) return;
		const totalRounds = !isIndefinite ? Math.max(1, parseInt(roundCountStr, 10) || 1) : undefined;
		const turnOrder = players.map(p => p.id);

		let resolvedFirstPlayerId: string | undefined;
		if (dealerEnabled) {
			if (firstPlayerRandom) {
				resolvedFirstPlayerId = players[Math.floor(Math.random() * players.length)]?.id;
			} else {
				resolvedFirstPlayerId = firstPlayerSpecificId ?? players[0]?.id;
			}
		}

		const id = createGame({
			name: trimmedName,
			description: description.trim() || undefined,
			players,
			totalRounds,
			rankByLowest,
			turnOrder,
			dealerEnabled: dealerEnabled || undefined,
			dealerMode: dealerEnabled ? dealerMode : undefined,
			fixedDealerId: dealerEnabled && dealerMode === 'fixed' ? fixedDealerId ?? undefined : undefined,
			firstPlayerId: resolvedFirstPlayerId,
		});
		router.replace(`/game/${id}`);
	}, [name, description, players, isIndefinite, roundCountStr, rankByLowest, dealerEnabled, dealerMode, fixedDealerId, firstPlayerRandom, firstPlayerSpecificId, createGame, router]);

	const canCreate = name.trim().length > 0 && players.length > 0;

	// Players available to add, filtered by search
	const filteredGlobalPlayers = globalPlayers.filter(gp =>
		!players.some(p => p.id === gp.id) &&
		(playerSearch === "" || gp.name.toLowerCase().includes(playerSearch.toLowerCase()))
	);

	// Groups where not all players are already added
	const availableGroups = groups.filter(g =>
		!g.playerIds.every(pid => players.some(p => p.id === pid))
	);

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
					<View style={styles.section}>
						<ThemedText style={styles.label} themeColor="textSecondary">GAME NAME</ThemedText>
						<TextInput
							style={[shared.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
							placeholder="Enter game name"
							placeholderTextColor={theme.textSecondary}
							value={name}
							onChangeText={setName}
							maxLength={30}
							returnKeyType="next"
						/>
					</View>

					{/* Description */}
					<View style={styles.section}>
						<View style={styles.labelRow}>
							<ThemedText style={styles.label} themeColor="textSecondary">DESCRIPTION</ThemedText>
							<ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary"> (OPTIONAL)</ThemedText>
						</View>
						<TextInput
							style={[shared.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
							placeholder="Add a description"
							placeholderTextColor={theme.textSecondary}
							value={description}
							onChangeText={setDescription}
							maxLength={80}
							returnKeyType="next"
						/>
					</View>

					{/* Players */}
					<View style={styles.section}>
						<View style={styles.labelRow}>
							<ThemedText style={styles.label} themeColor="textSecondary">PLAYERS</ThemedText>
							{players.length > 0 && (
								<ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary">
									{" "}{players.length}
								</ThemedText>
							)}
						</View>

						{/* Selected player chips */}
						{players.length > 0 && (
							<View style={styles.chipRow}>
								{players.map(p => (
									<TouchableOpacity
										key={p.id}
										style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}
										onPress={() => removePlayer(p.id)}
									>
										<ThemedText type="small">{p.name}</ThemedText>
										<ThemedText type="small" themeColor="textSecondary"> ×</ThemedText>
									</TouchableOpacity>
								))}
							</View>
						)}

						{/* Dropdown trigger buttons */}
						<View style={styles.dropdownBtns}>
							<TouchableOpacity
								style={[
									styles.dropdownTrigger,
									{ backgroundColor: theme.backgroundElement },
									activeDropdown === "player" && { backgroundColor: theme.backgroundSelected },
								]}
								onPress={() => toggleDropdown("player")}
							>
								<ThemedText type="small" style={{ color: '#0077B6' }}>Add Player</ThemedText>
								<ThemedText style={styles.chevron}>{activeDropdown === "player" ? "▴" : "▾"}</ThemedText>
							</TouchableOpacity>

							{groups.length > 0 && (
								<TouchableOpacity
									style={[
										styles.dropdownTrigger,
										{ backgroundColor: theme.backgroundElement },
										activeDropdown === "group" && { backgroundColor: theme.backgroundSelected },
									]}
									onPress={() => toggleDropdown("group")}
								>
									<ThemedText type="small" style={{ color: '#0077B6' }}>Add Group</ThemedText>
									<ThemedText style={styles.chevron}>{activeDropdown === "group" ? "▴" : "▾"}</ThemedText>
								</TouchableOpacity>
							)}
						</View>

						{/* Player dropdown */}
						{activeDropdown === "player" && (
							<View style={[styles.dropdown, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
								<View style={{ gap: 4 }}>
									<TextInput
										ref={playerSearchRef}
										style={[shared.input, { backgroundColor: theme.background, color: theme.text }]}
										placeholder="Search or enter new name"
										placeholderTextColor={theme.textSecondary}
										value={playerSearch}
										onChangeText={v => { setPlayerSearch(v); setPlayerSearchError(""); }}
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
									<View style={[styles.dropdownList, { borderTopColor: theme.backgroundSelected }]}>
										{filteredGlobalPlayers.map((gp, i) => (
											<TouchableOpacity
												key={gp.id}
												style={[
													styles.dropdownRow,
													{ borderBottomColor: theme.backgroundSelected },
													i === filteredGlobalPlayers.length - 1 && { borderBottomWidth: 0 },
												]}
												onPress={() => addExistingPlayer(gp.id, gp.name)}
											>
												<ThemedText type="default">{gp.name}</ThemedText>
												<ThemedText type="small" style={{ color: '#0077B6' }}>+ Add</ThemedText>
											</TouchableOpacity>
										))}
									</View>
								)}
								{filteredGlobalPlayers.length === 0 && playerSearch === "" && globalPlayers.length > 0 && (
									<ThemedText type="small" themeColor="textSecondary" style={styles.dropdownEmpty}>
										All saved players are in this game
									</ThemedText>
								)}
								{filteredGlobalPlayers.length === 0 && playerSearch === "" && globalPlayers.length === 0 && (
									<ThemedText type="small" themeColor="textSecondary" style={styles.dropdownEmpty}>
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

						{/* Group dropdown */}
						{activeDropdown === "group" && (
							<View style={[styles.dropdown, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
								{availableGroups.length === 0 ? (
									<ThemedText type="small" themeColor="textSecondary" style={styles.dropdownEmpty}>
										All groups are already in this game
									</ThemedText>
								) : (
									availableGroups.map((g, i) => {
										const memberNames = g.playerIds
											.map(pid => globalPlayers.find(p => p.id === pid)?.name)
											.filter(Boolean)
											.join(', ');
										return (
											<TouchableOpacity
												key={g.id}
												style={[
													styles.dropdownRow,
													{ borderBottomColor: theme.backgroundSelected },
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
												<ThemedText type="small" style={{ color: '#0077B6' }}>+ Add</ThemedText>
											</TouchableOpacity>
										);
									})
								)}
							</View>
						)}
					</View>

					{/* Dealer & Turns */}
					<View style={styles.section}>
						<View style={styles.labelRow}>
							<ThemedText style={styles.label} themeColor="textSecondary">DEALER &amp; TURNS</ThemedText>
						</View>
						<TouchableOpacity
							style={[styles.toggleRow, { backgroundColor: theme.backgroundElement }]}
							onPress={() => { setDealerEnabled(v => !v); setActiveDropdown(null); }}
						>
							<ThemedText type="default">Enable Dealer</ThemedText>
							<View style={[styles.toggle, { backgroundColor: dealerEnabled ? '#0077B6' : theme.backgroundSelected }]}>
								<View style={[styles.toggleThumb, dealerEnabled && styles.toggleThumbOn]} />
							</View>
						</TouchableOpacity>

						{dealerEnabled && (
							<>
								{/* Dealer mode */}
								<ThemedText style={[styles.label, { opacity: 0.7 }]} themeColor="textSecondary">DEALER IS</ThemedText>
								<View style={styles.segmentRow}>
									<TouchableOpacity
										style={[styles.segLeft, { backgroundColor: dealerMode === 'right-of-first' ? '#0077B6' : theme.backgroundElement }]}
										onPress={() => setDealerMode('right-of-first')}
									>
										<ThemedText type="small" style={{ color: dealerMode === 'right-of-first' ? '#fff' : theme.text }}>Right of First</ThemedText>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.segMid, { backgroundColor: dealerMode === 'random' ? '#0077B6' : theme.backgroundElement }]}
										onPress={() => setDealerMode('random')}
									>
										<ThemedText type="small" style={{ color: dealerMode === 'random' ? '#fff' : theme.text }}>Random</ThemedText>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.segRight, { backgroundColor: dealerMode === 'fixed' ? '#0077B6' : theme.backgroundElement }]}
										onPress={() => setDealerMode('fixed')}
									>
										<ThemedText type="small" style={{ color: dealerMode === 'fixed' ? '#fff' : theme.text }}>Fixed</ThemedText>
									</TouchableOpacity>
								</View>

								{/* Fixed dealer picker */}
								{dealerMode === 'fixed' && (
									<>
										<TouchableOpacity
											style={[
												styles.dropdownTrigger,
												{ backgroundColor: theme.backgroundElement },
												activeDropdown === 'fixedDealer' && { backgroundColor: theme.backgroundSelected },
											]}
											onPress={() => toggleDropdown('fixedDealer')}
										>
											<ThemedText type="small" style={{ color: '#0077B6' }}>
												{fixedDealerId ? (players.find(p => p.id === fixedDealerId)?.name ?? 'Pick Dealer') : 'Pick Dealer'}
											</ThemedText>
											<ThemedText style={styles.chevron}>{activeDropdown === 'fixedDealer' ? '▴' : '▾'}</ThemedText>
										</TouchableOpacity>
										{activeDropdown === 'fixedDealer' && (
											<View style={[styles.dropdown, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
												{players.length === 0 ? (
													<ThemedText type="small" themeColor="textSecondary" style={styles.dropdownEmpty}>Add players first</ThemedText>
												) : players.map((p, i) => (
													<TouchableOpacity
														key={p.id}
														style={[styles.dropdownRow, { borderBottomColor: theme.backgroundSelected }, i === players.length - 1 && { borderBottomWidth: 0 }]}
														onPress={() => { setFixedDealerId(p.id); setActiveDropdown(null); }}
													>
														<ThemedText type="default">{p.name}</ThemedText>
														{fixedDealerId === p.id && <ThemedText type="small" style={{ color: '#0077B6' }}>✓</ThemedText>}
													</TouchableOpacity>
												))}
											</View>
										)}
									</>
								)}

								{/* Who goes first */}
								<ThemedText style={[styles.label, { opacity: 0.7 }]} themeColor="textSecondary">WHO GOES FIRST</ThemedText>
								<View style={styles.segmentRow}>
									<TouchableOpacity
										style={[styles.segLeft, { backgroundColor: firstPlayerRandom ? '#0077B6' : theme.backgroundElement }]}
										onPress={() => setFirstPlayerRandom(true)}
									>
										<ThemedText type="small" style={{ color: firstPlayerRandom ? '#fff' : theme.text }}>Random</ThemedText>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.segRight, { backgroundColor: !firstPlayerRandom ? '#0077B6' : theme.backgroundElement }]}
										onPress={() => setFirstPlayerRandom(false)}
									>
										<ThemedText type="small" style={{ color: !firstPlayerRandom ? '#fff' : theme.text }}>Specific</ThemedText>
									</TouchableOpacity>
								</View>
								{!firstPlayerRandom && (
									<>
										<TouchableOpacity
											style={[
												styles.dropdownTrigger,
												{ backgroundColor: theme.backgroundElement },
												activeDropdown === 'firstPlayer' && { backgroundColor: theme.backgroundSelected },
											]}
											onPress={() => toggleDropdown('firstPlayer')}
										>
											<ThemedText type="small" style={{ color: '#0077B6' }}>
												{firstPlayerSpecificId ? (players.find(p => p.id === firstPlayerSpecificId)?.name ?? 'Pick Player') : 'Pick Player'}
											</ThemedText>
											<ThemedText style={styles.chevron}>{activeDropdown === 'firstPlayer' ? '▴' : '▾'}</ThemedText>
										</TouchableOpacity>
										{activeDropdown === 'firstPlayer' && (
											<View style={[styles.dropdown, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
												{players.length === 0 ? (
													<ThemedText type="small" themeColor="textSecondary" style={styles.dropdownEmpty}>Add players first</ThemedText>
												) : players.map((p, i) => (
													<TouchableOpacity
														key={p.id}
														style={[styles.dropdownRow, { borderBottomColor: theme.backgroundSelected }, i === players.length - 1 && { borderBottomWidth: 0 }]}
														onPress={() => { setFirstPlayerSpecificId(p.id); setActiveDropdown(null); }}
													>
														<ThemedText type="default">{p.name}</ThemedText>
														{firstPlayerSpecificId === p.id && <ThemedText type="small" style={{ color: '#0077B6' }}>✓</ThemedText>}
													</TouchableOpacity>
												))}
											</View>
										)}
									</>
								)}
							</>
						)}
					</View>

					{/* Rounds */}
					<View style={styles.section}>
						<ThemedText style={styles.label} themeColor="textSecondary">ROUNDS</ThemedText>
						<View style={styles.segmentRow}>
							<TouchableOpacity
								style={[styles.segLeft, { backgroundColor: isIndefinite ? "#0077B6" : theme.backgroundElement }]}
								onPress={() => setIsIndefinite(true)}
							>
								<ThemedText type="small" style={{ color: isIndefinite ? "#fff" : theme.text }}>Indefinite</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.segRight, { backgroundColor: !isIndefinite ? "#0077B6" : theme.backgroundElement }]}
								onPress={() => setIsIndefinite(false)}
							>
								<ThemedText type="small" style={{ color: !isIndefinite ? "#fff" : theme.text }}>Set number</ThemedText>
							</TouchableOpacity>
						</View>
						{!isIndefinite && (
							<TouchableOpacity
								style={[shared.input, { backgroundColor: theme.backgroundElement, justifyContent: "center" }]}
								onPress={() => setShowRoundNumpad(true)}
							>
								<ThemedText style={{ color: roundCountStr ? theme.text : theme.textSecondary, fontSize: 16 }}>
									{roundCountStr || "Tap to set"}
								</ThemedText>
							</TouchableOpacity>
						)}
					</View>

					{/* Winner */}
					<View style={styles.section}>
						<ThemedText style={styles.label} themeColor="textSecondary">WINNER</ThemedText>
						<View style={styles.segmentRow}>
							<TouchableOpacity
								style={[styles.segLeft, { backgroundColor: !rankByLowest ? "#0077B6" : theme.backgroundElement }]}
								onPress={() => setRankByLowest(false)}
							>
								<ThemedText type="small" style={{ color: !rankByLowest ? "#fff" : theme.text }}>Highest score</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.segRight, { backgroundColor: rankByLowest ? "#0077B6" : theme.backgroundElement }]}
								onPress={() => setRankByLowest(true)}
							>
								<ThemedText type="small" style={{ color: rankByLowest ? "#fff" : theme.text }}>Lowest score</ThemedText>
							</TouchableOpacity>
						</View>
					</View>

					{/* Create */}
					<TouchableOpacity
						style={[shared.button, styles.createBtn, { backgroundColor: canCreate ? "#0077B6" : theme.backgroundElement }]}
						onPress={handleCreate}
						disabled={!canCreate}
					>
						<ThemedText type="smallBold" style={{ color: canCreate ? "#fff" : theme.textSecondary }}>
							Create Game
						</ThemedText>
					</TouchableOpacity>
				</ScrollView>
				<SafeAreaView edges={["bottom"]} />
			</KeyboardAvoidingView>

			<CellEditModal
				visible={showRoundNumpad}
				title="Number of Rounds"
				initialValue={parseInt(roundCountStr) || null}
				allowNegative={false}
				onSave={v => {
					setRoundCountStr(v && v > 0 ? v.toString() : "10");
					setShowRoundNumpad(false);
				}}
				onCancel={() => setShowRoundNumpad(false)}
			/>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	scroll: {
		padding: Spacing.three,
		gap: Spacing.four,
		paddingBottom: Spacing.six,
	},
	section: {
		gap: Spacing.two,
	},
	labelRow: {
		flexDirection: "row",
		alignItems: "baseline",
	},
	label: {
		fontSize: 11,
		fontWeight: "600",
		letterSpacing: 0.8,
	},
	chipRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.two,
	},
	chip: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: Spacing.one,
	},
	dropdownBtns: {
		flexDirection: "row",
		gap: Spacing.two,
	},
	dropdownTrigger: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: Spacing.two,
		paddingVertical: Spacing.two,
		paddingHorizontal: Spacing.three,
		gap: Spacing.one,
	},
	chevron: {
		fontSize: 18,
		color: '#0077B6',
		lineHeight: 22,
	},
	dropdown: {
		borderRadius: Spacing.two,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: "hidden",
		padding: Spacing.two,
		gap: Spacing.two,
	},
	dropdownList: {
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingTop: Spacing.one,
	},
	dropdownRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: Spacing.two,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: Spacing.two,
	},
	dropdownEmpty: {
		textAlign: "center",
		opacity: 0.6,
		paddingVertical: Spacing.one,
	},
	inputError: {
		fontSize: 12,
		color: "#C05050",
	},
	segmentRow: {
		flexDirection: "row",
	},
	segLeft: {
		flex: 1,
		alignItems: "center",
		paddingVertical: Spacing.two,
		borderTopLeftRadius: Spacing.two,
		borderBottomLeftRadius: Spacing.two,
	},
	segMid: {
		flex: 1,
		alignItems: "center",
		paddingVertical: Spacing.two,
	},
	segRight: {
		flex: 1,
		alignItems: "center",
		paddingVertical: Spacing.two,
		borderTopRightRadius: Spacing.two,
		borderBottomRightRadius: Spacing.two,
	},
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two,
	},
	toggle: {
		width: 44,
		height: 26,
		borderRadius: 13,
		justifyContent: 'center',
		paddingHorizontal: 3,
	},
	toggleThumb: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: '#fff',
	},
	toggleThumbOn: {
		alignSelf: 'flex-end',
	},
	createBtn: {
		alignSelf: "stretch",
		alignItems: "center",
		paddingVertical: Spacing.three,
		marginTop: Spacing.one,
	},
});
