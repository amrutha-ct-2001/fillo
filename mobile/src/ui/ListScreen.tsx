import React from 'react';
import {FlatList, StyleSheet, View} from 'react-native';

import {space} from '../theme/tokens';
import {describeError} from '../utils/errors';
import {EmptyState} from './EmptyState';
import {ErrorState} from './ErrorState';
import {FadeIn} from './FadeIn';
import {GroupedItem} from './GroupedItem';
import {Screen} from './Screen';
import {SkeletonList} from './SkeletonList';
import {Text} from './Text';

type QueryLike<T> = {
  data: T[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isRefetching: boolean;
  refetch: () => unknown;
};

type Props<T> = {
  title: string;
  subtitle?: string;
  query: QueryLike<T>;
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactElement;
  empty: {title: string; message?: string; icon?: React.ComponentProps<typeof EmptyState>['icon']};
  /** Shown above the list (a summary card, a filter). */
  header?: React.ReactNode;
  /** Pinned bar above the list, e.g. an AppHeader with a back button on a stacked screen. */
  topBar?: React.ReactNode;
  edges?: React.ComponentProps<typeof Screen>['edges'];
};

/**
 * The one list pattern for tab screens: title, pull-to-refresh, skeleton while
 * loading, ErrorState with retry (never "empty") when it fails, EmptyState only
 * for a real empty result. Older data stays visible if a refresh fails.
 */
export function ListScreen<T>({title, subtitle, query, keyExtractor, renderItem, empty, header, topBar, edges = ['top']}: Props<T>) {
  const {data} = query;

  let placeholder: React.ReactElement | null = null;
  if (data === undefined) {
    placeholder = query.isError ? (
      <ErrorState message={describeError(query.error).message} onRetry={() => query.refetch()} />
    ) : (
      <SkeletonList rows={5} />
    );
  } else if (data.length === 0) {
    placeholder = <EmptyState icon={empty.icon} title={empty.title} message={empty.message} />;
  }

  return (
    <Screen scroll={false} padded={false} edges={edges} header={topBar}>
      <FlatList
        data={data ?? []}
        keyExtractor={keyExtractor}
        renderItem={({item, index}) => (
          <FadeIn index={index}>
            <GroupedItem index={index} count={data?.length ?? 0}>
              {renderItem(item, index)}
            </GroupedItem>
          </FadeIn>
        )}
        refreshing={query.isRefetching}
        onRefresh={() => {
          query.refetch();
        }}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="body" color="textSecondary">
                {subtitle}
              </Text>
            ) : null}
            {header}
            {data !== undefined && query.isError ? (
              <ErrorState compact title="Could not refresh" message={describeError(query.error).message} onRetry={() => query.refetch()} />
            ) : null}
          </View>
        }
        ListEmptyComponent={placeholder ?? undefined}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {padding: space.lg, paddingBottom: space.xxl},
  header: {gap: space.sm, marginBottom: space.md},
});
