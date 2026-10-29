import {displayStaffName, greeting, syncBanner, todayStats} from '../home';

test('staff names are short and always something', () => {
  expect(displayStaffName('Ramesh Kumar')).toBe('Ramesh K.');
  expect(displayStaffName('Ramesh')).toBe('Ramesh');
  expect(displayStaffName('', 'staff01')).toBe('staff01');
  expect(displayStaffName(undefined, null)).toBe('Staff');
});

test('greeting follows the hour', () => {
  expect(greeting(9)).toBe('Good morning');
  expect(greeting(14)).toBe('Good afternoon');
  expect(greeting(20)).toBe('Good evening');
});

test('today stats only count today', () => {
  const now = new Date(2026, 9, 8, 15, 0);
  const rows = [
    {amount: '500.00', created_at: new Date(2026, 9, 8, 9, 0).toISOString()},
    {amount: '250', created_at: new Date(2026, 9, 8, 11, 0).toISOString()},
    {amount: '900', created_at: new Date(2026, 9, 7, 11, 0).toISOString()},
  ];
  expect(todayStats(rows, now)).toEqual({count: 2, total: 750});
});

test('the banner tells staff when they are offline, even with nothing waiting', () => {
  expect(syncBanner(true, 0)).toEqual({kind: 'offline', waiting: 0});
  expect(syncBanner(true, 3)).toEqual({kind: 'offline', waiting: 3});
  expect(syncBanner(false, 2)).toEqual({kind: 'waiting', waiting: 2});
  expect(syncBanner(false, 0)).toEqual({kind: 'none'});
});
