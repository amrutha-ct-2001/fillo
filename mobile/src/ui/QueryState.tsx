import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import {describeError} from '../utils/errors';
import {useTheme} from '../theme/useTheme';
import {EmptyState} from './EmptyState';
import {ErrorState} from './ErrorState';

type QueryLike<T> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
};

type Props<T> = {
  query: QueryLike<T>;
  children: (data: T) => React.ReactNode;
  /** Return true when a successful result has nothing to show. */
  isEmpty?: (data: T) => boolean;
  empty?: {title: string; message?: string};
  /** Shown instead of the spinner on first load, e.g. a few Skeleton rows. */
  loading?: React.ReactNode;
};

/**
 * One way to show a react-query result: loading, error with retry, empty, or
 * the data. Keeps stale data visible if a background refresh fails.
 */
export function QueryState<T>({query, children, isEmpty, empty, loading}: Props<T>) {
  const t = useTheme();

  if (query.data !== undefined) {
    if (isEmpty?.(query.data)) {
      return <EmptyState title={empty?.title ?? 'Nothing here yet'} message={empty?.message} />;
    }
    return <>{children(query.data)}</>;
  }
  if (query.isError) {
    return <ErrorState message={describeError(query.error).message} onRetry={() => query.refetch()} />;
  }
  return <>{loading ?? <View style={styles.center}><ActivityIndicator color={t.ink} size="large" /></View>}</>;
}

const styles = StyleSheet.create({center: {padding: 32, alignItems: 'center'}});
