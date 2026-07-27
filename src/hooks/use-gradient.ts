import { Gradients } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useGradients() {
  const scheme = useColorScheme();
  return Gradients[scheme === 'unspecified' ? 'light' : scheme];
}
