import { Stack } from "expo-router";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HapticButton } from "@/components/haptic-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLOR_SCHEMES, ColorSchemeId } from "@/constants/color-schemes";
import { DEV_TOOLS_ENABLED } from "@/constants/dev";
import { Spacing } from "@/constants/theme";
import { useColorSchemeContext } from "@/context/color-scheme-context";
import { useGamesContext } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";

export default function SettingsScreen() {
  const theme = useTheme();
  const { schemeId, setSchemeId } = useColorSchemeContext();
  const { seedData, resetData } = useGamesContext();

  const confirmReset = () =>
    Alert.alert("Reset All Data", "This will permanently delete all games, players, and templates. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: resetData },
    ]);

  return (
    <ThemedView style={shared.screen}>
      <Stack.Screen options={{ title: "Settings" }} />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Color Scheme */}
          <View style={styles.section}>
            <ThemedText style={styles.label} themeColor="textSecondary">COLOR SCHEME</ThemedText>
            <View style={[styles.schemesGrid, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              {COLOR_SCHEMES.map((s) => {
                const active = s.id === schemeId;
                const preview = s.colors;
                return (
                  <HapticButton
                    key={s.id}
                    style={[
                      styles.schemeCell,
                      { borderColor: active ? theme.accent : "transparent", borderWidth: 2 },
                    ]}
                    onPress={() => setSchemeId(s.id as ColorSchemeId)}
                    activeOpacity={0.7}
                  >
                    {/* Mini palette preview */}
                    <View style={styles.swatchRow}>
                      <View style={[styles.swatch, { backgroundColor: preview.background }]} />
                      <View style={[styles.swatch, { backgroundColor: preview.backgroundElement }]} />
                      <View style={[styles.swatch, { backgroundColor: preview.accent }]} />
                    </View>
                    <ThemedText
                      style={[styles.schemeName, active && { color: theme.accent }]}
                      themeColor={active ? undefined : "textSecondary"}
                    >
                      {s.name}
                    </ThemedText>
                  </HapticButton>
                );
              })}
            </View>
          </View>

          {/* Data */}
          <View style={styles.section}>
            <ThemedText style={styles.label} themeColor="textSecondary">DATA</ThemedText>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              {DEV_TOOLS_ENABLED && (
                <>
                  <HapticButton
                    style={[styles.dataBtn, { backgroundColor: theme.backgroundSelected }]}
                    onPress={seedData}
                  >
                    <ThemedText type="small">Load Sample Data</ThemedText>
                  </HapticButton>
                  <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
                </>
              )}
              <HapticButton
                style={[styles.dataBtn, { backgroundColor: theme.backgroundSelected }]}
                onPress={confirmReset}
              >
                <ThemedText type="small" style={{ color: theme.danger }}>Reset All Data</ThemedText>
              </HapticButton>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  section: { gap: Spacing.two },
  label: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8 },
  schemesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  schemeCell: {
    borderRadius: Spacing.one + 2,
    padding: Spacing.two,
    alignItems: "center",
    gap: Spacing.one,
    minWidth: 80,
    flex: 1,
  },
  swatchRow: { flexDirection: "row", gap: 3 },
  swatch: { width: 18, height: 18, borderRadius: 4 },
  schemeName: { fontSize: 12, fontWeight: "600" },
  card: { borderRadius: Spacing.two, overflow: "hidden" },
  dataBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: "flex-start",
  },
  divider: { height: StyleSheet.hairlineWidth },
});
