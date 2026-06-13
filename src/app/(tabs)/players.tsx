import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HapticButton } from "@/components/haptic-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useGamesContext } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { forms } from "@/styles/forms";
import { shared } from "@/styles/shared";
import { getPlayerWinRate } from "@/utils/game";

export default function PlayersScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { globalPlayers, addGlobalPlayer, games, groups, deleteGroup } = useGamesContext();

	const [nameInput, setNameInput] = useState("");
	const [addError, setAddError] = useState("");
	const [showAddDialog, setShowAddDialog] = useState(false);
	const inputRef = useRef<TextInput>(null);
	const tabBarHeight = useBottomTabBarHeight();

	useEffect(() => {
		if (showAddDialog) {
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [showAddDialog]);

	const handleAdd = () => {
		const trimmed = nameInput.trim();
		if (!trimmed) { closeAddDialog(); return; }
		if (globalPlayers.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
			setAddError(`"${trimmed}" is already a player`);
			return;
		}
		addGlobalPlayer(trimmed);
		setAddError("");
		setNameInput("");
		inputRef.current?.focus();
	};

	const closeAddDialog = () => {
		setShowAddDialog(false);
		setNameInput("");
		setAddError("");
	};

	const confirmDeleteGroup = (id: string, name: string) => {
		Alert.alert("Delete Group", `Delete "${name}"?`, [
			{ text: "Cancel", style: "cancel" },
			{ text: "Delete", style: "destructive", onPress: () => deleteGroup(id) },
		]);
	};

	const PlayersHeader = (
		<View style={styles.sectionHeader}>
			<ThemedText style={styles.sectionLabel} themeColor="textSecondary">
				PLAYERS
			</ThemedText>
			<HapticButton onPress={() => setShowAddDialog(true)}>
				<ThemedText type="small" style={{ color: theme.accent }}>
					+ New Player
				</ThemedText>
			</HapticButton>
		</View>
	);

	const GroupsFooter = (
		<View style={styles.groupsSection}>
			<View style={styles.sectionHeader}>
				<ThemedText style={styles.sectionLabel} themeColor="textSecondary">
					GROUPS
				</ThemedText>
				<HapticButton onPress={() => router.push("/new-group")}>
					<ThemedText type="small" style={{ color: theme.accent }}>
						+ New Group
					</ThemedText>
				</HapticButton>
			</View>

			{groups.length === 0 ? (
				<ThemedText type="small" themeColor="textSecondary" style={styles.emptySection}>
					No groups yet
				</ThemedText>
			) : (
				groups.map((g) => {
					const memberNames = g.playerIds
						.map((id) => globalPlayers.find((p) => p.id === id)?.name)
						.filter(Boolean)
						.join(", ");
					return (
						<HapticButton
							key={g.id}
							style={[styles.groupCard, { backgroundColor: theme.backgroundElement }]}
							onPress={() => router.push(`/group/${g.id}`)}
						>
							<View style={{ flex: 1, gap: 2 }}>
								<ThemedText type="default">{g.name}</ThemedText>
								<ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
									{memberNames || "No members"}
								</ThemedText>
							</View>
							<HapticButton hitSlop={8} onPress={() => confirmDeleteGroup(g.id, g.name)}>
								<SymbolView name="trash" size={16} tintColor={theme.textSecondary} />
							</HapticButton>
						</HapticButton>
					);
				})
			)}
		</View>
	);

	return (
		<ThemedView style={shared.screen}>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={tabBarHeight}
			>
				<FlatList
					style={{ flex: 1 }}
					data={[...globalPlayers].sort((a, b) => a.name.localeCompare(b.name))}
					keyExtractor={(p) => p.id}
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={styles.listContent}
					ListHeaderComponent={PlayersHeader}
					ListEmptyComponent={
						<ThemedText type="small" themeColor="textSecondary" style={styles.emptySection}>
							No players yet
						</ThemedText>
					}
					ListFooterComponent={GroupsFooter}
					renderItem={({ item }) => (
						<HapticButton
							style={[forms.card, { backgroundColor: theme.backgroundElement }]}
							onPress={() => router.push(`/player/${item.id}`)}
						>
							<View style={{ flex: 1, gap: 2 }}>
								<ThemedText type="default">{item.name}</ThemedText>
								<ThemedText type="small" themeColor="textSecondary">
									{getPlayerWinRate(item.id, games)}
								</ThemedText>
							</View>
						</HapticButton>
					)}
				/>
			</KeyboardAvoidingView>

			<SafeAreaView edges={["bottom"]} />

			{/* Add player dialog */}
			<Modal visible={showAddDialog} transparent animationType="fade" onRequestClose={closeAddDialog}>
				<View style={styles.dialogOverlay}>
					<HapticButton style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeAddDialog} />
					<View style={[styles.dialogCard, { backgroundColor: theme.backgroundElement }]}>
						<ThemedText style={styles.dialogTitle} themeColor="textSecondary">
							ADD PLAYER
						</ThemedText>
						<View style={{ gap: 4 }}>
							<TextInput allowFontScaling={false}
								ref={inputRef}
								style={[shared.input, { backgroundColor: theme.background, color: theme.text }]}
								placeholder="Player name"
								placeholderTextColor={theme.textSecondary}
								value={nameInput}
								onChangeText={(v) => {
									setNameInput(v);
									setAddError("");
								}}
								onSubmitEditing={handleAdd}
								maxLength={15}
								returnKeyType="done"
								submitBehavior="submit"
							/>
							{addError ? <ThemedText style={styles.error}>{addError}</ThemedText> : null}
						</View>
						<View style={styles.dialogBtns}>
							<HapticButton
								style={[
									shared.button,
									styles.dialogCancel,
									{ backgroundColor: theme.backgroundSelected },
								]}
								onPress={closeAddDialog}
							>
								<ThemedText type="smallBold" themeColor="textSecondary">
									Cancel
								</ThemedText>
							</HapticButton>
							<HapticButton
								style={[
									shared.button,
									styles.dialogAdd,
									{ backgroundColor: nameInput.trim() ? theme.accent : theme.backgroundSelected },
								]}
								onPress={handleAdd}
								disabled={!nameInput.trim()}
							>
								<ThemedText
									type="smallBold"
									style={{ color: nameInput.trim() ? "#fff" : theme.textSecondary }}
								>
									Add
								</ThemedText>
							</HapticButton>
						</View>
					</View>
				</View>
			</Modal>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	listContent: {
		padding: Spacing.three,
		gap: Spacing.two,
		paddingBottom: Spacing.six,
	},
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: Spacing.one,
	},
	sectionLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8 },
	emptySection: { opacity: 0.6, paddingTop: Spacing.one },
	groupCard: {
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.three,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
	},
	groupsSection: { marginTop: Spacing.four, gap: Spacing.two },
	error: { fontSize: 12, color: "#C05050" },
	dialogOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.45)",
		justifyContent: "center",
		padding: Spacing.four,
	},
	dialogCard: {
		borderRadius: Spacing.three,
		padding: Spacing.three,
		gap: Spacing.three,
	},
	dialogTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, textAlign: "center" },
	dialogBtns: { flexDirection: "row", gap: Spacing.two },
	dialogCancel: { flex: 1, alignItems: "center", paddingVertical: Spacing.two },
	dialogAdd: { flex: 2, alignItems: "center", paddingVertical: Spacing.two },
});
