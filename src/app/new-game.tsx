"use client";
import { Stack, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
import { Player, useGamesContext } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";

export default function NewGameScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { createGame, globalPlayers, addGlobalPlayer } = useGamesContext();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [players, setPlayers] = useState<Player[]>([]);
	const [playerInput, setPlayerInput] = useState("");
	const [playerError, setPlayerError] = useState('');
	const [isIndefinite, setIsIndefinite] = useState(false);
	const [roundCountStr, setRoundCountStr] = useState("10");
	const [showRoundNumpad, setShowRoundNumpad] = useState(false);
	const [rankByLowest, setRankByLowest] = useState(false);

	const playerInputRef = useRef<TextInput>(null);

	const addPlayerByName = useCallback((name: string) => {
		const trimmed = name.trim();
		if (!trimmed) return;
		if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
		const global = addGlobalPlayer(trimmed);
		const player = global ?? { id: `p_${Date.now()}`, name: trimmed };
		setPlayers((prev) => [...prev, player]);
	}, [players, addGlobalPlayer]);

	const addPlayer = useCallback(() => {
		const trimmed = playerInput.trim();
		if (!trimmed) return;
		if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
			setPlayerError(`"${trimmed}" is already in this game`);
			return;
		}
		setPlayerError('');
		addPlayerByName(trimmed);
		setPlayerInput("");
		playerInputRef.current?.focus();
	}, [playerInput, players, addPlayerByName]);

	const removePlayer = useCallback((id: string) => {
		setPlayers((prev) => prev.filter((p) => p.id !== id));
	}, []);

	const handleCreate = useCallback(() => {
		const trimmedName = name.trim();
		if (!trimmedName || players.length === 0) return;
		const totalRounds = !isIndefinite ? Math.max(1, parseInt(roundCountStr, 10) || 1) : undefined;
		const id = createGame({
			name: trimmedName,
			description: description.trim() || undefined,
			players,
			totalRounds,
			rankByLowest,
		});
		router.replace(`/game/${id}`);
	}, [name, description, players, isIndefinite, roundCountStr, rankByLowest, createGame, router]);

	const canCreate = name.trim().length > 0 && players.length > 0;

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "New Game" }} />
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<ScrollView
					contentContainerStyle={styles.scroll}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* Game Name */}
					<View style={styles.section}>
						<ThemedText style={styles.label} themeColor="textSecondary">
							GAME NAME
						</ThemedText>
						<TextInput
							style={[shared.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
							placeholder="Enter game name"
							placeholderTextColor={theme.textSecondary}
							value={name}
							onChangeText={setName}
							maxLength={30}
							autoFocus
							returnKeyType="next"
						/>
					</View>

					{/* Description */}
					<View style={styles.section}>
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
							<ThemedText style={styles.label} themeColor="textSecondary">
								PLAYERS
							</ThemedText>
							{players.length > 0 && (
								<ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary">
									{players.length}
								</ThemedText>
							)}
						</View>
						{players.length > 0 && (
							<View style={styles.chipRow}>
								{players.map((p) => (
									<TouchableOpacity
										key={p.id}
										style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}
										onPress={() => removePlayer(p.id)}
									>
										<ThemedText type="small">{p.name}</ThemedText>
										<ThemedText type="small" themeColor="textSecondary">
											{" "}
											×
										</ThemedText>
									</TouchableOpacity>
								))}
							</View>
						)}
						{/* Existing global players not yet in this game */}
						{globalPlayers.filter((gp) =>
							!players.some((p) => p.id === gp.id)
						).length > 0 && (
							<View style={{ gap: 6 }}>
								<ThemedText style={[styles.label, { opacity: 0.6 }]} themeColor="textSecondary">
									YOUR PLAYERS
								</ThemedText>
								<View style={styles.chipRow}>
									{globalPlayers
										.filter((gp) => !players.some((p) => p.id === gp.id))
										.map((gp) => (
											<TouchableOpacity
												key={gp.id}
												style={[styles.chip, { backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.backgroundSelected }]}
												onPress={() => addPlayerByName(gp.name)}>
												<ThemedText type="small">+ {gp.name}</ThemedText>
											</TouchableOpacity>
										))}
								</View>
							</View>
						)}
						<View style={{ gap: 4 }}>
							<View style={[shared.row]}>
								<TextInput
									ref={playerInputRef}
									style={[
										shared.input,
										{ flex: 1, backgroundColor: theme.backgroundElement, color: theme.text },
									]}
									placeholder="New player name"
									placeholderTextColor={theme.textSecondary}
									value={playerInput}
									onChangeText={v => { setPlayerInput(v); setPlayerError(''); }}
									onSubmitEditing={addPlayer}
									maxLength={15}
									returnKeyType="done"
									submitBehavior="submit"
								/>
								<TouchableOpacity
									style={[
										shared.button,
										{ backgroundColor: playerInput.trim() ? "#0077B6" : theme.backgroundElement },
									]}
									onPress={addPlayer}
									disabled={!playerInput.trim()}
								>
									<ThemedText
										type="smallBold"
										style={{ color: playerInput.trim() ? "#fff" : theme.textSecondary }}
									>
										Add
									</ThemedText>
								</TouchableOpacity>
							</View>
							{playerError ? (
								<ThemedText style={styles.playerError}>{playerError}</ThemedText>
							) : null}
						</View>
					</View>

					{/* Rounds */}
					<View style={styles.section}>
						<ThemedText style={styles.label} themeColor="textSecondary">
							ROUNDS
						</ThemedText>
						<View style={styles.segmentRow}>
							<TouchableOpacity
								style={[
									styles.segLeft,
									{ backgroundColor: isIndefinite ? "#0077B6" : theme.backgroundElement },
								]}
								onPress={() => setIsIndefinite(true)}
							>
								<ThemedText type="small" style={{ color: isIndefinite ? "#fff" : theme.text }}>
									Indefinite
								</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.segRight,
									{ backgroundColor: !isIndefinite ? "#0077B6" : theme.backgroundElement },
								]}
								onPress={() => setIsIndefinite(false)}
							>
								<ThemedText type="small" style={{ color: !isIndefinite ? "#fff" : theme.text }}>
									Set number
								</ThemedText>
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
						<ThemedText style={styles.label} themeColor="textSecondary">
							WINNER
						</ThemedText>
						<View style={styles.segmentRow}>
							<TouchableOpacity
								style={[
									styles.segLeft,
									{ backgroundColor: !rankByLowest ? "#0077B6" : theme.backgroundElement },
								]}
								onPress={() => setRankByLowest(false)}
							>
								<ThemedText type="small" style={{ color: !rankByLowest ? "#fff" : theme.text }}>
									Highest score
								</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.segRight,
									{ backgroundColor: rankByLowest ? "#0077B6" : theme.backgroundElement },
								]}
								onPress={() => setRankByLowest(true)}
							>
								<ThemedText type="small" style={{ color: rankByLowest ? "#fff" : theme.text }}>
									Lowest score
								</ThemedText>
							</TouchableOpacity>
						</View>
					</View>

					{/* Create */}
					<TouchableOpacity
						style={[
							shared.button,
							styles.createBtn,
							{ backgroundColor: canCreate ? "#0077B6" : theme.backgroundElement },
						]}
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
	segRight: {
		flex: 1,
		alignItems: "center",
		paddingVertical: Spacing.two,
		borderTopRightRadius: Spacing.two,
		borderBottomRightRadius: Spacing.two,
	},
	createBtn: {
		alignSelf: "stretch",
		alignItems: "center",
		paddingVertical: Spacing.three,
		marginTop: Spacing.one,
	},
	playerError: {
		fontSize: 12,
		color: '#C05050',
	},
});
