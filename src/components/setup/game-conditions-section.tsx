import { View } from "react-native";

import { HapticButton } from "@/components/haptic-button";
import { SectionHeader, SetupCard } from "@/components/setup-form";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { forms } from "@/styles/forms";

/**
 * "GAME CONDITIONS" group: rounds (numpad + endless toggle) and winner segmented
 * control. Either card can be individually hidden (locked fields) or rendered
 * read-only (finished games). Controlled — values + callbacks in.
 */
export function GameConditionsSection({
	showRounds = true,
	showWinner = true,
	finished = false,
	totalRounds,
	onPressRounds,
	onToggleIndefinite,
	rankByLowest,
	onChangeRankByLowest,
}: {
	showRounds?: boolean;
	showWinner?: boolean;
	finished?: boolean;
	/** `undefined` means indefinite/endless. */
	totalRounds: number | undefined;
	onPressRounds: () => void;
	onToggleIndefinite: () => void;
	rankByLowest: boolean;
	onChangeRankByLowest: (v: boolean) => void;
}) {
	const theme = useTheme();
	const isIndefinite = totalRounds === undefined;

	if (!showRounds && !showWinner) return null;

	return (
		<View style={{ gap: Spacing.two }}>
			<SectionHeader label="GAME CONDITIONS" />

			{showRounds && (
				<SetupCard>
					<ThemedText style={forms.label} themeColor="textSecondary">
						ROUNDS
					</ThemedText>
					{finished ? (
						<ThemedText type="default">{totalRounds !== undefined ? `${totalRounds} rounds` : "Indefinite"}</ThemedText>
					) : (
						<>
							{!isIndefinite && (
								<View style={forms.roundsRow}>
									<HapticButton
										style={[forms.roundsInput, { backgroundColor: theme.backgroundSelected }]}
										onPress={onPressRounds}
									>
										<ThemedText style={{ color: theme.text, fontSize: 16, textAlign: "center" }}>
											{totalRounds ?? "—"}
										</ThemedText>
									</HapticButton>
									<ThemedText type="default">rounds</ThemedText>
								</View>
							)}
							<HapticButton
								style={[forms.toggleRow, { backgroundColor: theme.backgroundSelected }]}
								onPress={onToggleIndefinite}
							>
								<ThemedText type="default">Endless Mode</ThemedText>
								<View
									style={[
										forms.toggle,
										{ backgroundColor: isIndefinite ? theme.accent : theme.backgroundElement },
									]}
								>
									<View style={[forms.toggleThumb, isIndefinite && forms.toggleThumbOn]} />
								</View>
							</HapticButton>
						</>
					)}
				</SetupCard>
			)}

			{showWinner && (
				<SetupCard>
					<ThemedText style={forms.label} themeColor="textSecondary">
						WINNER
					</ThemedText>
					{finished ? (
						<ThemedText type="default">{rankByLowest ? "Lowest score wins" : "Highest score wins"}</ThemedText>
					) : (
						<View style={forms.segmentRow}>
							<HapticButton
								style={[
									forms.segLeft,
									{ backgroundColor: !rankByLowest ? theme.accent : theme.backgroundSelected },
								]}
								onPress={() => onChangeRankByLowest(false)}
							>
								<ThemedText type="small" style={{ color: !rankByLowest ? theme.accentText : theme.text }}>
									Highest score
								</ThemedText>
							</HapticButton>
							<View style={[forms.segDivider, { backgroundColor: theme.background }]} />
							<HapticButton
								style={[
									forms.segRight,
									{ backgroundColor: rankByLowest ? theme.accent : theme.backgroundSelected },
								]}
								onPress={() => onChangeRankByLowest(true)}
							>
								<ThemedText type="small" style={{ color: rankByLowest ? theme.accentText : theme.text }}>
									Lowest score
								</ThemedText>
							</HapticButton>
						</View>
					)}
				</SetupCard>
			)}
		</View>
	);
}
