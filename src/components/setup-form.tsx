import { FontAwesome5 } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { HapticButton } from "@/components/haptic-button";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { forms } from "@/styles/forms";

/** Uppercase group label shown above a group of cards. */
export function SectionHeader({ label, trailing }: { label: string; trailing?: ReactNode }) {
	return (
		<View style={forms.sectionHeader}>
			<ThemedText style={forms.label} themeColor="textSecondary">
				{label}
			</ThemedText>
			{trailing}
		</View>
	);
}

/** Rounded card matching the setup-form aesthetic. */
export function SetupCard({
	children,
	error = false,
}: {
	children: ReactNode;
	error?: boolean;
}) {
	const theme = useTheme();
	return (
		<View
			style={[
				forms.card,
				{
					backgroundColor: theme.backgroundElement,
					borderColor: error ? theme.danger : theme.backgroundSelected,
					borderWidth: error ? 1.5 : StyleSheet.hairlineWidth,
				},
			]}
		>
			{children}
		</View>
	);
}

/**
 * A single option card: coloured icon tile + title/subtitle + toggle, with an
 * optional revealed area (pills, person picker) shown beneath when `value` is on.
 */
export function OptionCard({
	icon,
	title,
	subtitle,
	value,
	onToggle,
	children,
}: {
	icon: string;
	title: string;
	subtitle: string;
	value: boolean;
	onToggle: () => void;
	children?: ReactNode;
}) {
	const theme = useTheme();
	return (
		<SetupCard>
			<HapticButton style={forms.optionRow} onPress={onToggle} activeOpacity={0.7}>
				<View style={[forms.iconTile, { backgroundColor: theme.backgroundSelected }]}>
					<FontAwesome5 name={icon as any} size={16} color={theme.accent} solid />
				</View>
				<View style={forms.optionTextWrap}>
					<ThemedText style={forms.optionTitle}>{title}</ThemedText>
					<ThemedText type="small" themeColor="textSecondary">
						{subtitle}
					</ThemedText>
				</View>
				<View
					style={[
						forms.toggle,
						{ backgroundColor: value ? theme.accent : theme.backgroundSelected },
					]}
				>
					<View style={[forms.toggleThumb, value && forms.toggleThumbOn]} />
				</View>
			</HapticButton>
			{value && children ? (
				<View style={[forms.pillsWrap, { borderTopColor: theme.background }]}>{children}</View>
			) : null}
		</SetupCard>
	);
}

export type PillOption<T extends string> = { key: T; label: string; icon: string };

/** Row of segmented "pill" buttons, each with an icon. */
export function Pills<T extends string>({
	options,
	value,
	onChange,
}: {
	options: PillOption<T>[];
	value: T;
	onChange: (v: T) => void;
}) {
	const theme = useTheme();
	return (
		<View style={forms.pillRow}>
			{options.map((opt) => {
				const active = opt.key === value;
				return (
					<HapticButton
						key={opt.key}
						style={[
							forms.pill,
							{
								backgroundColor: active ? theme.accent : theme.backgroundSelected,
								borderColor: active ? theme.accent : theme.background,
							},
						]}
						onPress={() => onChange(opt.key)}
					>
						<FontAwesome5
							name={opt.icon as any}
							size={12}
							color={active ? theme.accentText : theme.textSecondary}
							solid
						/>
						<ThemedText type="small" style={{ color: active ? theme.accentText : theme.text }}>
							{opt.label}
						</ThemedText>
					</HapticButton>
				);
			})}
		</View>
	);
}

/** Full-width player row: leading person icon, name, trailing remove button. */
export function PlayerRow({ name, onRemove }: { name: string; onRemove: () => void }) {
	const theme = useTheme();
	return (
		<View style={[forms.playerRow, { backgroundColor: theme.backgroundSelected }]}>
			<FontAwesome5 name="user" size={14} color={theme.textSecondary} solid />
			<ThemedText type="default" style={{ flex: 1 }} numberOfLines={1}>
				{name}
			</ThemedText>
			<HapticButton
				onPress={onRemove}
				hitSlop={8}
				style={[forms.removeBtn, { backgroundColor: theme.danger + "22" }]}
			>
				<FontAwesome5 name="times" size={12} color={theme.danger} solid />
			</HapticButton>
		</View>
	);
}

/**
 * Dropdown trigger + list for choosing a single player (fixed/rotating dealer,
 * rotation starting player). Open state is owned by the parent.
 */
export function PersonPicker({
	players,
	selectedId,
	open,
	onToggleOpen,
	onSelect,
	placeholder = "Pick Player",
}: {
	players: { id: string; name: string }[];
	selectedId: string | null;
	open: boolean;
	onToggleOpen: () => void;
	onSelect: (id: string) => void;
	placeholder?: string;
}) {
	const theme = useTheme();
	const selectedName = players.find((p) => p.id === selectedId)?.name;
	return (
		<View style={{ gap: forms.pillsWrap.gap }}>
			<HapticButton
				style={[
					forms.dropdownTrigger,
					{ backgroundColor: theme.backgroundSelected },
					open && forms.dropdownTriggerActive,
				]}
				onPress={onToggleOpen}
			>
				<ThemedText type="small" style={{ color: theme.accent, flex: 1 }}>
					{selectedName ?? placeholder}
				</ThemedText>
				<ThemedText style={[forms.chevron, { color: theme.accent }]}>
					{open ? "▴" : "▾"}
				</ThemedText>
			</HapticButton>
			{open && (
				<View
					style={[
						forms.dropdown,
						{ backgroundColor: theme.backgroundSelected, borderColor: theme.background },
					]}
				>
					{players.length === 0 ? (
						<ThemedText type="small" themeColor="textSecondary" style={forms.dropdownEmpty}>
							Add players first
						</ThemedText>
					) : (
						players.map((p, i) => (
							<HapticButton
								key={p.id}
								style={[
									forms.dropdownRow,
									{ borderBottomColor: theme.background },
									i === players.length - 1 && { borderBottomWidth: 0 },
								]}
								onPress={() => onSelect(p.id)}
							>
								<ThemedText type="default">{p.name}</ThemedText>
								{selectedId === p.id && (
									<ThemedText type="small" style={{ color: theme.accent }}>
										✓
									</ThemedText>
								)}
							</HapticButton>
						))
					)}
				</View>
			)}
		</View>
	);
}

/** Split "Add player | Add group" row used beneath the player list. */
export function AddPlayerGroupRow({
	playerOpen,
	groupOpen,
	showGroup,
	onTogglePlayer,
	onToggleGroup,
}: {
	playerOpen: boolean;
	groupOpen: boolean;
	showGroup: boolean;
	onTogglePlayer: () => void;
	onToggleGroup: () => void;
}) {
	const theme = useTheme();
	return (
		<View style={[forms.splitRow, { backgroundColor: theme.backgroundSelected }]}>
			<HapticButton
				style={[forms.splitBtn, playerOpen && { backgroundColor: theme.background }]}
				onPress={onTogglePlayer}
			>
				<FontAwesome5 name="plus" size={13} color={theme.accent} solid />
				<ThemedText type="small" style={{ color: theme.accent }}>
					Add Player
				</ThemedText>
			</HapticButton>
			{showGroup && (
				<>
					<View style={[forms.splitDivider, { backgroundColor: theme.background }]} />
					<HapticButton
						style={[forms.splitBtn, groupOpen && { backgroundColor: theme.background }]}
						onPress={onToggleGroup}
					>
						<FontAwesome5 name="users" size={13} color={theme.accent} solid />
						<ThemedText type="small" style={{ color: theme.accent }}>
							Add Group
						</ThemedText>
					</HapticButton>
				</>
			)}
		</View>
	);
}

/** Pill option sets reused across screens. */
export const DEALER_PILLS: PillOption<"rotation" | "random" | "fixed">[] = [
	{ key: "random", label: "Random", icon: "random" },
	{ key: "rotation", label: "Rotating", icon: "sync-alt" },
	{ key: "fixed", label: "Fixed", icon: "user" },
];

export const DEALER_PILLS_NO_FIXED: PillOption<"rotation" | "random">[] = [
	{ key: "random", label: "Random", icon: "random" },
	{ key: "rotation", label: "Rotating", icon: "sync-alt" },
];
