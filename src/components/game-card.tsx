import { TouchableOpacity, View } from 'react-native';

import { Game } from '@/context/games-context';
import { homeStyles } from '@/styles/home';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

type Props = {
  game: Game;
  onPress: () => void;
  onDelete: () => void;
};

export function GameCard({ game, onPress, onDelete }: Props) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[homeStyles.card, { backgroundColor: theme.backgroundElement }]}
      onPress={onPress}>
      <View style={homeStyles.cardContent}>
        <ThemedText type="default">{game.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {game.players.length} player{game.players.length !== 1 ? 's' : ''} · Round{' '}
          {game.rounds.length}
        </ThemedText>
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={8}>
        <ThemedText type="small" themeColor="textSecondary">
          Delete
        </ThemedText>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
