import { KeyboardAvoidingView, Modal, Platform, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';
import { ThemedText } from './themed-text';
import { HapticButton } from "@/components/haptic-button";

type Props = {
  visible: boolean;
  playerName: string;
  onChangeName: (name: string) => void;
  onAdd: () => void;
  onCancel: () => void;
};

export function AddPlayerModal({ visible, playerName, onChangeName, onAdd, onCancel }: Props) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={shared.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <HapticButton style={shared.modalOverlay} activeOpacity={1} onPress={onCancel}>
          <HapticButton activeOpacity={1}>
            <View style={[shared.modalSheet, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="subtitle">Add Player</ThemedText>
              <TextInput
                style={[shared.input, { backgroundColor: theme.background, color: theme.text }]}
                placeholder="Player name"
                placeholderTextColor={theme.textSecondary}
                value={playerName}
                onChangeText={onChangeName}
                onSubmitEditing={onAdd}
                maxLength={15}
                autoFocus
                returnKeyType="done"
              />
              <View style={[shared.row, { justifyContent: 'flex-end' }]}>
                <HapticButton
                  style={[shared.button, { backgroundColor: theme.backgroundSelected }]}
                  onPress={onCancel}>
                  <ThemedText type="small">Cancel</ThemedText>
                </HapticButton>
                <HapticButton
                  style={[shared.button, { backgroundColor: theme.accent }]}
                  onPress={onAdd}
                  disabled={!playerName.trim()}>
                  <ThemedText type="smallBold" style={{ color: '#fff' }}>
                    Add
                  </ThemedText>
                </HapticButton>
              </View>
            </View>
          </HapticButton>
        </HapticButton>
      </KeyboardAvoidingView>
    </Modal>
  );
}
