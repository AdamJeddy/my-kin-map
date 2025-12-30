import { useEffect, useState } from 'react';

/**
 * Hook to detect media query matches
 * @param query - CSS media query string
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

/**
 * Hook to detect if the user is on a mobile device
 * Uses 768px breakpoint (md in Tailwind)
 */
export function useIsMobile(): boolean {
  return !useMediaQuery('(min-width: 768px)');
}

/**
 * Hook to detect if the user is on a tablet
 * Between 768px and 1024px
 */
export function useIsTablet(): boolean {
  const isAboveMobile = useMediaQuery('(min-width: 768px)');
  const isBelowDesktop = !useMediaQuery('(min-width: 1024px)');
  return isAboveMobile && isBelowDesktop;
}

/**
 * Hook to detect if the user is on a desktop
 * Above 1024px
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
