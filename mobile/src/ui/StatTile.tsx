import React from 'react';
import {StyleSheet} from 'react-native';

import type {IconName} from '../components/Icon';
import {space} from '../theme/tokens';
import {Card} from './Card';
import {BubbleTone, IconBubble} from './IconBubble';
import {Text} from './Text';

type Props = {
  label: string;
  value: string;
  /** Small line under the value, e.g. "since 6 am". */
  note?: string;
  icon?: IconName;
  tone?: BubbleTone;
};

export function StatTile({label, value, note, icon, tone = 'brand'}: Props) {
  return (
    <Card style={styles.tile}>
      {icon ? <IconBubble icon={icon} tone={tone} size={36} /> : null}
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="heading" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {note ? (
        <Text variant="caption" color="textSecondary">
          {note}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {flex: 1, gap: space.xs},
});
