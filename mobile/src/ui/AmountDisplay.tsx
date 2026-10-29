import React from 'react';
import {StyleSheet, View} from 'react-native';

import {formatInr} from '../utils/format';
import {Text} from './Text';

type Props = {
  amount: string | number;
  /** Line above the amount, e.g. "Customer pays". */
  label?: string;
  size?: 'large' | 'normal';
};

/** The one place a rupee amount is shown big. Same grouping and symbol everywhere. */
export function AmountDisplay({amount, label, size = 'large'}: Props) {
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${label ? `${label} ` : ''}${formatInr(amount)}`}>
      {label ? (
        <Text variant="label" color="textSecondary">
          {label}
        </Text>
      ) : null}
      <Text variant={size === 'large' ? 'amount' : 'heading'} adjustsFontSizeToFit numberOfLines={1}>
        {formatInr(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({wrap: {gap: 2}});
