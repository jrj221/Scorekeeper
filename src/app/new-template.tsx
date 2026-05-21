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
import { Spacing } from "@/constants/theme";
import { DealerMode, useGamesContext } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";
import { consumePendingIcon } from "@/utils/icon-picker-state";
import { forms } from '@/styles/forms';
import { getDealerHintText, getTurnHintText } from "@/utils/game";

export default function NewTemplateScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { createTemplate } = useGamesContext();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
	const [isIndefinite, setIsIndefinite] = useState(false);
	const [roundCountStr, setRoundCountStr] = useState("10");
	const [showRoundNumpad, setShowRoundNumpad] = useState(false);
	const [rankByLowest, setRankByLowest] = useState(false);

	// Dealer
	const [dealerEnabled, setDealerEnabled] = useState(false);
	const [dealerMode, setDealerMode] = useState<DealerMode>("rotation");

	// Turn order
	const [turnOrderEnabled, setTurnOrderEnabled] = useState(true);
	const [firstPlayerSetting, setFirstPlayerSetting] = useState<"random" | "left-of-dealer" | "rotation">("rotation");

	useFocusEffect(useCallback(() => {
		const icon = consumePendingIcon();
		if (icon !== undefined) setSelectedIcon(icon);
	}, []));

	const handleCreate = useCallback(() => {
		const totalRounds = !isIndefinite ? Math.max(1, parseInt(roundCountStr, 10) || 1) : undefined;
		const id = createTemplate({
			name: name.trim() || "Untitled Template",
			icon: selectedIcon ?? undefined,
			description: description.trim() || undefined,
			totalRounds,
			rankByLowest,
			dealerEnabled: dealerEnabled || undefined,
			dealerMode: dealerEnabled ? dealerMode : undefined,
			turnOrderEnabled: turnOrderEnabled || undefined,
			firstPlayerSetting: turnOrderEnabled ? firstPlayerSetting : undefined,
		});
		router.replace("/(tabs)/templates");
	}, [name, description, selectedIcon, isIndefinite, roundCountStr, rankByLowest, dealerEnabled, dealerMode, turnOrderEnabled, firstPlayerSetting, createTemplate, router]);

	const dealerHint = getDealerHintText(dealerEnabled, dealerMode);
	const turnHint = getTurnHintText(turnOrderEnabled, firstPlayerSetting);
	const card = [forms.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }];
	const inner = { backgroundColor: theme.backgroundSelected } as const;

	// Dealer hint
	// Turn order hint
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
					<View style={card}>
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
								style={[shared.input, { backgroundColor: theme.background, color: theme.text, flex: 1 }]}
								placeholder="Untitled Template"
								placeholderTextColor={theme.textSecondary}
								value={name}
								onChangeText={setName}
								maxLength={30}
								returnKeyType="next"
							/>
						</View>
					</View>

					{/* Description */}
					<View style={card}>
						<View style={forms.labelRow}>
							<ThemedText style={forms.label} themeColor="textSecondary">DESCRIPTION</ThemedText>
							<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary"> (OPTIONAL)</ThemedText>
						</View>
						<TextInput
							style={[shared.input, { backgroundColor: theme.background, color: theme.text }]}
							placeholder="Add a description"
							placeholderTextColor={theme.textSecondary}
							value={description}
							onChangeText={setDescription}
							maxLength={80}
							returnKeyType="next"
						/>
					</View>

					{/* Rounds */}
					<View style={card}>
						<ThemedText style={forms.label} themeColor="textSecondary">ROUNDS</ThemedText>
						{!isIndefinite && (
							<View style={forms.roundsRow}>
								<HapticButton
									style={[forms.roundsInput, inner]}
									onPress={() => setShowRoundNumpad(true)}
								>
									<ThemedText style={{ color: theme.text, fontSize: 16, textAlign: "center" }}>
										{roundCountStr || "—"}
									</ThemedText>
								</HapticButton>
								<ThemedText type="default">rounds</ThemedText>
							</View>
						)}
						<HapticButton style={[forms.toggleRow, inner]} onPress={() => setIsIndefinite(v => !v)}>
							<ThemedText type="default">Endless Mode</ThemedText>
							<View style={[forms.toggle, { backgroundColor: isIndefinite ? theme.accent : theme.backgroundElement }]}>
								<View style={[forms.toggleThumb, isIndefinite && forms.toggleThumbOn]} />
							</View>
						</HapticButton>
					</View>

					{/* Winner */}
					<View style={card}>
						<ThemedText style={forms.label} themeColor="textSecondary">WINNER</ThemedText>
						<View style={forms.segmentRow}>
							<HapticButton
								style={[forms.segLeft, { backgroundColor: !rankByLowest ? theme.accent : inner.backgroundColor }]}
								onPress={() => setRankByLowest(false)}
							>
								<ThemedText type="small" style={{ color: !rankByLowest ? "#fff" : theme.text }}>Highest score</ThemedText>
							</HapticButton>
							<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
							<HapticButton
								style={[forms.segRight, { backgroundColor: rankByLowest ? theme.accent : inner.backgroundColor }]}
								onPress={() => setRankByLowest(true)}
							>
								<ThemedText type="small" style={{ color: rankByLowest ? "#fff" : theme.text }}>Lowest score</ThemedText>
							</HapticButton>
						</View>
					</View>

					{/* Dealer */}
					<View style={card}>
						<View style={forms.labelRow}>
							<ThemedText style={forms.label} themeColor="textSecondary">DEALER</ThemedText>
							<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary"> (OPTIONAL)</ThemedText>
						</View>
						<HapticButton style={[forms.toggleRow, inner]} onPress={() => setDealerEnabled(v => !v)}>
							<ThemedText type="default">Track dealer</ThemedText>
							<View style={[forms.toggle, { backgroundColor: dealerEnabled ? theme.accent : theme.backgroundElement }]}>
								<View style={[forms.toggleThumb, dealerEnabled && forms.toggleThumbOn]} />
							</View>
						</HapticButton>
						{dealerEnabled && (
							<>
								<ThemedText style={forms.subLabel} themeColor="textSecondary">DEALER IS</ThemedText>
								<View style={forms.segmentRow}>
									<HapticButton
										style={[forms.segLeft, { backgroundColor: dealerMode === "rotation" ? theme.accent : inner.backgroundColor }]}
										onPress={() => setDealerMode("rotation")}
									>
										<ThemedText type="small" style={{ color: dealerMode === "rotation" ? "#fff" : theme.text }}>Rotation</ThemedText>
									</HapticButton>
									<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
									<HapticButton
										style={[forms.segRight, { backgroundColor: dealerMode === "random" ? theme.accent : inner.backgroundColor }]}
										onPress={() => setDealerMode("random")}
									>
										<ThemedText type="small" style={{ color: dealerMode === "random" ? "#fff" : theme.text }}>Random</ThemedText>
									</HapticButton>
								</View>
								{dealerHint && <ThemedText style={forms.hint}>{dealerHint}</ThemedText>}
							</>
						)}
					</View>

					{/* Turn Order */}
					<View style={card}>
						<View style={forms.labelRow}>
							<ThemedText style={forms.label} themeColor="textSecondary">TURN ORDER</ThemedText>
							<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary"> (OPTIONAL)</ThemedText>
						</View>
						<HapticButton style={[forms.toggleRow, inner]} onPress={() => setTurnOrderEnabled(v => !v)}>
							<ThemedText type="default">Track who goes first</ThemedText>
							<View style={[forms.toggle, { backgroundColor: turnOrderEnabled ? theme.accent : theme.backgroundElement }]}>
								<View style={[forms.toggleThumb, turnOrderEnabled && forms.toggleThumbOn]} />
							</View>
						</HapticButton>
						{turnOrderEnabled && (
							<>
								<ThemedText style={forms.subLabel} themeColor="textSecondary">WHO GOES FIRST</ThemedText>
								<View style={forms.segmentRow}>
									{dealerEnabled && (
										<>
											<HapticButton
												style={[forms.segLeft, { backgroundColor: firstPlayerSetting === "left-of-dealer" ? theme.accent : inner.backgroundColor }]}
												onPress={() => setFirstPlayerSetting("left-of-dealer")}
											>
												<ThemedText type="small" style={{ color: firstPlayerSetting === "left-of-dealer" ? "#fff" : theme.text }}>Left of Dealer</ThemedText>
											</HapticButton>
											<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
										</>
									)}
									<HapticButton
										style={[dealerEnabled ? forms.segMid : forms.segLeft, { backgroundColor: firstPlayerSetting === "rotation" ? theme.accent : inner.backgroundColor }]}
										onPress={() => setFirstPlayerSetting("rotation")}
									>
										<ThemedText type="small" style={{ color: firstPlayerSetting === "rotation" ? "#fff" : theme.text }}>Rotation</ThemedText>
									</HapticButton>
									<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
									<HapticButton
										style={[forms.segRight, { backgroundColor: firstPlayerSetting === "random" ? theme.accent : inner.backgroundColor }]}
										onPress={() => setFirstPlayerSetting("random")}
									>
										<ThemedText type="small" style={{ color: firstPlayerSetting === "random" ? "#fff" : theme.text }}>Random</ThemedText>
									</HapticButton>
								</View>
								{turnHint && <ThemedText style={forms.hint}>{turnHint}</ThemedText>}
							</>
						)}
					</View>

					{/* Create */}
					<HapticButton
						style={[shared.button, forms.createBtn, { backgroundColor: theme.accent }]}
						onPress={handleCreate}
					>
						<ThemedText type="smallBold" style={{ color: "#fff" }}>Create Template</ThemedText>
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
});
