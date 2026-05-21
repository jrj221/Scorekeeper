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
import { useDraft } from "@/hooks/use-draft";
import { useTheme } from "@/hooks/use-theme";
import { useUnsavedChangesScroll } from "@/hooks/use-unsaved-changes-scroll";
import { shared } from "@/styles/shared";
import { consumePendingIcon } from "@/utils/icon-picker-state";
import { forms } from '@/styles/forms';

type Section = "winCondition" | "gameLength" | "dealer" | "turns" | null;

export default function TemplateScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { getTemplate, updateTemplate } = useGamesContext();
	const theme = useTheme();
	const TINT = theme.accent;
	const router = useRouter();
	const template = getTemplate(id);

	const { draft, patch, isDirty, save: saveDraft, reset: resetDraft } = useDraft(template, updateTemplate);
	const scrollRef = useRef<ScrollView>(null);
	const { highlightStyle } = useUnsavedChangesScroll(isDirty, scrollRef);
	const [editing, setEditing] = useState<Section>(null);
	const [showRoundNumpad, setShowRoundNumpad] = useState(false);

	useFocusEffect(useCallback(() => {
		const icon = consumePendingIcon();
		if (icon !== undefined) patch({ icon: icon ?? undefined });
	}, []));

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
					ref={scrollRef}
					contentContainerStyle={styles.scroll}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* Name & Icon */}
					<View style={[forms.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={forms.labelRow}>
							<ThemedText style={forms.label} themeColor="textSecondary">TEMPLATE NAME</ThemedText>
							<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary"> (OPTIONAL)</ThemedText>
						</View>
						<View style={forms.nameRow}>
							<HapticButton
								style={[forms.iconBtn, inner]}
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
					<View style={[forms.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={forms.cardHeader}>
							<ThemedText style={forms.label} themeColor="textSecondary">WIN CONDITION</ThemedText>
							<EditIcon section="winCondition" />
						</View>
						{editing === "winCondition" ? (
							<View style={forms.segmentRow}>
								<HapticButton
									style={[forms.segLeft, { backgroundColor: !draft.rankByLowest ? TINT : inner.backgroundColor }]}
									onPress={() => patch({ rankByLowest: false })}
								>
									<ThemedText type="small" style={{ color: !draft.rankByLowest ? "#fff" : theme.text }}>Highest score</ThemedText>
								</HapticButton>
								<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
								<HapticButton
									style={[forms.segRight, { backgroundColor: draft.rankByLowest ? TINT : inner.backgroundColor }]}
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
					<View style={[forms.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={forms.cardHeader}>
							<ThemedText style={forms.label} themeColor="textSecondary">GAME LENGTH</ThemedText>
							<EditIcon section="gameLength" />
						</View>
						{editing === "gameLength" ? (
							<View style={{ gap: Spacing.two }}>
								{draft.totalRounds !== undefined && (
									<View style={forms.roundsRow}>
										<HapticButton style={[forms.roundsInput, inner]} onPress={() => setShowRoundNumpad(true)}>
											<ThemedText style={{ color: theme.text, fontSize: 16, textAlign: "center" }}>{draft.totalRounds}</ThemedText>
										</HapticButton>
										<ThemedText type="default">rounds</ThemedText>
									</View>
								)}
								<HapticButton
									style={[forms.toggleRow, inner]}
									onPress={() => patch({ totalRounds: draft.totalRounds === undefined ? 10 : undefined })}
								>
									<ThemedText type="default">Endless Mode</ThemedText>
									<View style={[forms.toggle, { backgroundColor: draft.totalRounds === undefined ? TINT : theme.backgroundElement }]}>
										<View style={[forms.toggleThumb, draft.totalRounds === undefined && forms.toggleThumbOn]} />
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
					<View style={[forms.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={forms.cardHeader}>
							<ThemedText style={forms.label} themeColor="textSecondary">DEALER</ThemedText>
							<EditIcon section="dealer" />
						</View>
						{editing === "dealer" ? (
							<View style={{ gap: Spacing.two }}>
								<HapticButton style={[forms.toggleRow, inner]} onPress={() => patch({ dealerEnabled: dealerEnabled ? undefined : true })}>
									<ThemedText type="default">Track dealer</ThemedText>
									<View style={[forms.toggle, { backgroundColor: dealerEnabled ? TINT : theme.backgroundElement }]}>
										<View style={[forms.toggleThumb, dealerEnabled && forms.toggleThumbOn]} />
									</View>
								</HapticButton>
								{dealerEnabled && (
									<>
										<ThemedText style={forms.subLabel} themeColor="textSecondary">DEALER IS</ThemedText>
										<View style={forms.segmentRow}>
											<HapticButton
												style={[forms.segLeft, { backgroundColor: dealerMode === "rotation" ? TINT : inner.backgroundColor }]}
												onPress={() => patch({ dealerMode: "rotation" })}
											>
												<ThemedText type="small" style={{ color: dealerMode === "rotation" ? "#fff" : theme.text }}>Rotation</ThemedText>
											</HapticButton>
											<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
											<HapticButton
												style={[forms.segRight, { backgroundColor: dealerMode === "random" ? TINT : inner.backgroundColor }]}
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
					<View style={[forms.card, { backgroundColor: theme.backgroundElement }]}>
						<View style={forms.cardHeader}>
							<ThemedText style={forms.label} themeColor="textSecondary">TURN ORDER</ThemedText>
							<EditIcon section="turns" />
						</View>
						{editing === "turns" ? (
							<View style={{ gap: Spacing.two }}>
								<HapticButton style={[forms.toggleRow, inner]} onPress={() => patch({ turnOrderEnabled: !turnsEnabled || undefined })}>
									<ThemedText type="default">Track who goes first</ThemedText>
									<View style={[forms.toggle, { backgroundColor: turnsEnabled ? TINT : theme.backgroundElement }]}>
										<View style={[forms.toggleThumb, turnsEnabled && forms.toggleThumbOn]} />
									</View>
								</HapticButton>
								{turnsEnabled && (
									<>
										<ThemedText style={forms.subLabel} themeColor="textSecondary">WHO GOES FIRST</ThemedText>
										<View style={forms.segmentRow}>
											{dealerEnabled && (
												<>
													<HapticButton
														style={[forms.segLeft, { backgroundColor: firstPlayerSetting === "left-of-dealer" ? TINT : inner.backgroundColor }]}
														onPress={() => patch({ firstPlayerSetting: "left-of-dealer" })}
													>
														<ThemedText type="small" style={{ color: firstPlayerSetting === "left-of-dealer" ? "#fff" : theme.text }}>Left of Dealer</ThemedText>
													</HapticButton>
													<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
												</>
											)}
											<HapticButton
												style={[dealerEnabled ? forms.segMid : forms.segLeft, { backgroundColor: firstPlayerSetting === "rotation" ? TINT : inner.backgroundColor }]}
												onPress={() => patch({ firstPlayerSetting: "rotation" })}
											>
												<ThemedText type="small" style={{ color: firstPlayerSetting === "rotation" ? "#fff" : theme.text }}>Rotation</ThemedText>
											</HapticButton>
											<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
											<HapticButton
												style={[forms.segRight, { backgroundColor: firstPlayerSetting === "random" ? TINT : inner.backgroundColor }]}
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
						<View style={[forms.card, { backgroundColor: theme.backgroundElement }]}>
							<ThemedText style={forms.label} themeColor="textSecondary">DESCRIPTION</ThemedText>
							<ThemedText type="default">{draft.description}</ThemedText>
						</View>
					) : null}

					{/* Cancel / Save Changes */}
					{isDirty && (
						<View style={[styles.actionsContainer, highlightStyle]}>
							<HapticButton
								style={[styles.cancelBtn, { backgroundColor: theme.backgroundElement }]}
								onPress={() => { resetDraft(); setEditing(null); }}
							>
								<ThemedText type="small" themeColor="textSecondary">Cancel Changes</ThemedText>
							</HapticButton>
							<HapticButton
								style={[styles.saveBtn, { backgroundColor: TINT }]}
								onPress={() => { saveDraft(); setEditing(null); }}
							>
								<ThemedText type="smallBold" style={{ color: "#fff" }}>Save Changes</ThemedText>
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
				onSave={v => { patch({ totalRounds: v && v > 0 ? v : 10 }); setShowRoundNumpad(false); }}
				onCancel={() => setShowRoundNumpad(false)}
			/>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
	iconPreview: { width: 40, height: 40, borderRadius: Spacing.two, alignItems: "center", justifyContent: "center" },
	actionsContainer: { gap: Spacing.two, padding: Spacing.one },
	cancelBtn: { borderRadius: Spacing.two, paddingVertical: Spacing.two, alignItems: "center" },
	saveBtn: { borderRadius: Spacing.two, paddingVertical: Spacing.three, alignItems: "center" },
});
