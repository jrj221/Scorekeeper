import { useColorSchemeContext } from '@/context/color-scheme-context';

export function useTheme() {
  const { scheme } = useColorSchemeContext();
  return scheme.colors;
}
