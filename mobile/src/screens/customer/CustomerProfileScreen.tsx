import React, {useState} from 'react';

import {authApi} from '../../api/client';
import {useAuthStore} from '../../store/auth';
import {Button, confirm, ErrorState, Input, Screen, showToast, Text} from '../../ui';
import {describeError} from '../../utils/errors';
import {formatPhone} from '../../utils/format';

export function CustomerProfileScreen() {
  const user = useAuthStore(s => s.user);
  const refreshMe = useAuthStore(s => s.refreshMe);
  const logout = useAuthStore(s => s.logout);
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = name.trim() !== (user?.name || '').trim();

  const save = async () => {
    setLoading(true);
    setError(null);
    try {
      await authApi.updateMe(name.trim());
      await refreshMe();
      showToast('success', 'Saved', 'Your name is updated.');
    } catch (e) {
      setError(describeError(e).message);
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    if (await confirm({title: 'Log out', message: 'Sign out of Fillo?', confirmLabel: 'Log out', destructive: true, icon: 'logout'})) {
      logout();
    }
  };

  return (
    <Screen edges={['top']}>
      <Text variant="title" accessibilityRole="header">
        Profile
      </Text>
      <Text variant="body" color="textSecondary">
        {formatPhone(user?.phone)}
      </Text>
      <Input label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
      {error ? <ErrorState compact title="Not saved" message={error} /> : null}
      <Button title="Save" icon="check" onPress={save} loading={loading} disabled={!dirty} />
      <Button title="Log out" icon="logout" variant="secondary" onPress={onLogout} />
    </Screen>
  );
}
