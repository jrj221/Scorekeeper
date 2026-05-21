import { useCallback, useEffect, useState } from 'react';
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

  // Disable swipe-back gesture while dirty so the gesture can't start a
  // navigation that we'd have to cancel mid-animation.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !isDirty });
  }, [navigation, isDirty]);

  // Clear highlight once changes are saved or cancelled
  useEffect(() => {
    if (!isDirty) setHighlighted(false);
  }, [isDirty]);

  const trigger = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
    setTimeout(() => setHighlighted(true), 350);
  }, [scrollRef]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isDirty) return;
      e.preventDefault();
      trigger();
    });
    return unsubscribe;
  }, [navigation, isDirty, trigger]);

  // Keep borderWidth constant to avoid layout shift; only color changes
  const highlightStyle = {
    borderWidth: 2,
    borderRadius: 10,
    borderColor: highlighted ? theme.accent : 'transparent',
    padding: 4,
  };

  return { highlightStyle };
}
