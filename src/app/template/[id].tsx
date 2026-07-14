import { useFocusEffect } from "@react-navigation/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CellEditModal } from "@/components/cell-edit-modal";
import { HapticButton } from "@/components/haptic-button";
import { DEALER_PILLS_NO_FIXED, SectionHeader } from "@/components/setup-form";
import { DealerOptionCard, ExtrasOptionCards, FirstPlayerOptionCard, GameConditionsSection, GameNameCard } from "@/components/setup";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { GameTemplate, useGamesContext } from "@/context/games-context";
import { useDraft } from "@/hooks/use-draft";
import { useTheme } from "@/hooks/use-theme";
import { useUnsavedChangesScroll } from "@/hooks/use-unsaved-changes-scroll";
import { shared } from "@/styles/shared";
import { getDealerHintText, getTurnHintText } from "@/utils/game";
import { consumePendingIcon } from "@/utils/icon-picker-state";

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

	useFocusEffect(
		useCallback(() => {
			const icon = consumePendingIcon();
			if (icon !== undefined) patch({ icon: icon ?? undefined });
		}, []),
	);

	if (!template || !draft) return null;

	const dealerEnabled = !!draft.dealerEnabled;
	const dealerMode = draft.dealerMode === "fixed" ? "rotation" : (draft.dealerMode ?? "rotation");
	const turnsEnabled = !!draft.turnOrderEnabled;
	const firstPlayerSetting: FirstPlayerSetting = draft.firstPlayerSetting ?? "rotation";

	const dealerHint = getDealerHintText(dealerEnabled, dealerMode);
	const turnHint = getTurnHintText(turnsEnabled, firstPlayerSetting);

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
					<GameNameCard
						label="TEMPLATE NAME"
						icon={draft.icon}
						iconSize={22}
						onPressIcon={() => router.push("/icon-picker")}
						name={draft.name}
						onChangeName={(v) => patch({ name: v })}
						placeholder="Untitled Template"
						returnKeyType="done"
					/>

					<GameConditionsSection
						totalRounds={draft.totalRounds}
						onPressRounds={() => setShowRoundNumpad(true)}
						onToggleIndefinite={() => patch({ totalRounds: draft.totalRounds === undefined ? 10 : undefined })}
						rankByLowest={draft.rankByLowest}
						onChangeRankByLowest={(v) => patch({ rankByLowest: v })}
					/>

					{/* Options */}
					<View style={styles.group}>
						<SectionHeader label="OPTIONS" />

						<DealerOptionCard
							enabled={dealerEnabled}
							onToggleEnabled={() => patch({ dealerEnabled: dealerEnabled ? undefined : true })}
							mode={dealerMode}
							onChangeMode={(m) => patch({ dealerMode: m })}
							pillOptions={DEALER_PILLS_NO_FIXED}
							players={[]}
							showPersonPicker={false}
							hint={dealerHint}
						/>

						<FirstPlayerOptionCard
							enabled={turnsEnabled}
							onToggleEnabled={() => patch({ turnOrderEnabled: !turnsEnabled || undefined })}
							mode={firstPlayerSetting}
							onChangeMode={(s) => patch({ firstPlayerSetting: s })}
							dealerEnabled={dealerEnabled}
							players={[]}
							showPersonPicker={false}
							hint={turnHint}
						/>

						<ExtrasOptionCards
							dice={!!draft.extras?.dice}
							onToggleDice={() => patch({ extras: { ...draft.extras, dice: !draft.extras?.dice } })}
							timer={!!draft.extras?.timer}
							onToggleTimer={() => patch({ extras: { ...draft.extras, timer: !draft.extras?.timer } })}
						/>
					</View>

					{/* Cancel / Save Changes */}
					{isDirty && (
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
								style={[styles.saveBtn, { backgroundColor: theme.accent }]}
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
	actionsContainer: { gap: Spacing.two, padding: Spacing.one },
	cancelBtn: { borderRadius: Spacing.two, paddingVertical: Spacing.two, alignItems: "center" },
	saveBtn: { borderRadius: Spacing.two, paddingVertical: Spacing.three, alignItems: "center" },
});
