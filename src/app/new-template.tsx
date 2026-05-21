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

	const card = [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }];
	const inner = { backgroundColor: theme.backgroundSelected } as const;

	// Dealer hint
	const dealerHint = dealerEnabled
		? dealerMode === "random"
			? "The dealer will be randomly determined each round."
			: "Dealing rotates through all players each round."
		: null;

	// Turn order hint
	const turnHint = turnOrderEnabled
		? firstPlayerSetting === "random"
			? "The first player will be randomly determined each round."
			: firstPlayerSetting === "left-of-dealer"
				? "The player to the left of the dealer goes first each round."
				: "The first player rotates through the group each round."
		: null;

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
						<View style={styles.labelRow}>
							<ThemedText style={styles.label} themeColor="textSecondary">TEMPLATE NAME</ThemedText>
							<ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary"> (OPTIONAL)</ThemedText>
						</View>
						<View style={styles.nameRow}>
							<HapticButton
								style={[styles.iconBtn, { backgroundColor: theme.background }]}
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
						<View style={styles.labelRow}>
							<ThemedText style={styles.label} themeColor="textSecondary">DESCRIPTION</ThemedText>
							<ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary"> (OPTIONAL)</ThemedText>
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
						<ThemedText style={styles.label} themeColor="textSecondary">ROUNDS</ThemedText>
						{!isIndefinite && (
							<View style={styles.roundsRow}>
								<HapticButton
									style={[styles.roundsInput, inner]}
									onPress={() => setShowRoundNumpad(true)}
								>
									<ThemedText style={{ color: theme.text, fontSize: 16, textAlign: "center" }}>
										{roundCountStr || "—"}
									</ThemedText>
								</HapticButton>
								<ThemedText type="default">rounds</ThemedText>
							</View>
						)}
						<HapticButton style={[styles.toggleRow, inner]} onPress={() => setIsIndefinite(v => !v)}>
							<ThemedText type="default">Endless Mode</ThemedText>
							<View style={[styles.toggle, { backgroundColor: isIndefinite ? "#0077B6" : theme.backgroundElement }]}>
								<View style={[styles.toggleThumb, isIndefinite && styles.toggleThumbOn]} />
							</View>
						</HapticButton>
					</View>

					{/* Winner */}
					<View style={card}>
						<ThemedText style={styles.label} themeColor="textSecondary">WINNER</ThemedText>
						<View style={styles.segmentRow}>
							<HapticButton
								style={[styles.segLeft, { backgroundColor: !rankByLowest ? "#0077B6" : inner.backgroundColor }]}
								onPress={() => setRankByLowest(false)}
							>
								<ThemedText type="small" style={{ color: !rankByLowest ? "#fff" : theme.text }}>Highest score</ThemedText>
							</HapticButton>
							<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
							<HapticButton
								style={[styles.segRight, { backgroundColor: rankByLowest ? "#0077B6" : inner.backgroundColor }]}
								onPress={() => setRankByLowest(true)}
							>
								<ThemedText type="small" style={{ color: rankByLowest ? "#fff" : theme.text }}>Lowest score</ThemedText>
							</HapticButton>
						</View>
					</View>

					{/* Dealer */}
					<View style={card}>
						<View style={styles.labelRow}>
							<ThemedText style={styles.label} themeColor="textSecondary">DEALER</ThemedText>
							<ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary"> (OPTIONAL)</ThemedText>
						</View>
						<HapticButton style={[styles.toggleRow, inner]} onPress={() => setDealerEnabled(v => !v)}>
							<ThemedText type="default">Track dealer</ThemedText>
							<View style={[styles.toggle, { backgroundColor: dealerEnabled ? "#0077B6" : theme.backgroundElement }]}>
								<View style={[styles.toggleThumb, dealerEnabled && styles.toggleThumbOn]} />
							</View>
						</HapticButton>
						{dealerEnabled && (
							<>
								<ThemedText style={styles.subLabel} themeColor="textSecondary">DEALER IS</ThemedText>
								<View style={styles.segmentRow}>
									<HapticButton
										style={[styles.segLeft, { backgroundColor: dealerMode === "rotation" ? "#0077B6" : inner.backgroundColor }]}
										onPress={() => setDealerMode("rotation")}
									>
										<ThemedText type="small" style={{ color: dealerMode === "rotation" ? "#fff" : theme.text }}>Rotation</ThemedText>
									</HapticButton>
									<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
									<HapticButton
										style={[styles.segRight, { backgroundColor: dealerMode === "random" ? "#0077B6" : inner.backgroundColor }]}
										onPress={() => setDealerMode("random")}
									>
										<ThemedText type="small" style={{ color: dealerMode === "random" ? "#fff" : theme.text }}>Random</ThemedText>
									</HapticButton>
								</View>
								{dealerHint && <ThemedText style={styles.hint}>{dealerHint}</ThemedText>}
							</>
						)}
					</View>

					{/* Turn Order */}
					<View style={card}>
						<View style={styles.labelRow}>
							<ThemedText style={styles.label} themeColor="textSecondary">TURN ORDER</ThemedText>
							<ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary"> (OPTIONAL)</ThemedText>
						</View>
						<HapticButton style={[styles.toggleRow, inner]} onPress={() => setTurnOrderEnabled(v => !v)}>
							<ThemedText type="default">Track who goes first</ThemedText>
							<View style={[styles.toggle, { backgroundColor: turnOrderEnabled ? "#0077B6" : theme.backgroundElement }]}>
								<View style={[styles.toggleThumb, turnOrderEnabled && styles.toggleThumbOn]} />
							</View>
						</HapticButton>
						{turnOrderEnabled && (
							<>
								<ThemedText style={styles.subLabel} themeColor="textSecondary">WHO GOES FIRST</ThemedText>
								<View style={styles.segmentRow}>
									{dealerEnabled && (
										<>
											<HapticButton
												style={[styles.segLeft, { backgroundColor: firstPlayerSetting === "left-of-dealer" ? "#0077B6" : inner.backgroundColor }]}
												onPress={() => setFirstPlayerSetting("left-of-dealer")}
											>
												<ThemedText type="small" style={{ color: firstPlayerSetting === "left-of-dealer" ? "#fff" : theme.text }}>Left of Dealer</ThemedText>
											</HapticButton>
											<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
										</>
									)}
									<HapticButton
										style={[dealerEnabled ? styles.segMid : styles.segLeft, { backgroundColor: firstPlayerSetting === "rotation" ? "#0077B6" : inner.backgroundColor }]}
										onPress={() => setFirstPlayerSetting("rotation")}
									>
										<ThemedText type="small" style={{ color: firstPlayerSetting === "rotation" ? "#fff" : theme.text }}>Rotation</ThemedText>
									</HapticButton>
									<View style={[styles.segDivider, { backgroundColor: theme.background }]} />
									<HapticButton
										style={[styles.segRight, { backgroundColor: firstPlayerSetting === "random" ? "#0077B6" : inner.backgroundColor }]}
										onPress={() => setFirstPlayerSetting("random")}
									>
										<ThemedText type="small" style={{ color: firstPlayerSetting === "random" ? "#fff" : theme.text }}>Random</ThemedText>
									</HapticButton>
								</View>
								{turnHint && <ThemedText style={styles.hint}>{turnHint}</ThemedText>}
							</>
						)}
					</View>

					{/* Create */}
					<HapticButton
						style={[shared.button, styles.createBtn, { backgroundColor: "#0077B6" }]}
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
	card: {
		gap: Spacing.two,
		borderRadius: Spacing.two,
		padding: Spacing.three,
		borderWidth: StyleSheet.hairlineWidth,
	},
	labelRow: { flexDirection: "row", alignItems: "baseline" },
	label: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8 },
	subLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, opacity: 0.7 },
	hint: { fontSize: 13, lineHeight: 18, opacity: 0.7 },
	nameRow: { flexDirection: "row", alignItems: "stretch", gap: Spacing.two },
	iconBtn: { borderRadius: Spacing.two, width: 40, alignItems: "center", justifyContent: "center" },
	roundsRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
	roundsInput: { borderRadius: Spacing.one + 2, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, minWidth: 52, alignItems: "center" },
	segmentRow: { flexDirection: "row" },
	segDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
	segLeft: { flex: 1, alignItems: "center", paddingVertical: Spacing.two, borderTopLeftRadius: Spacing.two, borderBottomLeftRadius: Spacing.two },
	segMid: { flex: 1, alignItems: "center", paddingVertical: Spacing.two },
	segRight: { flex: 1, alignItems: "center", paddingVertical: Spacing.two, borderTopRightRadius: Spacing.two, borderBottomRightRadius: Spacing.two },
	toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
	toggle: { width: 44, height: 26, borderRadius: 13, justifyContent: "center", paddingHorizontal: 3 },
	toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
	toggleThumbOn: { alignSelf: "flex-end" },
	createBtn: { alignSelf: "stretch", alignItems: "center", paddingVertical: Spacing.three, marginTop: Spacing.one },
});
