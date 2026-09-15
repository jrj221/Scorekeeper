import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CellEditModal } from "@/components/cell-edit-modal";
import { HapticButton } from "@/components/haptic-button";
import { DEALER_PILLS_NO_FIXED, SectionHeader } from "@/components/setup-form";
import { DealerOptionCard, ExtrasOptionCards, FirstPlayerOptionCard, GameConditionsSection, GameNameCard } from "@/components/setup";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { DealerMode, useGamesContext } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { forms } from "@/styles/forms";
import { shared } from "@/styles/shared";
import { getDealerHintText, getTurnHintText } from "@/utils/game";
import { consumePendingIcon } from "@/utils/icon-picker-state";

type FirstPlayerSetting = "random" | "left-of-dealer" | "rotation";

export default function NewTemplateScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { createTemplate } = useGamesContext();

	const [name, setName] = useState("");
	const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
	const [isIndefinite, setIsIndefinite] = useState(false);
	const [roundCountStr, setRoundCountStr] = useState("10");
	const [showRoundNumpad, setShowRoundNumpad] = useState(false);
	const [rankByLowest, setRankByLowest] = useState(false);

	// Dealer
	const [dealerEnabled, setDealerEnabled] = useState(false);
	const [dealerMode, setDealerMode] = useState<Exclude<DealerMode, "fixed">>("rotation");

	// Turn order
	const [turnOrderEnabled, setTurnOrderEnabled] = useState(true);
	const [firstPlayerSetting, setFirstPlayerSetting] = useState<FirstPlayerSetting>("rotation");

	// Extras
	const [extraDice, setExtraDice] = useState(false);
	const [extraTimer, setExtraTimer] = useState(false);

	useFocusEffect(
		useCallback(() => {
			const icon = consumePendingIcon();
			if (icon !== undefined) setSelectedIcon(icon);
		}, []),
	);

	const handleCreate = useCallback(() => {
		const totalRounds = !isIndefinite ? Math.max(1, parseInt(roundCountStr, 10) || 1) : undefined;
		const id = createTemplate({
			name: name.trim() || "Untitled Template",
			icon: selectedIcon ?? undefined,
			totalRounds,
			rankByLowest,
			dealerEnabled: dealerEnabled || undefined,
			dealerMode: dealerEnabled ? dealerMode : undefined,
			turnOrderEnabled: turnOrderEnabled || undefined,
			firstPlayerSetting: turnOrderEnabled ? firstPlayerSetting : undefined,
			extras:
				extraDice || extraTimer ? { dice: extraDice || undefined, timer: extraTimer || undefined } : undefined,
		});
		router.replace("/(tabs)/templates");
	}, [
		name,
		selectedIcon,
		isIndefinite,
		roundCountStr,
		rankByLowest,
		dealerEnabled,
		dealerMode,
		turnOrderEnabled,
		firstPlayerSetting,
		extraDice,
		extraTimer,
		createTemplate,
		router,
	]);

	const dealerHint = getDealerHintText(dealerEnabled, dealerMode);
	const turnHint = getTurnHintText(turnOrderEnabled, firstPlayerSetting);

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "New Template" }} />
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<ScrollView
					contentContainerStyle={styles.scroll}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<GameNameCard
						label="TEMPLATE NAME"
						icon={selectedIcon}
						onPressIcon={() => router.push("/icon-picker")}
						name={name}
						onChangeName={setName}
						placeholder="Untitled Template"
					/>

					<GameConditionsSection
						totalRounds={isIndefinite ? undefined : parseInt(roundCountStr, 10) || undefined}
						onPressRounds={() => setShowRoundNumpad(true)}
						onToggleIndefinite={() => setIsIndefinite((v) => !v)}
						rankByLowest={rankByLowest}
						onChangeRankByLowest={setRankByLowest}
					/>

					{/* Options */}
					<View style={styles.group}>
						<SectionHeader label="OPTIONS" />

						<DealerOptionCard
							enabled={dealerEnabled}
							onToggleEnabled={() => setDealerEnabled((v) => !v)}
							mode={dealerMode}
							onChangeMode={(m) => setDealerMode(m as Exclude<DealerMode, "fixed">)}
							pillOptions={DEALER_PILLS_NO_FIXED}
							players={[]}
							showPersonPicker={false}
							hint={dealerHint}
						/>

						<FirstPlayerOptionCard
							enabled={turnOrderEnabled}
							onToggleEnabled={() => setTurnOrderEnabled((v) => !v)}
							mode={firstPlayerSetting}
							onChangeMode={setFirstPlayerSetting}
							dealerEnabled={dealerEnabled}
							players={[]}
							showPersonPicker={false}
							hint={turnHint}
						/>

						<ExtrasOptionCards
							dice={extraDice}
							onToggleDice={() => setExtraDice((v) => !v)}
							timer={extraTimer}
							onToggleTimer={() => setExtraTimer((v) => !v)}
						/>
					</View>

					{/* Create */}
					<HapticButton
						style={[shared.button, forms.createBtn, { backgroundColor: theme.accent }]}
						onPress={handleCreate}
					>
						<ThemedText type="smallBold" style={{ color: theme.accentText }}>
							Create Template
						</ThemedText>
					</HapticButton>
				</ScrollView>
				<SafeAreaView edges={["bottom"]} />
			</KeyboardAvoidingView>

			<CellEditModal
				visible={showRoundNumpad}
				title="Number of Rounds"
				initialValue={parseInt(roundCountStr) || null}
				allowNegative={false}
				minValue={1}
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
	scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
	group: { gap: Spacing.two },
});
