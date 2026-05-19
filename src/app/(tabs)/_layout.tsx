import { Stack, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/hooks/use-theme';

export default function TabLayout() {
  const theme = useTheme();
  return (
    <>
      {/* Hide the root Stack header; title is used as the back button label on child screens */}
      <Stack.Screen options={{ headerShown: false, title: 'Home' }} />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTitleStyle: { fontSize: 16, fontWeight: '600' },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
          tabBarStyle: {
            backgroundColor: theme.backgroundElement,
            borderTopColor: theme.backgroundSelected,
          },
          tabBarActiveTintColor: '#0077B6',
          tabBarInactiveTintColor: theme.textSecondary,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Games',
            tabBarIcon: ({ color }) => (
              <SymbolView name="list.bullet" size={22} tintColor={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="players"
          options={{
            title: 'Players',
            tabBarIcon: ({ color }) => (
              <SymbolView name="person.2.fill" size={22} tintColor={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="templates"
          options={{
            title: 'Templates',
            tabBarIcon: ({ color }) => (
              <SymbolView name="doc.text.fill" size={22} tintColor={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
