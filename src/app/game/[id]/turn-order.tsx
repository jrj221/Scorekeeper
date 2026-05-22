import { useNavigation } from "@react-navigation/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";

import { HapticButton } from "@/components/haptic-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useGamesContext } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { forms } from "@/styles/forms";
import { shared } from "@/styles/shared";

type Item = { id: string; name: string };

type RowProps = {
	item: Item;
	drag: () => void;
	isActive: boolean;
};

function Row({ item, drag, isActive }: RowProps) {
	const theme = useTheme();
	const highlightAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.timing(highlightAnim, {
			toValue: isActive ? 1 : 0,
			duration: 150,
			useNativeDriver: false,
		}).start();
	}, [isActive, highlightAnim]);

	const backgroundColor = highlightAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [theme.backgroundElement, theme.backgroundSelected],
	});

	return (
		<HapticButton
			onLongPress={drag}
			delayLongPress={150}
			activeOpacity={1}
			style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}
		>
			<Animated.View style={[StyleSheet.absoluteFill, { backgroundColor, borderRadius: Spacing.two }]} />
			<ThemedText style={styles.name}>{item.name}</ThemedText>
			{/* Pressing the handle starts drag immediately; long-pressing anywhere else also works */}
			<Pressable onPressIn={drag} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
				<SymbolView name="line.3.horizontal" size={18} tintColor={theme.textSecondary} />
			</Pressable>
		</HapticButton>
	);
}

const FOOTER_FADE_MS = 180;

export default function TurnOrderScreen() {
	const theme = useTheme();
	const router = useRouter();
	const navigation = useNavigation();
	const { id } = useLocalSearchParams<{ id: string }>();
	const { getGame, updateGame } = useGamesContext();

	const game = getGame(id);
	const playerMap = Object.fromEntries((game?.players ?? []).map((p) => [p.id, p]));

	const initialOrder: Item[] = (
		game ? (game.turnOrder?.length ? game.turnOrder : game.players.map((p) => p.id)) : []
	).map((pid) => ({ id: pid, name: playerMap[pid]?.name ?? pid }));

	const [order, setOrder] = useState<Item[]>(initialOrder);
	const [footerVisible, setFooterVisible] = useState(false);
	const footerOpacity = useRef(new Animated.Value(0)).current;

	const isDirty = JSON.stringify(order.map((i) => i.id)) !== JSON.stringify(initialOrder.map((i) => i.id));

	useEffect(() => {
		if (isDirty) {
			setFooterVisible(true);
			Animated.timing(footerOpacity, { toValue: 1, duration: FOOTER_FADE_MS, useNativeDriver: true }).start();
		} else {
			Animated.timing(footerOpacity, { toValue: 0, duration: FOOTER_FADE_MS, useNativeDriver: true }).start(
				() => setFooterVisible(false)
			);
		}
	}, [isDirty, footerOpacity]);

	// Pulse animation for footer when user tries to back with unsaved changes
	const pulseAnim = useRef(new Animated.Value(0)).current;
	const bypassRef = useRef(false);

	const triggerPulse = useCallback(() => {
		Animated.sequence([
			Animated.timing(pulseAnim, { toValue: 1, duration: 120, useNativeDriver: false }),
			Animated.timing(pulseAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
			Animated.timing(pulseAnim, { toValue: 1, duration: 120, useNativeDriver: false }),
			Animated.timing(pulseAnim, { toValue: 0, duration: 350, useNativeDriver: false }),
		]).start();
	}, [pulseAnim]);

	// Intercept back navigation when there are unsaved changes
	useEffect(() => {
		const unsubscribe = navigation.addListener("beforeRemove", (e) => {
			if (!isDirty || bypassRef.current) return;
			e.preventDefault();
			triggerPulse();
		});
		return unsubscribe;
	}, [navigation, isDirty, triggerPulse]);

	const handleSave = useCallback(() => {
		if (!game) return;
		bypassRef.current = true;
		updateGame({ ...game, turnOrder: order.map((item) => item.id) });
		router.back();
	}, [game, order, updateGame, router]);

	const handleRevert = useCallback(() => {
		bypassRef.current = true;
		router.back();
	}, [router]);

	if (!game) return null;

	const footerBorderColor = pulseAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["transparent", theme.accent],
	});

	const renderItem = ({ item, drag, isActive }: RenderItemParams<Item>) => (
		<ScaleDecorator activeScale={1.03}>
			<Row item={item} drag={drag} isActive={isActive} />
		</ScaleDecorator>
	);

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "Turn Order", gestureEnabled: !isDirty }} />
			<SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
				<ThemedText
					style={[
						forms.hint,
						{
							color: theme.textSecondary,
							paddingHorizontal: Spacing.three,
							paddingVertical: Spacing.two,
						},
					]}
				>
					Hold to drag and drop to reorder players.
				</ThemedText>

				<DraggableFlatList
					data={order}
					keyExtractor={(item) => item.id}
					onDragEnd={({ data }) => setOrder(data)}
					renderItem={renderItem}
					containerStyle={{ flex: 1 }}
					contentContainerStyle={styles.listContent}
					activationDistance={10}
				/>

				{footerVisible && (
					<Animated.View
						style={[
							styles.footer,
							{
								borderWidth: 2,
								borderColor: footerBorderColor,
								borderRadius: Spacing.two,
								margin: Spacing.three,
								opacity: footerOpacity,
							},
						]}
					>
						<HapticButton
							style={[styles.revertBtn, { backgroundColor: theme.backgroundElement }]}
							onPress={handleRevert}
						>
							<ThemedText type="small" themeColor="textSecondary">
								Revert
							</ThemedText>
						</HapticButton>
						<HapticButton style={[styles.saveBtn, { backgroundColor: theme.accent }]} onPress={handleSave}>
							<ThemedText type="smallBold" style={{ color: theme.accentText }}>
								Save Order
							</ThemedText>
						</HapticButton>
					</Animated.View>
				)}
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	listContent: {
		paddingHorizontal: Spacing.three,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.three,
		gap: Spacing.two,
		marginBottom: Spacing.two,
		overflow: "hidden",
	},
	name: { flex: 1, fontSize: 16 },
	footer: {
		flexDirection: "row",
		gap: Spacing.two,
		paddingVertical: Spacing.two,
		paddingHorizontal: Spacing.two,
	},
	revertBtn: {
		flex: 1,
		alignItems: "center",
		paddingVertical: Spacing.two + 2,
		borderRadius: Spacing.two,
	},
	saveBtn: {
		flex: 2,
		alignItems: "center",
		paddingVertical: Spacing.two + 2,
		borderRadius: Spacing.two,
	},
});
