import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColorSchemeContext } from '@/context/color-scheme-context';

export function useTheme() {
  const deviceScheme = useColorScheme();
  const { scheme, colorMode } = useColorSchemeContext();

  const mode =
    colorMode === 'system'
      ? deviceScheme === 'dark' ? 'dark' : 'light'
      : colorMode;

  return scheme[mode];
}
