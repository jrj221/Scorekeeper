import { Stack } from 'expo-router';

import { GamesProvider } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';

export default function RootLayout() {
  const theme = useTheme();
  return (
    <GamesProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTitleStyle: { fontSize: 16, fontWeight: '600' },
          headerTintColor: theme.text,
          headerBackTitleStyle: { fontSize: 13 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      />
    </GamesProvider>
  );
}
