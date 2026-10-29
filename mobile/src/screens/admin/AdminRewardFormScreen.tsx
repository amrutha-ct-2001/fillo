import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';

import {validateReward} from '../../admin/validation';
import type {AdminRewardsStackParamList} from '../../navigation/types';
import {useRewards, useSaveReward} from '../../queries/rewards';
import {space} from '../../theme/tokens';
import {AppHeader, Button, ErrorState, Input, Screen, showToast, Skeleton, Toggle} from '../../ui';
import {describeError} from '../../utils/errors';

export function AdminRewardFormScreen() {
  const route = useRoute<RouteProp<AdminRewardsStackParamList, 'RewardForm'>>();
  const navigation = useNavigation();
  const rewardId = route.params?.rewardId;
  const isNew = rewardId === undefined;

  const list = useRewards();
  const reward = list.data?.find(r => r.id === rewardId);
  const save = useSaveReward(rewardId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filled = useRef(false);

  // Fill the form once, when the reward arrives (not on every refetch, which would erase typing).
  useEffect(() => {
    if (reward && !filled.current) {
      filled.current = true;
      setTitle(reward.title);
      setDescription(reward.description);
      setCost(String(reward.points_cost));
      setStock(reward.stock === null ? '' : String(reward.stock));
      setActive(reward.is_active);
    }
  }, [reward]);

  const waiting = !isNew && !reward;

  const onSave = async () => {
    const checked = validateReward({title, cost, stock});
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    setError(null);
    try {
      await save.mutateAsync({...checked.value, description: description.trim(), is_active: active});
      showToast('success', 'Saved', isNew ? 'Reward added to the catalog.' : 'Reward updated.');
      navigation.goBack();
    } catch (e) {
      setError(describeError(e).message);
    }
  };

  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 6);

  return (
    <Screen
      header={<AppHeader title={isNew ? 'Add reward' : 'Edit reward'} onBack={() => navigation.goBack()} />}
      footer={waiting ? undefined : <Button title={isNew ? 'ADD REWARD' : 'SAVE CHANGES'} icon="check" large onPress={onSave} loading={save.isPending} />}>
      {waiting ? (
        list.isError ? (
          <ErrorState message={describeError(list.error).message} onRetry={() => list.refetch()} />
        ) : (
          <View style={styles.gap}>
            <Skeleton height={64} />
            <Skeleton height={64} />
          </View>
        )
      ) : (
        <View style={styles.gap}>
          <Input label="Reward name" value={title} onChangeText={v => { setError(null); setTitle(v); }} autoCapitalize="sentences" placeholder="e.g. Free car wash" autoFocus={isNew} />
          <Input label="Description (optional)" value={description} onChangeText={setDescription} autoCapitalize="sentences" placeholder="Shown to customers under the name" />
          <Input label="Cost in points" value={cost} onChangeText={v => { setError(null); setCost(digits(v)); }} keyboardType="number-pad" placeholder="e.g. 60" />
          <Input
            label="Stock (leave blank for unlimited)"
            value={stock}
            onChangeText={v => { setError(null); setStock(digits(v)); }}
            keyboardType="number-pad"
            placeholder="Unlimited"
            hint="Goes down by one each time a customer redeems it."
          />
          <Toggle label="Show to customers" description="Hidden rewards stay in this list but customers cannot redeem them." value={active} onChange={setActive} />
          {error ? <ErrorState compact title="Not saved" message={error} /> : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({gap: {gap: space.md}});
