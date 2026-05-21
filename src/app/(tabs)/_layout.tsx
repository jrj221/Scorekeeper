import * as Haptics from "expo-haptics";
import { Stack, Tabs, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { type BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Pressable, TouchableOpacity } from "react-native";

import { useTheme } from "@/hooks/use-theme";

function HapticTabButton({ onPress, children, style, accessibilityState }: BottomTabBarButtonProps) {
	return (
		<Pressable
			onPress={(e) => {
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
				onPress?.(e);
			}}
			style={style as any}
			accessibilityState={accessibilityState}
		>
			{children}
		</Pressable>
	);
}

export default function TabLayout() {
	const theme = useTheme();
	const router = useRouter();
	return (
		<>
			{/* Hide the root Stack header; title is used as the back button label on child screens */}
			<Stack.Screen options={{ headerShown: false, title: "Home" }} />
			<Tabs
				screenOptions={{
					headerStyle: { backgroundColor: theme.backgroundElement },
					headerTitleStyle: { fontSize: 16, fontWeight: "600" },
					headerTintColor: theme.text,
					headerShadowVisible: false,
					tabBarStyle: {
						backgroundColor: theme.backgroundElement,
						borderTopColor: theme.backgroundSelected,
					},
					tabBarActiveTintColor: theme.accent,
					tabBarInactiveTintColor: theme.textSecondary,
					tabBarButton: HapticTabButton,
					headerRight: () => (
						<TouchableOpacity
							onPress={() => router.push("/settings")}
							hitSlop={8}
							activeOpacity={0.6}
							style={{ paddingRight: 16 }}
						>
							<SymbolView
								name="gearshape"
								size={20}
								tintColor={theme.textSecondary}
								style={{ backgroundColor: "transparent" }}
							/>
						</TouchableOpacity>
					),
				}}
			>
				<Tabs.Screen
					name="index"
					options={{
						title: "Games",
						tabBarIcon: ({ color }) => <SymbolView name="list.bullet" size={22} tintColor={color} />,
					}}
				/>
				<Tabs.Screen
					name="players"
					options={{
						title: "Players",
						tabBarIcon: ({ color }) => <SymbolView name="person.2.fill" size={22} tintColor={color} />,
					}}
				/>
				<Tabs.Screen
					name="templates"
					options={{
						title: "Templates",
						tabBarIcon: ({ color }) => <SymbolView name="doc.text.fill" size={22} tintColor={color} />,
					}}
				/>
			</Tabs>
		</>
	);
}
