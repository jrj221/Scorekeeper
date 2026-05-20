import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CellEditModal } from '@/components/cell-edit-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Player, useGamesContext } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';

type ActiveDropdown = 'player' | 'group' | null;

export default function EditGameScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { id } = useLocalSearchParams<{ id: string }>();
	const { getGame, updateGame, globalPlayers, addGlobalPlayer, groups } = useGamesContext();

	const game = getGame(id);

	const [name, setName] = useState(game?.name ?? '');
	const [description, setDescription] = useState(game?.description ?? '');
	const [players, setPlayers] = useState<Player[]>(game?.players ?? []);
	const [isIndefinite, setIsIndefinite] = useState(game?.totalRounds === undefined);
	const [roundCountStr, setRoundCountStr] = useState(game?.totalRounds?.toString() ?? '10');
	const [rankByLowest, setRankByLowest] = useState(game?.rankByLowest ?? false);
	const [showRoundNumpad, setShowRoundNumpad] = useState(false);

	const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
	const [playerSearch, setPlayerSearch] = useState('');
	const [playerSearchError, setPlayerSearchError] = useState('');
	const playerSearchRef = useRef<TextInput>(null);

	const toggleDropdown = (d: ActiveDropdown) =>
		setActiveDropdown(prev => prev === d ? null : d);

	const addExistingPlayer = useCallback((pid: string, playerName: string) => {
		setPlayers(prev => prev.some(p => p.id === pid) ? prev : [...prev, { id: pid, name: playerName }]);
		setPlayerSearch('');
		setPlayerSearchError('');
	}, []);

	const submitPlayerSearch = useCallback(() => {
		const trimmed = playerSearch.trim();
		if (!trimmed) return;
		const match = globalPlayers.find(
			gp => gp.name.toLowerCase() === trimmed.toLowerCase() && !players.some(p => p.id === gp.id),
		);
		if (match) { addExistingPlayer(match.id, match.name); return; }
		if (players.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
			setPlayerSearchError(`"${trimmed}" is already in this game`);
			return;
		}
		setPlayerSearchError('');
		const global = addGlobalPlayer(trimmed);
		const player = global ?? { id: `p_${Date.now()}`, name: trimmed };
		setPlayers(prev => prev.some(p => p.id === player.id) ? prev : [...prev, player]);
		setPlayerSearch('');
		playerSearchRef.current?.focus();
	}, [playerSearch, players, globalPlayers, addGlobalPlayer, addExistingPlayer]);

	const removePlayer = useCallback((pid: string) => {
		setPlayers(prev => prev.filter(p => p.id !== pid));
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

	const handleSave = useCallback(() => {
		if (!game || !name.trim()) return;

		const origIds = new Set(game.players.map(p => p.id));
		const newIds = new Set(players.map(p => p.id));
		const totalRounds = isIndefinite ? undefined : Math.max(1, parseInt(roundCountStr, 10) || 1);

		// Remove deleted players from rounds, add new players with 0 where needed
		let rounds = game.rounds.map(r => {
			const next = { ...r };
			for (const pid of origIds) {
				if (!newIds.has(pid)) delete next[pid];
			}
			return next;
		});
		for (const p of players) {
			if (!origIds.has(p.id)) {
				rounds = rounds.map(r => {
					const hasExisting = players.some(pl => origIds.has(pl.id) && r[pl.id] !== undefined);
					return hasExisting ? { ...r, [p.id]: 0 } : r;
				});
			}
		}

		// Update turnOrder: keep existing order, remove deleted players, append new ones
		const existingTurnOrder = game.turnOrder ?? game.players.map(p => p.id);
		const updatedTurnOrder = [
			...existingTurnOrder.filter(pid => newIds.has(pid)),
			...players.filter(p => !origIds.has(p.id)).map(p => p.id),
		];

		// If firstPlayerId was removed, clear it
		const updatedFirstPlayerId = game.firstPlayerId && newIds.has(game.firstPlayerId)
			? game.firstPlayerId
			: undefined;

		updateGame({ ...game, name: name.trim(), description: description.trim() || undefined, players, totalRounds, rankByLowest, rounds, turnOrder: updatedTurnOrder, firstPlayerId: updatedFirstPlayerId });
		router.back();
	}, [game, name, description, players, isIndefinite, roundCountStr, rankByLowest, updateGame, router]);

	if (!game) return null;

	const canSave = name.trim().length > 0 && players.length > 0;

	const filteredGlobalPlayers = globalPlayers.filter(gp =>
		!players.some(p => p.id === gp.id) &&
		(playerSearch === '' || gp.name.toLowerCase().includes(playerSearch.toLowerCase()))
	);

	const availableGroups = groups.filter(g =>
		!g.playerIds.every(pid => players.some(p => p.id === pid))
	);

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: 'Edit Game' }} />
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
				<ScrollView
					contentContainerStyle={styles.scroll}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* Name */}
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
									{' '}{players.length}
								</ThemedText>
							)}
						</View>

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

						<View style={styles.dropdownBtns}>
							<TouchableOpacity
								style={[
									styles.dropdownTrigger,
									{ backgroundColor: theme.backgroundElement },
									activeDropdown === 'player' && { backgroundColor: theme.backgroundSelected },
								]}
								onPress={() => toggleDropdown('player')}
							>
								<ThemedText type="small" style={{ color: '#0077B6' }}>Add Player</ThemedText>
								<ThemedText style={styles.chevron}>{activeDropdown === 'player' ? '▴' : '▾'}</ThemedText>
							</TouchableOpacity>

							{groups.length > 0 && (
								<TouchableOpacity
									style={[
										styles.dropdownTrigger,
										{ backgroundColor: theme.backgroundElement },
										activeDropdown === 'group' && { backgroundColor: theme.backgroundSelected },
									]}
									onPress={() => toggleDropdown('group')}
								>
									<ThemedText type="small" style={{ color: '#0077B6' }}>Add Group</ThemedText>
									<ThemedText style={styles.chevron}>{activeDropdown === 'group' ? '▴' : '▾'}</ThemedText>
								</TouchableOpacity>
							)}
						</View>

						{activeDropdown === 'player' && (
							<View style={[styles.dropdown, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
								<View style={{ gap: 4 }}>
									<TextInput
										ref={playerSearchRef}
										style={[shared.input, { backgroundColor: theme.background, color: theme.text }]}
										placeholder="Search or enter new name"
										placeholderTextColor={theme.textSecondary}
										value={playerSearch}
										onChangeText={v => { setPlayerSearch(v); setPlayerSearchError(''); }}
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
								{filteredGlobalPlayers.length === 0 && playerSearch === '' && globalPlayers.length > 0 && (
									<ThemedText type="small" themeColor="textSecondary" style={styles.dropdownEmpty}>
										All saved players are in this game
									</ThemedText>
								)}
								{filteredGlobalPlayers.length === 0 && playerSearch === '' && globalPlayers.length === 0 && (
									<ThemedText type="small" themeColor="textSecondary" style={styles.dropdownEmpty}>
										No saved players — type a name to create one
									</ThemedText>
								)}
								{filteredGlobalPlayers.length === 0 && playerSearch !== '' && (
									<ThemedText type="small" themeColor="textSecondary" style={styles.dropdownEmpty}>
										Press return to add "{playerSearch}"
									</ThemedText>
								)}
							</View>
						)}

						{activeDropdown === 'group' && (
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

					{/* Rounds */}
					<View style={styles.section}>
						<ThemedText style={styles.label} themeColor="textSecondary">ROUNDS</ThemedText>
						<View style={styles.segmentRow}>
							<TouchableOpacity
								style={[styles.segLeft, { backgroundColor: isIndefinite ? '#0077B6' : theme.backgroundElement }]}
								onPress={() => setIsIndefinite(true)}
							>
								<ThemedText type="small" style={{ color: isIndefinite ? '#fff' : theme.text }}>Indefinite</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.segRight, { backgroundColor: !isIndefinite ? '#0077B6' : theme.backgroundElement }]}
								onPress={() => setIsIndefinite(false)}
							>
								<ThemedText type="small" style={{ color: !isIndefinite ? '#fff' : theme.text }}>Set number</ThemedText>
							</TouchableOpacity>
						</View>
						{!isIndefinite && (
							<TouchableOpacity
								style={[shared.input, { backgroundColor: theme.backgroundElement, justifyContent: 'center' }]}
								onPress={() => setShowRoundNumpad(true)}
							>
								<ThemedText style={{ color: roundCountStr ? theme.text : theme.textSecondary, fontSize: 16 }}>
									{roundCountStr || 'Tap to set'}
								</ThemedText>
							</TouchableOpacity>
						)}
					</View>

					{/* Winner */}
					<View style={styles.section}>
						<ThemedText style={styles.label} themeColor="textSecondary">WINNER</ThemedText>
						<View style={styles.segmentRow}>
							<TouchableOpacity
								style={[styles.segLeft, { backgroundColor: !rankByLowest ? '#0077B6' : theme.backgroundElement }]}
								onPress={() => setRankByLowest(false)}
							>
								<ThemedText type="small" style={{ color: !rankByLowest ? '#fff' : theme.text }}>Highest score</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.segRight, { backgroundColor: rankByLowest ? '#0077B6' : theme.backgroundElement }]}
								onPress={() => setRankByLowest(true)}
							>
								<ThemedText type="small" style={{ color: rankByLowest ? '#fff' : theme.text }}>Lowest score</ThemedText>
							</TouchableOpacity>
						</View>
					</View>

					{/* Save */}
					<TouchableOpacity
						style={[shared.button, styles.saveBtn, { backgroundColor: canSave ? '#0077B6' : theme.backgroundElement }]}
						onPress={handleSave}
						disabled={!canSave}
					>
						<ThemedText type="smallBold" style={{ color: canSave ? '#fff' : theme.textSecondary }}>
							Save Changes
						</ThemedText>
					</TouchableOpacity>
				</ScrollView>
				<SafeAreaView edges={['bottom']} />
			</KeyboardAvoidingView>

			<CellEditModal
				visible={showRoundNumpad}
				title="Number of Rounds"
				initialValue={parseInt(roundCountStr) || null}
				allowNegative={false}
				onSave={v => {
					setRoundCountStr(v && v > 0 ? v.toString() : '10');
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
	section: { gap: Spacing.two },
	labelRow: { flexDirection: 'row', alignItems: 'baseline' },
	label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
	chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: Spacing.one,
	},
	dropdownBtns: { flexDirection: 'row', gap: Spacing.two },
	dropdownTrigger: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: Spacing.two,
		paddingVertical: Spacing.two,
		paddingHorizontal: Spacing.three,
		gap: Spacing.one,
	},
	chevron: { fontSize: 18, color: '#0077B6', lineHeight: 22 },
	dropdown: {
		borderRadius: Spacing.two,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: 'hidden',
		padding: Spacing.two,
		gap: Spacing.two,
	},
	dropdownList: {
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingTop: Spacing.one,
	},
	dropdownRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: Spacing.two,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: Spacing.two,
	},
	dropdownEmpty: { textAlign: 'center', opacity: 0.6, paddingVertical: Spacing.one },
	inputError: { fontSize: 12, color: '#C05050' },
	segmentRow: { flexDirection: 'row' },
	segLeft: {
		flex: 1, alignItems: 'center', paddingVertical: Spacing.two,
		borderTopLeftRadius: Spacing.two, borderBottomLeftRadius: Spacing.two,
	},
	segRight: {
		flex: 1, alignItems: 'center', paddingVertical: Spacing.two,
		borderTopRightRadius: Spacing.two, borderBottomRightRadius: Spacing.two,
	},
	saveBtn: {
		alignSelf: 'stretch',
		alignItems: 'center',
		paddingVertical: Spacing.three,
		marginTop: Spacing.one,
	},
});
