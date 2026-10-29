import {useCallback, useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';

/**
 * Tabs stay mounted, so react-query would not reload when a customer comes
 * back to a tab. Refetch on every focus after the first (the first load is
 * already done by the query itself).
 */
export function useRefetchOnFocus(refetch: () => unknown) {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
}
