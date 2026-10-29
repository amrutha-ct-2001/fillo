import React, {useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {authApi} from '../../api/client';
import type {AuthStackParamList} from '../../navigation/types';
import {useAuthStore} from '../../store/auth';
import {Button, ErrorState, Input} from '../../ui';
import {describeError} from '../../utils/errors';
import {tenDigits} from '../../utils/format';
import {AuthLayout} from './AuthLayout';

type Step = 'phone' | 'otp' | 'name';

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const login = useAuthStore(s => s.login);
  const setAuthEntry = useAuthStore(s => s.setAuthEntry);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = tenDigits(phone);

  const requestOtp = async () => {
    if (digits.length < 10) {
      setError('Enter your 10-digit mobile number.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const {data} = await authApi.requestOtp(digits);
      setIsNew(!!data.is_new);
      setOtp('');
      setName('');
      setStep('otp');
    } catch (e) {
      setError(describeError(e).message);
    } finally {
      setLoading(false);
    }
  };

  const verifyAndLogin = async (customerName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const {data} = await authApi.verifyOtp(digits, otp, customerName?.trim() || undefined);
      await login(data.access, data.user);
    } catch (e) {
      setError(describeError(e).message);
      if (isNew && step === 'name') {
        setStep('otp');
      }
    } finally {
      setLoading(false);
    }
  };

  const onOtpContinue = async () => {
    if (otp.length < 4) {
      setError('Enter the OTP we sent you.');
      return;
    }
    setError(null);
    if (isNew) {
      setStep('name');
      return;
    }
    await verifyAndLogin();
  };

  const createAccount = () => {
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    verifyAndLogin(name);
  };

  const resetToPhone = () => {
    setStep('phone');
    setOtp('');
    setName('');
    setIsNew(false);
    setError(null);
  };

  const title = step === 'otp' ? 'Enter OTP' : step === 'name' ? 'Your name' : 'Customer login';
  const tagline =
    step === 'otp'
      ? `OTP sent to +91 ${digits}`
      : step === 'name'
        ? `New customer · +91 ${digits}`
        : 'Mobile number and OTP for loyalty access';

  return (
    <AuthLayout
      title={title}
      tagline={tagline}
      switchLink={
        step === 'phone'
          ? {
              label: 'Login as Staff',
              icon: 'staff',
              onPress: () => {
                setAuthEntry('StaffLogin');
                navigation.navigate('StaffLogin');
              },
            }
          : undefined
      }>
      {step === 'phone' ? (
        <>
          <Input
            label="Mobile number"
            prefix="+91"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={v => {
              setError(null);
              setPhone(v.replace(/\D/g, '').slice(0, 10));
            }}
            placeholder="10-digit mobile"
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={requestOtp}
          />
          {error ? <ErrorState compact title="Could not continue" message={error} /> : null}
          <Button title="Continue" onPress={requestOtp} loading={loading} large />
        </>
      ) : null}

      {step === 'otp' ? (
        <>
          <Input
            label="OTP"
            keyboardType="number-pad"
            value={otp}
            onChangeText={v => {
              setError(null);
              setOtp(v.replace(/\D/g, '').slice(0, 6));
            }}
            placeholder="Enter OTP"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={onOtpContinue}
          />
          {error ? <ErrorState compact title="Could not continue" message={error} /> : null}
          <Button title="Verify" onPress={onOtpContinue} loading={loading} large />
          <Button title="Change number" variant="secondary" onPress={resetToPhone} />
        </>
      ) : null}

      {step === 'name' ? (
        <>
          <Input
            label="Your name"
            value={name}
            onChangeText={v => {
              setError(null);
              setName(v);
            }}
            placeholder="Enter your name"
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={createAccount}
          />
          {error ? <ErrorState compact title="Could not continue" message={error} /> : null}
          <Button title="Create account" onPress={createAccount} loading={loading} large />
          <Button title="Back to OTP" variant="secondary" onPress={() => setStep('otp')} />
        </>
      ) : null}
    </AuthLayout>
  );
}
