import React from 'react';
import {StyleSheet, View} from 'react-native';

import {FilloLogo} from '../../components/FilloLogo';
import {Icon, IconName} from '../../components/Icon';
import {useKeyboardOpen} from '../../hooks/useKeyboardOpen';
import {space} from '../../theme/tokens';
import {useTheme} from '../../theme/useTheme';
import {Card, Screen, Text, Touchable} from '../../ui';

type Props = {
  title: string;
  tagline: string;
  children: React.ReactNode;
  /** The "Login as ..." link under the form. Hidden while the keyboard is open. */
  switchLink?: {label: string; icon: IconName; onPress: () => void};
};

/** Shared frame for both login screens: logo, title, form, switch link. */
export function AuthLayout({title, tagline, children, switchLink}: Props) {
  const t = useTheme();
  const keyboardOpen = useKeyboardOpen();
  return (
    <Screen centered edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <FilloLogo height={keyboardOpen ? 56 : 76} />
        <Text variant={keyboardOpen ? 'heading' : 'title'} style={styles.center} accessibilityRole="header">
          {title}
        </Text>
        {!keyboardOpen ? (
          <Text variant="body" color="textSecondary" style={styles.center}>
            {tagline}
          </Text>
        ) : null}
      </View>
      <Card style={styles.form}>{children}</Card>
      {switchLink && !keyboardOpen ? (
        <Touchable onPress={switchLink.onPress} accessibilityRole="link" accessibilityLabel={switchLink.label} style={styles.link}>
          <Icon name={switchLink.icon} size={22} color={t.textSecondary} />
          <Text variant="label" color="textSecondary">
            {switchLink.label}
          </Text>
          <Icon name="chevron-right" size={20} color={t.textSecondary} />
        </Touchable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {alignItems: 'center', gap: space.sm},
  center: {textAlign: 'center'},
  form: {gap: space.md, padding: space.xl},
  link: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm},
});
