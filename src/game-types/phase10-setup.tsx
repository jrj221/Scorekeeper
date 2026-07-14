import { StyleSheet, View } from 'react-native';

import { PillOption, Pills, SectionHeader, SetupCard } from '@/components/setup-form';
import { ThemedText } from '@/components/themed-text';
import { getVisiblePhases } from '@/constants/classic-games';
import { Spacing } from '@/constants/theme';
import type { Game } from '@/context/games-context';
import { forms } from '@/styles/forms';

import { SetupSectionsCtx, SetupSectionsState } from './types';

const PHASE_SUBSET_PILLS: PillOption<'all' | 'odd' | 'even'>[] = [
  { key: 'all', label: 'All 10 Phases' },
  { key: 'odd', label: 'Odd Phases' },
  { key: 'even', label: 'Even Phases' },
];

const phaseStyles = StyleSheet.create({
  phaseRow: { flexDirection: 'row', gap: Spacing.two },
});

/** Phase 10's creation-flow extra UI: "how many phases" pills + rules card. */
export function renderPhase10SetupSections(state: SetupSectionsState, ctx: SetupSectionsCtx) {
  return (
    <View style={{ gap: Spacing.two }}>
      <SectionHeader label="PHASES" />
      <SetupCard>
        <ThemedText style={forms.label} themeColor="textSecondary">
          HOW MANY PHASES
        </ThemedText>
        <Pills options={PHASE_SUBSET_PILLS} value={state.phaseSubsetChoice} onChange={ctx.onChangePhaseSubset} />
        <ThemedText style={forms.hint}>
          {state.phaseSubsetChoice === 'all'
            ? 'Play all 10 phases.'
            : `Play a shorter game with just the ${state.phaseSubsetChoice} phases.`}
        </ThemedText>
      </SetupCard>
      <SetupCard>
        <ThemedText style={forms.label} themeColor="textSecondary">
          RULES
        </ThemedText>
        {getVisiblePhases(state.phaseSubsetChoice === 'all' ? undefined : state.phaseSubsetChoice).map(p => (
          <View key={p.number} style={phaseStyles.phaseRow}>
            <ThemedText type="smallBold" style={{ width: 30 }}>
              {p.number}.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
              {p.description}
            </ThemedText>
          </View>
        ))}
      </SetupCard>
    </View>
  );
}

/** Phase 10's read-only equivalent of `renderPhase10SetupSections`, for the info screen. */
export function renderPhase10InfoSections(game: Game) {
  return (
    <View style={{ gap: Spacing.two }}>
      <SectionHeader label="PHASES" />
      <SetupCard>
        <ThemedText style={forms.label} themeColor="textSecondary">
          {game.phaseSubset ? `${game.phaseSubset === 'odd' ? 'Odd' : 'Even'} phases only` : 'All 10 phases'}
        </ThemedText>
        <ThemedText style={[forms.label, { marginTop: Spacing.one }]} themeColor="textSecondary">
          RULES
        </ThemedText>
        {getVisiblePhases(game.phaseSubset).map(p => (
          <View key={p.number} style={phaseStyles.phaseRow}>
            <ThemedText type="smallBold" style={{ width: 30 }}>
              {p.number}.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
              {p.description}
            </ThemedText>
          </View>
        ))}
      </SetupCard>
    </View>
  );
}
