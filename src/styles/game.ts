import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const gameStyles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerChip: {
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  playerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  // Scoreboard table
  tableWrapper: {
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
  },
  headerRow: {
    borderBottomWidth: 1,
  },
  totalsRow: {
    borderTopWidth: 1,
  },
  roundCell: {
    width: 60,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    textAlign: 'center',
  },
  playerCell: {
    width: 80,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    textAlign: 'center',
  },
  // Round entry modal
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  scorePlayerName: {
    width: 140,
  },
  scoreInput: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    textAlign: 'right',
  },
});
