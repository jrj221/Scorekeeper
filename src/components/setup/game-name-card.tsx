import { FontAwesome5 } from "@expo/vector-icons";
import { TextInput, View } from "react-native";

import { HapticButton } from "@/components/haptic-button";
import { SetupCard } from "@/components/setup-form";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { forms } from "@/styles/forms";
import { shared } from "@/styles/shared";

/**
 * Icon button + name input card shown at the top of every setup form (new-game,
 * game info, templates). Controlled: values + callbacks in, no local state.
 *
 * - `nameEditable=false` renders the name as plain text (used for finished games).
 * - `iconEditable=false` renders the icon as a static (non-pressable) tile.
 * - `showIcon=false` hides the icon entirely (finished games in info.tsx never show it).
 */
export function GameNameCard({
	label = "GAME NAME",
	optional = true,
	icon,
	showIcon = true,
	iconEditable = true,
	iconSize = 20,
	onPressIcon,
	name,
	nameEditable = true,
	onChangeName,
	placeholder = "Untitled Game",
	maxLength = 30,
	returnKeyType = "next",
}: {
	label?: string;
	optional?: boolean;
	icon: string | null | undefined;
	showIcon?: boolean;
	iconEditable?: boolean;
	iconSize?: number;
	onPressIcon?: () => void;
	name: string;
	nameEditable?: boolean;
	onChangeName?: (v: string) => void;
	placeholder?: string;
	maxLength?: number;
	returnKeyType?: "next" | "done";
}) {
	const theme = useTheme();
	const innerInput = { backgroundColor: theme.background, color: theme.text } as const;

	if (!showIcon && !nameEditable) {
		return (
			<SetupCard>
				<View style={forms.labelRow}>
					<ThemedText style={forms.label} themeColor="textSecondary">
						{label}
					</ThemedText>
					{optional && (
						<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary">
							{" "}
							(OPTIONAL)
						</ThemedText>
					)}
				</View>
				<ThemedText type="default">{name || placeholder}</ThemedText>
			</SetupCard>
		);
	}

	return (
		<SetupCard>
			<View style={forms.labelRow}>
				<ThemedText style={forms.label} themeColor="textSecondary">
					{label}
				</ThemedText>
				{optional && (
					<ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary">
						{" "}
						(OPTIONAL)
					</ThemedText>
				)}
			</View>
			<View style={forms.nameRow}>
				{showIcon &&
					(iconEditable ? (
						<HapticButton
							style={[forms.iconBtn, { backgroundColor: theme.background }]}
							onPress={onPressIcon}
							activeOpacity={0.7}
						>
							<FontAwesome5 name={(icon ?? "users") as any} size={iconSize} color={theme.textSecondary} />
						</HapticButton>
					) : (
						<View style={[forms.iconBtn, { backgroundColor: theme.background }]}>
							<FontAwesome5 name={(icon ?? "users") as any} size={iconSize} color={theme.textSecondary} />
						</View>
					))}
				{nameEditable ? (
					<TextInput
						allowFontScaling={false}
						style={[shared.input, innerInput, { flex: 1 }]}
						placeholder={placeholder}
						placeholderTextColor={theme.textSecondary}
						value={name}
						onChangeText={onChangeName}
						maxLength={maxLength}
						returnKeyType={returnKeyType}
					/>
				) : (
					<View style={[shared.input, innerInput, { flex: 1, justifyContent: "center" }]}>
						<ThemedText type="default">{name}</ThemedText>
					</View>
				)}
			</View>
		</SetupCard>
	);
}
