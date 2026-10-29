import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Icon, IconName} from '../components/Icon';
import {space, target} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Badge, BadgeTone} from './Badge';
import {BubbleTone, IconBubble} from './IconBubble';
import {Text} from './Text';
import {Touchable} from './Touchable';

type Props = {
  title: string;
  subtitle?: string;
  /** Right-aligned value, such as an amount. */
  trailing?: string;
  badge?: string;
  badgeTone?: BadgeTone;
  /** Round icon at the start of the row. */
  icon?: IconName;
  iconTone?: BubbleTone;
  onPress?: () => void;
  first?: boolean;
};

export function ListRow({title, subtitle, trailing, badge, badgeTone, icon, iconTone, onPress, first}: Props) {
  const t = useTheme();
  const content = (
    <>
      {icon ? <IconBubble icon={icon} tone={iconTone} /> : null}
      <View style={styles.main}>
        <View style={styles.titleRow}>
          <Text variant="subheading" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {badge ? <Badge label={badge} tone={badgeTone} /> : null}
        </View>
        {subtitle ? (
          <Text variant="bodySmall" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? (
        <Text variant="subheading" numberOfLines={1} style={styles.trailing}>
          {trailing}
        </Text>
      ) : null}
      {onPress ? <Icon name="chevron-right" size={20} color={t.textSecondary} /> : null}
    </>
  );
  const rowStyle = [styles.row, !first && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border}];

  return onPress ? (
    <Touchable onPress={onPress} haptic={false} style={rowStyle} accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}>
      {content}
    </Touchable>
  ) : (
    <View style={rowStyle}>{content}</View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: target.min + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  main: {flex: 1, gap: 2},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: space.sm},
  title: {flexShrink: 1},
  // Short values (amounts, "Today, 11:32 am") always show whole; the title shrinks first.
  trailing: {flexShrink: 0, maxWidth: '60%', textAlign: 'right'},
});
