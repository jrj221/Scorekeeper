import { FontAwesome5 } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";
import { setPendingIcon } from "@/utils/icon-picker-state";
import { HapticButton } from "@/components/haptic-button";
import { forms } from '@/styles/forms';

type IconEntry = { name: string };

const SECTIONS: { title: string; icons: IconEntry[] }[] = [
	{
		title: "Dice & Board",
		icons: [
			{ name: "dice" },
			{ name: "dice-d6" },
			{ name: "dice-d20" },
			{ name: "chess-board" },
			{ name: "puzzle-piece" },
			{ name: "gamepad" },
		] },
	{
		title: "Chess",
		icons: [
			{ name: "chess-king" },
			{ name: "chess-queen" },
			{ name: "chess-rook" },
			{ name: "chess-bishop" },
			{ name: "chess-knight" },
			{ name: "chess-pawn" },
		] },
	{
		title: "Sports",
		icons: [
			{ name: "football-ball" },
			{ name: "basketball-ball" },
			{ name: "baseball-ball" },
			{ name: "volleyball-ball" },
			{ name: "golf-ball" },
			{ name: "bowling-ball" },
			{ name: "table-tennis" },
		] },
	{
		title: "General",
		icons: [
			{ name: "font" },
			{ name: "trophy" },
			{ name: "medal" },
			{ name: "crown" },
			{ name: "star" },
			{ name: "flag" },
			{ name: "fire" },
			{ name: "fist-raised" },
			{ name: "bolt" },
			{ name: "heart" },
			{ name: "users" },
		] },
];

const COLS = 5;

export default function IconPickerScreen() {
	const theme = useTheme();
	const router = useRouter();

	const handleSelect = (iconName: string | null) => {
		setPendingIcon(iconName);
		router.back();
	};

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "Choose Icon" }} />
			<SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
				<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
					{SECTIONS.map((section) => (
						<View key={section.title} style={forms.section}>
							<ThemedText style={styles.sectionLabel} themeColor="textSecondary">
								{section.title.toUpperCase()}
							</ThemedText>
							<View style={styles.grid}>
								{section.icons.map((icon) => (
									<HapticButton
										key={icon.name}
										style={[styles.cell, { backgroundColor: theme.backgroundElement }]}
										onPress={() => handleSelect(icon.name)}
										activeOpacity={0.6}
									>
										<FontAwesome5 name={icon.name as any} size={28} color={theme.text} />
									</HapticButton>
								))}
							</View>
						</View>
					))}
				</ScrollView>
			</SafeAreaView>
		</ThemedView>
	);
}

const CELL_SIZE = Math.floor((320 - Spacing.three * 2 - Spacing.two * (COLS - 1)) / COLS);

const styles = StyleSheet.create({
	scroll: {
		padding: Spacing.three,
		gap: Spacing.four,
		paddingBottom: Spacing.six },
	removeBtn: {
		borderRadius: Spacing.two,
		borderWidth: StyleSheet.hairlineWidth,
		paddingVertical: Spacing.two,
		alignItems: "center" },
	sectionLabel: {
		fontSize: 11,
		fontWeight: "600",
		letterSpacing: 0.8 },
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.two },
	cell: {
		width: CELL_SIZE,
		height: CELL_SIZE,
		aspectRatio: 1,
		borderRadius: Spacing.two,
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.one },
	cellLabel: {
		fontSize: 10,
		textAlign: "center" } });
