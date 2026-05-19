import { KeyboardAvoidingView, Modal, Platform, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';

import { Player } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { gameStyles } from '@/styles/game';
import { shared } from '@/styles/shared';
import { ThemedText } from './themed-text';

type Props = {
  visible: boolean;
  players: Player[];
  scores: Record<string, string>;
  onChangeScore: (playerId: string, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  roundNumber: number;
};

export function RoundEntryModal({
  visible,
  players,
  scores,
  onChangeScore,
  onSubmit,
  onCancel,
  roundNumber,
}: Props) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={shared.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={shared.modalOverlay} activeOpacity={1} onPress={onCancel}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[shared.modalSheet, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="subtitle">Round {roundNumber}</ThemedText>
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={{ gap: 8 }}>
                  {players.map(player => (
                    <View key={player.id} style={gameStyles.scoreRow}>
                      <ThemedText type="default" style={gameStyles.scorePlayerName}>
                        {player.name}
                      </ThemedText>
                      <TextInput
                        style={[
                          gameStyles.scoreInput,
                          { backgroundColor: theme.background, color: theme.text },
                        ]}
                        placeholder="0"
                        placeholderTextColor={theme.textSecondary}
                        value={scores[player.id] ?? ''}
                        onChangeText={v => onChangeScore(player.id, v)}
                        keyboardType="number-pad"
                      />
                    </View>
                  ))}
                </View>
              </ScrollView>
              <View style={[shared.row, { justifyContent: 'flex-end' }]}>
                <TouchableOpacity
                  style={[shared.button, { backgroundColor: theme.backgroundSelected }]}
                  onPress={onCancel}>
                  <ThemedText type="small">Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[shared.button, { backgroundColor: '#0077B6' }]}
                  onPress={onSubmit}>
                  <ThemedText type="smallBold" style={{ color: '#fff' }}>
                    Save Round
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
