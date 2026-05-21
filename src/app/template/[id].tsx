import { FontAwesome5 } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CellEditModal } from "@/components/cell-edit-modal";
import { HapticButton } from "@/components/haptic-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { DealerMode, GameTemplate, useGamesContext } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";
import { consumePendingIcon } from "@/utils/icon-picker-state";

const TINT = "#0077B6";
type Section = "winCondition" | "gameLength" | "dealer" | "turns" | null;

export default function TemplateScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { getTemplate, updateTemplate } = useGamesContext();
	const theme = useTheme();
	const router = useRouter();
	const template = getTemplate(id);

	const [draft, setDraft] = useState<GameTemplate | undefined>(template);
	const [isDirty, setIsDirty] = useState(false);
	const [editing, setEditing] = useState<Section>(null);
	const [showRoundNumpad, setShowRoundNumpad] = useState(false);

	useFocusEffect(useCallback(() => {
		const icon = consumePendingIcon();
		if (icon !== undefined) {
			setDraft(prev => prev ? { ...prev, icon: icon ?? undefined } : prev);
			setIsDirty(true);
		}
	}, []));

	const patch = (fields: Partial<GameTemplate>) => {
		setDraft(prev => prev ? { ...prev, ...fields } : prev);
		setIsDirty(true);
	};

	const toggleEdit = (section: Section) => {
		setEditing(prev => prev === section ? null : section);
	};

	if (!template || !draft) return null;

	const dealerEnabled = !!draft.dealerEnabled;
	const dealerMode = draft.dealerMode ?? "rotation";
	const turnsEnabled = !!draft.turnOrderEnabled;
	const firstPlayerSetting = draft.firstPlayerSetting ?? "rotation";

	function EditIcon({ section }: { section: Section }) {
		return (
			<HapticButton onPress={() => toggleEdit(section)} hitSlop={8}>
				<SymbolView
					name={editing === section ? "xmark.circle" : "pencil"}
					size={15}
					tintColor={editing === section ? theme.textSecondary : TINT}
					style={{ backgroundColor: "transparent" }}
				/>
			</HapticButton>
		);
	}

	const inner = { backgroundColor: theme.backgroundSelected } as const;

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: draft.name || "Template" }} />
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<ScrollView
					contentContainerStyle={styles.scroll}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* Name & Icon */}
					<View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={styles.labelRow}>
							<ThemedText style={styles.label} themeColor="textSecondary">TEMPLATE NAME</ThemedText>
							<ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary"> (OPTIONAL)</ThemedText>
						</View>
						<View style={styles.nameRow}>
							<HapticButton
								style={[styles.iconBtn, inner]}
								onPress={() => router.push("/icon-picker")}
								activeOpacity={0.7}
							>
								<FontAwesome5 name={(draft.icon ?? "users") as any} size={22} color={theme.textSecondary} />
							</HapticButton>
							<TextInput
								style={[shared.input, { backgroundColor: theme.backgroundSelected, color: theme.text, flex: 1 }]}
								placeholder="Untitled Template"
								placeholderTextColor={theme.textSecondary}
								value={draft.name}
								onChangeText={v => patch({ name: v })}
								maxLength={30}
								returnKeyType="done"
							/>
						</View>
					</View>

					{/* Win Condition */}
					<View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={styles.cardHeader}>
							<ThemedText style={styles.label} themeColor="textSecondary">WIN CONDITION</ThemedText>
							<EditIcon section="winCondition" />
						</View>
						{editing === "winCondition" ? (
							<View style={styles.segmentRow}>
								<HapticButton
									style={[styles.segLeft, { backgroundColor: !draft.rankByLowest ? TINT : inner.backgroundColor }]}
									onPress={() => patch({ rankByLowest: false })}
								>
									<ThemedText type="small" style={{ color: !draft.rankByLowest ? "#fff" : theme.text }}>Highest score</ThemedText>
								</HapticButton>
								<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
								<HapticButton
									style={[styles.segRight, { backgroundColor: draft.rankByLowest ? TINT : inner.backgroundColor }]}
									onPress={() => patch({ rankByLowest: true })}
								>
									<ThemedText type="small" style={{ color: draft.rankByLowest ? "#fff" : theme.text }}>Lowest score</ThemedText>
								</HapticButton>
							</View>
						) : (
							<ThemedText type="default">{draft.rankByLowest ? "Lowest score wins" : "Highest score wins"}</ThemedText>
						)}
					</View>

					{/* Game Length */}
					<View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={styles.cardHeader}>
							<ThemedText style={styles.label} themeColor="textSecondary">GAME LENGTH</ThemedText>
							<EditIcon section="gameLength" />
						</View>
						{editing === "gameLength" ? (
							<View style={{ gap: Spacing.two }}>
								{draft.totalRounds !== undefined && (
									<View style={styles.roundsRow}>
										<HapticButton style={[styles.roundsInput, inner]} onPress={() => setShowRoundNumpad(true)}>
											<ThemedText style={{ color: theme.text, fontSize: 16, textAlign: "center" }}>{draft.totalRounds}</ThemedText>
										</HapticButton>
										<ThemedText type="default">rounds</ThemedText>
									</View>
								)}
								<HapticButton
									style={[styles.toggleRow, inner]}
									onPress={() => patch({ totalRounds: draft.totalRounds === undefined ? 10 : undefined })}
								>
									<ThemedText type="default">Endless Mode</ThemedText>
									<View style={[styles.toggle, { backgroundColor: draft.totalRounds === undefined ? TINT : theme.backgroundElement }]}>
										<View style={[styles.toggleThumb, draft.totalRounds === undefined && styles.toggleThumbOn]} />
									</View>
								</HapticButton>
							</View>
						) : (
							<ThemedText type="default">
								{draft.totalRounds !== undefined ? `${draft.totalRounds} rounds` : "Indefinite"}
							</ThemedText>
						)}
					</View>

					{/* Dealer */}
					<View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={styles.cardHeader}>
							<ThemedText style={styles.label} themeColor="textSecondary">DEALER</ThemedText>
							<EditIcon section="dealer" />
						</View>
						{editing === "dealer" ? (
							<View style={{ gap: Spacing.two }}>
								<HapticButton style={[styles.toggleRow, inner]} onPress={() => patch({ dealerEnabled: dealerEnabled ? undefined : true })}>
									<ThemedText type="default">Track dealer</ThemedText>
									<View style={[styles.toggle, { backgroundColor: dealerEnabled ? TINT : theme.backgroundElement }]}>
										<View style={[styles.toggleThumb, dealerEnabled && styles.toggleThumbOn]} />
									</View>
								</HapticButton>
								{dealerEnabled && (
									<>
										<ThemedText style={styles.subLabel} themeColor="textSecondary">DEALER IS</ThemedText>
										<View style={styles.segmentRow}>
											<HapticButton
												style={[styles.segLeft, { backgroundColor: dealerMode === "rotation" ? TINT : inner.backgroundColor }]}
												onPress={() => patch({ dealerMode: "rotation" })}
											>
												<ThemedText type="small" style={{ color: dealerMode === "rotation" ? "#fff" : theme.text }}>Rotation</ThemedText>
											</HapticButton>
											<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
											<HapticButton
												style={[styles.segRight, { backgroundColor: dealerMode === "random" ? TINT : inner.backgroundColor }]}
												onPress={() => patch({ dealerMode: "random" })}
											>
												<ThemedText type="small" style={{ color: dealerMode === "random" ? "#fff" : theme.text }}>Random</ThemedText>
											</HapticButton>
										</View>
									</>
								)}
							</View>
						) : (
							<ThemedText type="default">
								{!dealerEnabled ? "Disabled" : dealerMode === "rotation" ? "Rotation" : "Random each round"}
							</ThemedText>
						)}
					</View>

					{/* Turn Order */}
					<View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={styles.cardHeader}>
							<ThemedText style={styles.label} themeColor="textSecondary">TURN ORDER</ThemedText>
							<EditIcon section="turns" />
						</View>
						{editing === "turns" ? (
							<View style={{ gap: Spacing.two }}>
								<HapticButton style={[styles.toggleRow, inner]} onPress={() => patch({ turnOrderEnabled: !turnsEnabled || undefined })}>
									<ThemedText type="default">Track who goes first</ThemedText>
									<View style={[styles.toggle, { backgroundColor: turnsEnabled ? TINT : theme.backgroundElement }]}>
										<View style={[styles.toggleThumb, turnsEnabled && styles.toggleThumbOn]} />
									</View>
								</HapticButton>
								{turnsEnabled && (
									<>
										<ThemedText style={styles.subLabel} themeColor="textSecondary">WHO GOES FIRST</ThemedText>
										<View style={styles.segmentRow}>
											{dealerEnabled && (
												<>
													<HapticButton
														style={[styles.segLeft, { backgroundColor: firstPlayerSetting === "left-of-dealer" ? TINT : inner.backgroundColor }]}
														onPress={() => patch({ firstPlayerSetting: "left-of-dealer" })}
													>
														<ThemedText type="small" style={{ color: firstPlayerSetting === "left-of-dealer" ? "#fff" : theme.text }}>Left of Dealer</ThemedText>
													</HapticButton>
													<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
												</>
											)}
											<HapticButton
												style={[dealerEnabled ? styles.segMid : styles.segLeft, { backgroundColor: firstPlayerSetting === "rotation" ? TINT : inner.backgroundColor }]}
												onPress={() => patch({ firstPlayerSetting: "rotation" })}
											>
												<ThemedText type="small" style={{ color: firstPlayerSetting === "rotation" ? "#fff" : theme.text }}>Rotation</ThemedText>
											</HapticButton>
											<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
											<HapticButton
												style={[styles.segRight, { backgroundColor: firstPlayerSetting === "random" ? TINT : inner.backgroundColor }]}
												onPress={() => patch({ firstPlayerSetting: "random" })}
											>
												<ThemedText type="small" style={{ color: firstPlayerSetting === "random" ? "#fff" : theme.text }}>Random</ThemedText>
											</HapticButton>
										</View>
									</>
								)}
							</View>
						) : (
							<ThemedText type="default">
								{!turnsEnabled
									? "Disabled"
									: firstPlayerSetting === "left-of-dealer"
										? "Left of dealer each round"
										: firstPlayerSetting === "rotation"
											? "Rotates each round"
											: "Random each round"}
							</ThemedText>
						)}
					</View>

					{/* Description */}
					{draft.description ? (
						<View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
							<ThemedText style={styles.label} themeColor="textSecondary">DESCRIPTION</ThemedText>
							<ThemedText type="default">{draft.description}</ThemedText>
						</View>
					) : null}

					{/* Save Changes */}
					{isDirty && (
						<HapticButton
							style={[styles.saveBtn, { backgroundColor: TINT }]}
							onPress={() => { updateTemplate(draft); setIsDirty(false); setEditing(null); }}
						>
							<ThemedText type="smallBold" style={{ color: "#fff" }}>Save Changes</ThemedText>
						</HapticButton>
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
				onSave={v => { patch({ totalRounds: v && v > 0 ? v : 10 }); setShowRoundNumpad(false); }}
				onCancel={() => setShowRoundNumpad(false)}
			/>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
	card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
	cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	label: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8 },
	subLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, opacity: 0.7 },
	labelRow: { flexDirection: "row", alignItems: "baseline" },
	nameRow: { flexDirection: "row", alignItems: "stretch", gap: Spacing.two },
	iconBtn: { borderRadius: Spacing.two, width: 40, alignItems: "center", justifyContent: "center" },
	iconPreview: { width: 40, height: 40, borderRadius: Spacing.two, alignItems: "center", justifyContent: "center" },
	segmentRow: { flexDirection: "row" },
	segDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
	segLeft: { flex: 1, alignItems: "center", paddingVertical: Spacing.two, borderTopLeftRadius: Spacing.two, borderBottomLeftRadius: Spacing.two },
	segMid: { flex: 1, alignItems: "center", paddingVertical: Spacing.two },
	segRight: { flex: 1, alignItems: "center", paddingVertical: Spacing.two, borderTopRightRadius: Spacing.two, borderBottomRightRadius: Spacing.two },
	roundsRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
	roundsInput: { borderRadius: Spacing.one + 2, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, minWidth: 52, alignItems: "center" },
	toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
	toggle: { width: 44, height: 26, borderRadius: 13, justifyContent: "center", paddingHorizontal: 3 },
	toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
	toggleThumbOn: { alignSelf: "flex-end" },
	saveBtn: { borderRadius: Spacing.two, paddingVertical: Spacing.three, alignItems: "center" },
});
