import { OptionCard, PersonPicker, PillOption, Pills, SetupCard } from "@/components/setup-form";
import { ThemedText } from "@/components/themed-text";
import { DealerMode } from "@/context/games-context";
import { forms } from "@/styles/forms";

import { firstPlayerPills, FirstPlayerMode } from "./helpers";

type PersonLike = { id: string; name: string };

/** Dealer option card, with the "Fixed"/"Random"/"Rotating" pills and person picker. */
export function DealerOptionCard({
	finished = false,
	enabled,
	onToggleEnabled,
	mode,
	onChangeMode,
	pillOptions,
	players,
	fixedDealerId,
	onSelectFixedDealer,
	dropdownOpen,
	onToggleDropdown,
	hint,
	showPersonPicker = true,
}: {
	finished?: boolean;
	enabled: boolean;
	onToggleEnabled: () => void;
	mode: DealerMode;
	onChangeMode: (m: DealerMode) => void;
	pillOptions: PillOption<DealerMode>[];
	players: PersonLike[];
	fixedDealerId?: string | null;
	onSelectFixedDealer?: (id: string) => void;
	dropdownOpen?: boolean;
	onToggleDropdown?: () => void;
	hint?: string | null;
	showPersonPicker?: boolean;
}) {
	if (finished) {
		const text = !enabled
			? "Disabled"
			: mode === "fixed"
				? `Fixed: ${players.find((p) => p.id === fixedDealerId)?.name ?? "Not set"}`
				: mode === "rotation"
					? "Rotation"
					: "Random each round";
		return (
			<SetupCard>
				<ThemedText style={forms.label} themeColor="textSecondary">
					DEALER
				</ThemedText>
				<ThemedText type="default">{text}</ThemedText>
			</SetupCard>
		);
	}

	return (
		<OptionCard
			icon="crown"
			title="Dealer"
			subtitle="Track who deals each round"
			value={enabled}
			onToggle={onToggleEnabled}
		>
			<Pills options={pillOptions} value={mode} onChange={onChangeMode} />
			{showPersonPicker && (mode === "fixed" || mode === "rotation") && onSelectFixedDealer && (
				<PersonPicker
					players={players}
					selectedId={fixedDealerId ?? null}
					open={!!dropdownOpen}
					onToggleOpen={() => onToggleDropdown?.()}
					onSelect={onSelectFixedDealer}
					placeholder="Pick Dealer"
				/>
			)}
			{hint && <ThemedText style={forms.hint}>{hint}</ThemedText>}
		</OptionCard>
	);
}

/** "Goes first" option card, with the shared `firstPlayerPills` derivation. */
export function FirstPlayerOptionCard({
	finished = false,
	enabled,
	onToggleEnabled,
	mode,
	onChangeMode,
	dealerEnabled,
	players,
	selectedPlayerId,
	onSelectPlayer,
	dropdownOpen,
	onToggleDropdown,
	hint,
	showPersonPicker = true,
}: {
	finished?: boolean;
	enabled: boolean;
	onToggleEnabled: () => void;
	mode: FirstPlayerMode;
	onChangeMode: (m: FirstPlayerMode) => void;
	dealerEnabled: boolean;
	players: PersonLike[];
	selectedPlayerId?: string | null;
	onSelectPlayer?: (id: string) => void;
	dropdownOpen?: boolean;
	onToggleDropdown?: () => void;
	hint?: string | null;
	showPersonPicker?: boolean;
}) {
	if (finished) {
		const text = !enabled
			? "Disabled"
			: mode === "left-of-dealer"
				? "Left of dealer"
				: selectedPlayerId
					? `${players.find((p) => p.id === selectedPlayerId)?.name ?? "–"} goes first`
					: "Random order";
		return (
			<SetupCard>
				<ThemedText style={forms.label} themeColor="textSecondary">
					GOES FIRST
				</ThemedText>
				<ThemedText type="default">{text}</ThemedText>
			</SetupCard>
		);
	}

	return (
		<OptionCard
			icon="long-arrow-alt-right"
			title="Goes first"
			subtitle="Track who starts each round"
			value={enabled}
			onToggle={onToggleEnabled}
		>
			<Pills options={firstPlayerPills(dealerEnabled)} value={mode} onChange={onChangeMode} />
			{showPersonPicker && mode === "rotation" && onSelectPlayer && (
				<PersonPicker
					players={players}
					selectedId={selectedPlayerId ?? null}
					open={!!dropdownOpen}
					onToggleOpen={() => onToggleDropdown?.()}
					onSelect={onSelectPlayer}
					placeholder="Pick Player"
				/>
			)}
			{hint && <ThemedText style={forms.hint}>{hint}</ThemedText>}
		</OptionCard>
	);
}

/** Dice + timer "extras" option cards. Either can be hidden (locked fields). */
export function ExtrasOptionCards({
	hideDice = false,
	hideTimer = false,
	dice,
	onToggleDice,
	timer,
	onToggleTimer,
}: {
	hideDice?: boolean;
	hideTimer?: boolean;
	dice: boolean;
	onToggleDice: () => void;
	timer: boolean;
	onToggleTimer: () => void;
}) {
	return (
		<>
			{!hideDice && (
				<OptionCard
					icon="dice"
					title="Dice"
					subtitle="Show dice roller in game"
					value={dice}
					onToggle={onToggleDice}
				/>
			)}
			{!hideTimer && (
				<OptionCard
					icon="stopwatch"
					title="Timer"
					subtitle="Show timer in game"
					value={timer}
					onToggle={onToggleTimer}
				/>
			)}
		</>
	);
}
