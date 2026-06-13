import { FontAwesome5 } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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
import {
	DEALER_PILLS_NO_FIXED,
	OptionCard,
	PillOption,
	Pills,
	SectionHeader,
	SetupCard,
} from "@/components/setup-form";
import { Spacing } from "@/constants/theme";
import { GameTemplate, useGamesContext } from "@/context/games-context";
import { useDraft } from "@/hooks/use-draft";
import { useTheme } from "@/hooks/use-theme";
import { useUnsavedChangesScroll } from "@/hooks/use-unsaved-changes-scroll";
import { shared } from "@/styles/shared";
import { consumePendingIcon } from "@/utils/icon-picker-state";
import { forms } from "@/styles/forms";
import { getDealerHintText, getTurnHintText } from "@/utils/game";

type FirstPlayerSetting = NonNullable<GameTemplate["firstPlayerSetting"]>;

export default function TemplateScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { getTemplate, updateTemplate } = useGamesContext();
	const theme = useTheme();
	const router = useRouter();
	const template = getTemplate(id);

	const { draft, patch, isDirty, save: saveDraft, reset: resetDraft } = useDraft(template, updateTemplate);
	const scrollRef = useRef<ScrollView>(null);
	const { highlightStyle, exitSafely } = useUnsavedChangesScroll(isDirty, scrollRef);
	const [showRoundNumpad, setShowRoundNumpad] = useState(false);

	useFocusEffect(useCallback(() => {
		const icon = consumePendingIcon();
		if (icon !== undefined) patch({ icon: icon ?? undefined });
	}, []));

	if (!template || !draft) return null;

	const dealerEnabled = !!draft.dealerEnabled;
	const dealerMode = draft.dealerMode === "fixed" ? "rotation" : (draft.dealerMode ?? "rotation");
	const turnsEnabled = !!draft.turnOrderEnabled;
	const firstPlayerSetting = draft.firstPlayerSetting ?? "rotation";

	const dealerHint = getDealerHintText(dealerEnabled, dealerMode);
	const turnHint = getTurnHintText(turnsEnabled, firstPlayerSetting);

	const firstPlayerPills: PillOption<FirstPlayerSetting>[] = dealerEnabled
		? [
			{ key: "left-of-dealer", label: "Left of Dealer", icon: "angle-left" },
			{ key: "rotation", label: "Rotating", icon: "sync-alt" },
			{ key: "random", label: "Random", icon: "random" },
		]
		: [
			{ key: "rotation", label: "Rotating", icon: "sync-alt" },
			{ key: "random", label: "Random", icon: "random" },
		];

	const innerInput = { backgroundColor: theme.background, color: theme.text } as const;

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
					<SetupCard>
						<View style={forms.labelRow}>
							<ThemedText style={forms.label} themeColor="textSecondary">TEMPLATE NAME</ThemedText>
							<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary"> (OPTIONAL)</ThemedText>
						</View>
						<View style={forms.nameRow}>
							<HapticButton
								style={[forms.iconBtn, { backgroundColor: theme.background }]}
								onPress={() => router.push("/icon-picker")}
								activeOpacity={0.7}
							>
								<FontAwesome5 name={(draft.icon ?? "users") as any} size={22} color={theme.textSecondary} />
							</HapticButton>
							<TextInput allowFontScaling={false}
								style={[shared.input, innerInput, { flex: 1 }]}
								placeholder="Untitled Template"
								placeholderTextColor={theme.textSecondary}
								value={draft.name}
								onChangeText={v => patch({ name: v })}
								maxLength={30}
								returnKeyType="done"
							/>
						</View>
					</SetupCard>

					<View style={styles.group}>
						<SectionHeader label="GAME CONDITIONS" />

					{/* Rounds */}
					<SetupCard>
						<ThemedText style={forms.label} themeColor="textSecondary">ROUNDS</ThemedText>
						{draft.totalRounds !== undefined && (
							<View style={forms.roundsRow}>
								<HapticButton
									style={[forms.roundsInput, { backgroundColor: theme.backgroundSelected }]}
									onPress={() => setShowRoundNumpad(true)}
								>
									<ThemedText style={{ color: theme.text, fontSize: 16, textAlign: "center" }}>{draft.totalRounds}</ThemedText>
								</HapticButton>
								<ThemedText type="default">rounds</ThemedText>
							</View>
						)}
						<HapticButton
							style={[forms.toggleRow, { backgroundColor: theme.backgroundSelected }]}
							onPress={() => patch({ totalRounds: draft.totalRounds === undefined ? 10 : undefined })}
						>
							<ThemedText type="default">Endless Mode</ThemedText>
							<View style={[forms.toggle, { backgroundColor: draft.totalRounds === undefined ? theme.accent : theme.backgroundElement }]}>
								<View style={[forms.toggleThumb, draft.totalRounds === undefined && forms.toggleThumbOn]} />
							</View>
						</HapticButton>
					</SetupCard>

					{/* Winner */}
					<SetupCard>
						<ThemedText style={forms.label} themeColor="textSecondary">WINNER</ThemedText>
						<View style={forms.segmentRow}>
							<HapticButton
								style={[forms.segLeft, { backgroundColor: !draft.rankByLowest ? theme.accent : theme.backgroundSelected }]}
								onPress={() => patch({ rankByLowest: false })}
							>
								<ThemedText type="small" style={{ color: !draft.rankByLowest ? theme.accentText : theme.text }}>Highest score</ThemedText>
							</HapticButton>
							<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
							<HapticButton
								style={[forms.segRight, { backgroundColor: draft.rankByLowest ? theme.accent : theme.backgroundSelected }]}
								onPress={() => patch({ rankByLowest: true })}
							>
								<ThemedText type="small" style={{ color: draft.rankByLowest ? theme.accentText : theme.text }}>Lowest score</ThemedText>
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
							onToggle={() => patch({ dealerEnabled: dealerEnabled ? undefined : true })}
						>
							<Pills
								options={DEALER_PILLS_NO_FIXED}
								value={dealerMode}
								onChange={m => patch({ dealerMode: m })}
							/>
							{dealerHint && <ThemedText style={forms.hint}>{dealerHint}</ThemedText>}
						</OptionCard>

						{/* Goes first */}
						<OptionCard
							icon="long-arrow-alt-right"
							title="Goes first"
							subtitle="Track who starts each round"
							value={turnsEnabled}
							onToggle={() => patch({ turnOrderEnabled: !turnsEnabled || undefined })}
						>
							<Pills
								options={firstPlayerPills}
								value={firstPlayerSetting}
								onChange={s => patch({ firstPlayerSetting: s })}
							/>
							{turnHint && <ThemedText style={forms.hint}>{turnHint}</ThemedText>}
						</OptionCard>

						{/* Dice */}
						<OptionCard
							icon="dice"
							title="Dice"
							subtitle="Show dice roller in game"
							value={!!draft.extras?.dice}
							onToggle={() => patch({ extras: { ...draft.extras, dice: !draft.extras?.dice } })}
						/>

						{/* Timer */}
						<OptionCard
							icon="stopwatch"
							title="Timer"
							subtitle="Show timer in game"
							value={!!draft.extras?.timer}
							onToggle={() => patch({ extras: { ...draft.extras, timer: !draft.extras?.timer } })}
						/>
					</View>

					{/* Cancel / Save Changes */}
					{isDirty && (
						<View style={[styles.actionsContainer, highlightStyle]}>
							<HapticButton
								style={[styles.cancelBtn, { backgroundColor: theme.backgroundElement }]}
								onPress={() => { exitSafely(); resetDraft(); router.back(); }}
							>
								<ThemedText type="small" themeColor="textSecondary">Cancel Changes</ThemedText>
							</HapticButton>
							<HapticButton
								style={[styles.saveBtn, { backgroundColor: theme.accent }]}
								onPress={() => { exitSafely(); saveDraft(); router.back(); }}
							>
								<ThemedText type="smallBold" style={{ color: theme.accentText }}>Save Changes</ThemedText>
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
	group: { gap: Spacing.two },
	actionsContainer: { gap: Spacing.two, padding: Spacing.one },
	cancelBtn: { borderRadius: Spacing.two, paddingVertical: Spacing.two, alignItems: "center" },
	saveBtn: { borderRadius: Spacing.two, paddingVertical: Spacing.three, alignItems: "center" },
});
