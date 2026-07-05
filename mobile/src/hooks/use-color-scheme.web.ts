import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// To support static rendering on web, the real scheme is only returned after
// hydration; the server snapshot pins the first client render to 'light' so the
// markup matches. useSyncExternalStore replaces the template's setState-in-effect
// hydration flag (which the react-hooks lint rules reject).
const emptySubscribe = () => () => {};

export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
