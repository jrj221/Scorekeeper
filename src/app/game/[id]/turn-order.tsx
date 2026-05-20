import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useGamesContext } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";

type Item = { id: string; name: string };

export default function TurnOrderScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { id } = useLocalSearchParams<{ id: string }>();
	const { getGame, updateGame } = useGamesContext();

	const game = getGame(id);
	const playerMap = Object.fromEntries((game?.players ?? []).map((p) => [p.id, p]));

	const initialOrder: Item[] = (
		game ? (game.turnOrder?.length ? game.turnOrder : game.players.map((p) => p.id)) : []
	).map((pid) => ({ id: pid, name: playerMap[pid]?.name ?? pid }));

	const [order, setOrder] = useState<Item[]>(initialOrder);

	const handleSave = useCallback(() => {
		if (!game) return;
		updateGame({ ...game, turnOrder: order.map((item) => item.id) });
		router.back();
	}, [game, order, updateGame, router]);

	if (!game) return null;

	const renderItem = ({ item, drag, isActive }: RenderItemParams<Item>) => (
		<ScaleDecorator activeScale={1.03}>
			<TouchableOpacity
				onLongPress={drag}
				delayLongPress={150}
				activeOpacity={1}
				style={[
					styles.row,
					{
						backgroundColor: isActive ? theme.backgroundSelected : theme.backgroundElement,
						borderBottomColor: theme.backgroundSelected,
					},
				]}
			>
				<ThemedText style={styles.name}>{item.name}</ThemedText>
				<SymbolView name="line.3.horizontal" size={18} tintColor={theme.textSecondary} />
			</TouchableOpacity>
		</ScaleDecorator>
	);

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "Turn Order" }} />
			<GestureHandlerRootView style={{ flex: 1 }}>
				<SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
					<ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
						Hold to drag and drop to reorder players.
					</ThemedText>

					<DraggableFlatList
						data={order}
						keyExtractor={(item) => item.id}
						onDragEnd={({ data }) => setOrder(data)}
						renderItem={renderItem}
						containerStyle={{ flex: 1 }}
						contentContainerStyle={styles.listContent}
					/>

					<View style={styles.footer}>
						<TouchableOpacity
							style={[shared.button, styles.saveBtn, { backgroundColor: "#0077B6" }]}
							onPress={handleSave}
						>
							<ThemedText type="smallBold" style={{ color: "#fff" }}>
								Save Order
							</ThemedText>
						</TouchableOpacity>
					</View>
					<SafeAreaView edges={["bottom"]} />
				</SafeAreaView>
			</GestureHandlerRootView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	hint: {
		fontSize: 13,
		lineHeight: 18,
		paddingHorizontal: Spacing.three,
		paddingTop: Spacing.two,
		paddingBottom: Spacing.two,
	},
	listContent: {
		paddingHorizontal: Spacing.three,
		gap: Spacing.two,
		paddingBottom: Spacing.three,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.three,
		gap: Spacing.two,
	},
	name: {
		flex: 1,
		fontSize: 16,
	},
	footer: {
		paddingHorizontal: Spacing.three,
		paddingBottom: Spacing.two,
	},
	saveBtn: {
		alignSelf: "stretch",
		alignItems: "center",
		paddingVertical: Spacing.three,
	},
});
