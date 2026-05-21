import { KeyboardAvoidingView, Modal, Platform, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';
import { ThemedText } from './themed-text';
import { HapticButton } from "@/components/haptic-button";

type Props = {
  visible: boolean;
  gameName: string;
  onChangeName: (name: string) => void;
  onCreate: () => void;
  onCancel: () => void;
};

export function NewGameModal({ visible, gameName, onChangeName, onCreate, onCancel }: Props) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={shared.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <HapticButton style={shared.modalOverlay} activeOpacity={1} onPress={onCancel}>
          <HapticButton activeOpacity={1}>
            <View style={[shared.modalSheet, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="subtitle">New Game</ThemedText>
              <TextInput
                style={[shared.input, { backgroundColor: theme.background, color: theme.text }]}
                placeholder="Game name"
                placeholderTextColor={theme.textSecondary}
                value={gameName}
                onChangeText={onChangeName}
                onSubmitEditing={onCreate}
                maxLength={30}
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
                  style={[shared.button, { backgroundColor: '#0077B6' }]}
                  onPress={onCreate}
                  disabled={!gameName.trim()}>
                  <ThemedText type="smallBold" style={{ color: '#fff' }}>
                    Create
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
