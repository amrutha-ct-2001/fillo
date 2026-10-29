import React from 'react';

import {useMyVehicles} from '../../queries/customer';
import {ListRow, ListScreen} from '../../ui';
import {formatPlate} from '../../utils/format';
import {vehicleTypeLabel} from '../../utils/labels';

export function CustomerVehiclesScreen() {
  const query = useMyVehicles();
  return (
    <ListScreen
      title="My vehicles"
      subtitle="Registered at the pump"
      query={query}
      keyExtractor={v => String(v.id)}
      empty={{icon: 'vehicle', title: 'No vehicles yet', message: 'Your vehicle is added the first time you fill at the pump.'}}
      renderItem={(item, index) => (
        <ListRow
          first={index === 0}
          title={formatPlate(item.plate_number)}
          subtitle={[vehicleTypeLabel(item.vehicle_type), item.model_name, item.colour].filter(Boolean).join(' · ')}
        />
      )}
    />
  );
}
