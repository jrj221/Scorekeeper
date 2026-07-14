import { PillOption } from '@/components/setup-form';

export type FirstPlayerMode = 'random' | 'left-of-dealer' | 'rotation';

/**
 * Pill options for the "goes first" mode. When a dealer is enabled, "Left of Dealer"
 * becomes available as a first option. Single source of truth — was pasted separately
 * in new-game.tsx, info.tsx, new-template.tsx, and template/[id].tsx.
 */
export function firstPlayerPills(dealerEnabled: boolean): PillOption<FirstPlayerMode>[] {
  return dealerEnabled
    ? [
        { key: 'left-of-dealer', label: 'Left of Dealer', icon: '' },
        { key: 'rotation', label: 'Rotating', icon: 'sync-alt' },
        { key: 'random', label: 'Random', icon: 'random' },
      ]
    : [
        { key: 'rotation', label: 'Rotating', icon: 'sync-alt' },
        { key: 'random', label: 'Random', icon: 'random' },
      ];
}
