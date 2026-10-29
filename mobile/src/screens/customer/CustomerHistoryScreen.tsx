import React from 'react';

import {useMyFills} from '../../queries/customer';
import {ListRow, ListScreen} from '../../ui';
import {formatDateTime, formatInr} from '../../utils/format';
import {paymentLabel, pointsUsedSuffix} from '../../utils/labels';

export function CustomerHistoryScreen() {
  const query = useMyFills();
  return (
    <ListScreen
      title="History"
      subtitle="Your fills and rewards"
      query={query}
      keyExtractor={t => String(t.id)}
      empty={{icon: 'history', title: 'No fills yet', message: 'Your fills will show up here after your next visit to the pump.'}}
      renderItem={(item, index) => (
        <ListRow
          first={index === 0}
          title={item.vehicle.plate_number}
          subtitle={`${formatDateTime(item.created_at)} · ${paymentLabel(item.payment_mode)}${pointsUsedSuffix(item.points_redeemed)}`}
          trailing={formatInr(item.amount)}
          badge={item.points_earned ? `+${item.points_earned} pts` : undefined}
          badgeTone="success"
        />
      )}
    />
  );
}
