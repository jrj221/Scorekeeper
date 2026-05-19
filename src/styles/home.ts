import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const homeStyles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  cardContent: {
    flex: 1,
    gap: Spacing.half,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.four,
    right: Spacing.three,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
