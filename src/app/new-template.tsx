import { FontAwesome5 } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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
import { DealerMode, useGamesContext } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";
import { consumePendingIcon } from "@/utils/icon-picker-state";
import { forms } from "@/styles/forms";
import { getDealerHintText, getTurnHintText } from "@/utils/game";

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

	useFocusEffect(useCallback(() => {
		const icon = consumePendingIcon();
		if (icon !== undefined) setSelectedIcon(icon);
	}, []));

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
			extras: (extraDice || extraTimer) ? { dice: extraDice || undefined, timer: extraTimer || undefined } : undefined,
		});
		router.replace("/(tabs)/templates");
	}, [name, selectedIcon, isIndefinite, roundCountStr, rankByLowest, dealerEnabled, dealerMode, turnOrderEnabled, firstPlayerSetting, extraDice, extraTimer, createTemplate, router]);

	const dealerHint = getDealerHintText(dealerEnabled, dealerMode);
	const turnHint = getTurnHintText(turnOrderEnabled, firstPlayerSetting);

	const innerInput = { backgroundColor: theme.background, color: theme.text } as const;

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

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "New Template" }} />
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<ScrollView
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
								<FontAwesome5 name={(selectedIcon ?? "users") as any} size={20} color={theme.textSecondary} />
							</HapticButton>
							<TextInput
								style={[shared.input, innerInput, { flex: 1 }]}
								placeholder="Untitled Template"
								placeholderTextColor={theme.textSecondary}
								value={name}
								onChangeText={setName}
								maxLength={30}
								returnKeyType="next"
							/>
						</View>
					</SetupCard>

					<View style={styles.group}>
						<SectionHeader label="GAME CONDITIONS" />

					{/* Rounds */}
					<SetupCard>
						<ThemedText style={forms.label} themeColor="textSecondary">ROUNDS</ThemedText>
						{!isIndefinite && (
							<View style={forms.roundsRow}>
								<HapticButton
									style={[forms.roundsInput, { backgroundColor: theme.backgroundSelected }]}
									onPress={() => setShowRoundNumpad(true)}
								>
									<ThemedText style={{ color: theme.text, fontSize: 16, textAlign: "center" }}>
										{roundCountStr || "—"}
									</ThemedText>
								</HapticButton>
								<ThemedText type="default">rounds</ThemedText>
							</View>
						)}
						<HapticButton
							style={[forms.toggleRow, { backgroundColor: theme.backgroundSelected }]}
							onPress={() => setIsIndefinite((v) => !v)}
						>
							<ThemedText type="default">Endless Mode</ThemedText>
							<View style={[forms.toggle, { backgroundColor: isIndefinite ? theme.accent : theme.backgroundElement }]}>
								<View style={[forms.toggleThumb, isIndefinite && forms.toggleThumbOn]} />
							</View>
						</HapticButton>
					</SetupCard>

					{/* Winner */}
					<SetupCard>
						<ThemedText style={forms.label} themeColor="textSecondary">WINNER</ThemedText>
						<View style={forms.segmentRow}>
							<HapticButton
								style={[forms.segLeft, { backgroundColor: !rankByLowest ? theme.accent : theme.backgroundSelected }]}
								onPress={() => setRankByLowest(false)}
							>
								<ThemedText type="small" style={{ color: !rankByLowest ? theme.accentText : theme.text }}>Highest score</ThemedText>
							</HapticButton>
							<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
							<HapticButton
								style={[forms.segRight, { backgroundColor: rankByLowest ? theme.accent : theme.backgroundSelected }]}
								onPress={() => setRankByLowest(true)}
							>
								<ThemedText type="small" style={{ color: rankByLowest ? theme.accentText : theme.text }}>Lowest score</ThemedText>
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
							onToggle={() => setDealerEnabled((v) => !v)}
						>
							<Pills
								options={DEALER_PILLS_NO_FIXED}
								value={dealerMode}
								onChange={setDealerMode}
							/>
							{dealerHint && <ThemedText style={forms.hint}>{dealerHint}</ThemedText>}
						</OptionCard>

						{/* Goes first */}
						<OptionCard
							icon="long-arrow-alt-right"
							title="Goes first"
							subtitle="Track who starts each round"
							value={turnOrderEnabled}
							onToggle={() => setTurnOrderEnabled((v) => !v)}
						>
							<Pills
								options={firstPlayerPills}
								value={firstPlayerSetting}
								onChange={setFirstPlayerSetting}
							/>
							{turnHint && <ThemedText style={forms.hint}>{turnHint}</ThemedText>}
						</OptionCard>

						{/* Dice */}
						<OptionCard
							icon="dice"
							title="Dice"
							subtitle="Show dice roller in game"
							value={extraDice}
							onToggle={() => setExtraDice((v) => !v)}
						/>

						{/* Timer */}
						<OptionCard
							icon="stopwatch"
							title="Timer"
							subtitle="Show timer in game"
							value={extraTimer}
							onToggle={() => setExtraTimer((v) => !v)}
						/>
					</View>

					{/* Create */}
					<HapticButton
						style={[shared.button, forms.createBtn, { backgroundColor: theme.accent }]}
						onPress={handleCreate}
					>
						<ThemedText type="smallBold" style={{ color: theme.accentText }}>Create Template</ThemedText>
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
	scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
	group: { gap: Spacing.two },
});
