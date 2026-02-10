import { useRouter } from 'expo-router';

/**
 * Maneja la navegación "atrás" evitando el error GO_BACK cuando no hay pantalla previa.
 * Si no hay historial, navega al fallbackRoute.
 */
export function useSafeBack(fallbackRoute: string) {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  };
}
