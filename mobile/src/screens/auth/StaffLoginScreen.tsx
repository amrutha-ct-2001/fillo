import React, {useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {authApi} from '../../api/client';
import type {AuthStackParamList} from '../../navigation/types';
import {useAuthStore} from '../../store/auth';
import {Button, ErrorState, Input} from '../../ui';
import {describeError} from '../../utils/errors';
import {AuthLayout} from './AuthLayout';

export function StaffLoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const login = useAuthStore(s => s.login);
  const setAuthEntry = useAuthStore(s => s.setAuthEntry);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staffLogin = async () => {
    if (!username.trim() || pin.length !== 4) {
      setError('Enter your username and 4-digit PIN.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const {data} = await authApi.pinLogin(username.trim(), pin);
      await login(data.access, data.user);
    } catch (e) {
      setError(describeError(e).message);
    } finally {
      setLoading(false);
    }
  };

  const goCustomerLogin = () => {
    setAuthEntry('Login');
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Login');
    }
  };

  return (
    <AuthLayout
      title="Staff login"
      tagline="Username and PIN for pump desk access"
      switchLink={{label: 'Login as Customer', icon: 'person', onPress: goCustomerLogin}}>
      <Input
        label="Username"
        value={username}
        onChangeText={v => {
          setError(null);
          setUsername(v);
        }}
        placeholder="Username"
        returnKeyType="next"
      />
      <Input
        label="PIN"
        value={pin}
        onChangeText={v => {
          setError(null);
          setPin(v.replace(/\D/g, '').slice(0, 4));
        }}
        placeholder="4-digit PIN"
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        // one-time-code = not a saved password, so no autofill suggestions
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        returnKeyType="done"
        onSubmitEditing={staffLogin}
      />
      {error ? <ErrorState compact title="Could not log in" message={error} /> : null}
      <Button title="Login" onPress={staffLogin} loading={loading} large icon="staff" />
    </AuthLayout>
  );
}
