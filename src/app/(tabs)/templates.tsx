import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { shared } from '@/styles/shared';

export default function TemplatesScreen() {
  return (
    <ThemedView style={shared.screen}>
      <SafeAreaView style={[shared.safeArea, { alignItems: 'center', justifyContent: 'center' }]} edges={['bottom']}>
        <View style={{ gap: 8, alignItems: 'center' }}>
          <ThemedText type="subtitle">Templates</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Coming soon</ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
