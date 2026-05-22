import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/hooks/use-theme';

export function useUnsavedChangesScroll(
  isDirty: boolean,
  scrollRef: React.RefObject<ScrollView | null>,
) {
  const navigation = useNavigation();
  const theme = useTheme();
  const [highlighted, setHighlighted] = useState(false);
  // Set true before programmatic back navigation so the listener won't intercept it
  const bypassRef = useRef(false);

  useEffect(() => {
    if (!isDirty) { setHighlighted(false); bypassRef.current = false; }
    navigation.setOptions({ gestureEnabled: !isDirty });
  }, [navigation, isDirty]);

  const trigger = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
    setTimeout(() => setHighlighted(true), 350);
  }, [scrollRef]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isDirty || bypassRef.current) return;
      e.preventDefault();
      trigger();
    });
    return unsubscribe;
  }, [navigation, isDirty, trigger]);

  /** Call before router.back() so the beforeRemove listener lets it through. */
  const exitSafely = useCallback(() => { bypassRef.current = true; }, []);

  const highlightStyle = {
    borderWidth: 2,
    borderRadius: 10,
    borderColor: highlighted ? theme.accent : 'transparent',
    padding: 4,
  };

  return { highlightStyle, exitSafely };
}
