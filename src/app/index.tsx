import { Stack } from "expo-router";
import { Alert, SectionList, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GameCard } from "@/components/game-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Game } from "@/context/games-context";
import { Spacing } from "@/constants/theme";
import { useGames } from "@/hooks/use-games";
import { useTheme } from "@/hooks/use-theme";
import { homeStyles } from "@/styles/home";
import { shared } from "@/styles/shared";

export default function HomeScreen() {
	const { games, openNewGame, handleOpen, deleteGame } = useGames();
	const theme = useTheme();

	const confirmDelete = (game: Game) => {
		Alert.alert(
			"Delete Game",
			`Delete "${game.name}"? This can't be undone.`,
			[
				{ text: "Cancel", style: "cancel" },
				{ text: "Delete", style: "destructive", onPress: () => deleteGame(game.id) },
			],
		);
	};

	const active = games.filter((g) => !g.finishedAt);
	const finished = games
		.filter((g) => !!g.finishedAt)
		.sort((a, b) => b.finishedAt! - a.finishedAt!);

	const sections = [
		...(active.length > 0 ? [{ title: "In Progress", data: active }] : []),
		...(finished.length > 0 ? [{ title: "Finished", data: finished }] : []),
	];

	const isEmpty = games.length === 0;

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "Scorekeeper" }} />
			<SafeAreaView style={shared.safeArea}>
				{isEmpty ? (
					<ThemedView style={homeStyles.emptyState}>
						<ThemedText type="subtitle">No games yet</ThemedText>
						<ThemedText type="small" themeColor="textSecondary">
							Tap + to start a new game
						</ThemedText>
					</ThemedView>
				) : (
					<SectionList
						sections={sections}
						keyExtractor={(g) => g.id}
						contentContainerStyle={homeStyles.list}
						stickySectionHeadersEnabled={false}
						renderSectionHeader={({ section: { title } }) => (
							<View style={styles.sectionHeader}>
								<ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
									{title.toUpperCase()}
								</ThemedText>
							</View>
						)}
						renderItem={({ item }) => (
							<GameCard
								game={item}
								onPress={() => handleOpen(item.id)}
								onDelete={() => confirmDelete(item)}
							/>
						)}
						SectionSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
					/>
				)}

				<TouchableOpacity
					style={[homeStyles.fab, { backgroundColor: "#0077B6" }]}
					onPress={openNewGame}>
					<ThemedText type="subtitle" style={{ color: "#fff", lineHeight: 32 }}>
						+
					</ThemedText>
				</TouchableOpacity>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	sectionHeader: {
		paddingTop: Spacing.two,
		paddingBottom: Spacing.one,
	},
	sectionTitle: {
		fontSize: 11,
		fontWeight: "600",
		letterSpacing: 0.8,
	},
});
