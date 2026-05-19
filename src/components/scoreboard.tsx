import { ScrollView, View } from 'react-native';

import { Game } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { gameStyles } from '@/styles/game';
import { ThemedText } from './themed-text';

type Props = {
  game: Game;
  totals: Record<string, number>;
};

export function Scoreboard({ game, totals }: Props) {
  const theme = useTheme();

  if (game.rounds.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        No rounds yet — add one below
      </ThemedText>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[gameStyles.tableWrapper, { backgroundColor: theme.backgroundElement }]}>
        <View style={[gameStyles.tableRow, gameStyles.headerRow, { borderColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold" style={gameStyles.roundCell}>
            Rnd
          </ThemedText>
          {game.players.map(p => (
            <ThemedText key={p.id} type="smallBold" style={gameStyles.playerCell} numberOfLines={1}>
              {p.name}
            </ThemedText>
          ))}
        </View>

        {game.rounds.map((round, i) => (
          <View key={i} style={gameStyles.tableRow}>
            <ThemedText type="small" style={[gameStyles.roundCell, { color: theme.textSecondary }]}>
              {i + 1}
            </ThemedText>
            {game.players.map(p => (
              <ThemedText key={p.id} type="small" style={gameStyles.playerCell}>
                {round[p.id] ?? 0}
              </ThemedText>
            ))}
          </View>
        ))}

        <View style={[gameStyles.tableRow, gameStyles.totalsRow, { borderColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold" style={gameStyles.roundCell}>
            Total
          </ThemedText>
          {game.players.map(p => (
            <ThemedText key={p.id} type="smallBold" style={gameStyles.playerCell}>
              {totals[p.id] ?? 0}
            </ThemedText>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
