import {formatDateTime, formatInr, formatPhone, formatPlate, maskPhone, tenDigits} from '../format';

test('formatInr uses Indian grouping and tolerates API strings', () => {
  expect(formatInr(500)).toBe('₹500');
  expect(formatInr('1500.00')).toBe('₹1,500');
  expect(formatInr(123456)).toBe('₹1,23,456');
  expect(formatInr(12345678)).toBe('₹1,23,45,678');
  expect(formatInr('499.5')).toBe('₹499.50');
  expect(formatInr(-2500)).toBe('₹-2,500');
});

test('formatInr never shows NaN', () => {
  expect(formatInr(undefined)).toBe('₹0');
  expect(formatInr('abc')).toBe('₹0');
  expect(formatInr(null)).toBe('₹0');
});

test('phones drop country prefixes and format or mask', () => {
  expect(tenDigits('+91 98765-43210')).toBe('9876543210');
  expect(tenDigits('09876543210')).toBe('9876543210');
  expect(formatPhone('9876543210')).toBe('+91 98765 43210');
  expect(maskPhone('9876543210')).toBe('+91 98••• ••210');
  expect(formatPhone('12345')).toBe('12345');
});

test('formatPlate spaces a standard plate and leaves odd ones alone', () => {
  expect(formatPlate('kl07ab1234')).toBe('KL 07 AB 1234');
  expect(formatPlate('KL-07 AB 1234')).toBe('KL 07 AB 1234');
  expect(formatPlate('XYZ')).toBe('XYZ');
});

test('formatDateTime says Today / Yesterday / a date', () => {
  const now = new Date(2026, 9, 8, 15, 0);
  expect(formatDateTime(new Date(2026, 9, 8, 14, 35), now)).toBe('Today, 2:35 pm');
  expect(formatDateTime(new Date(2026, 9, 7, 9, 5), now)).toBe('Yesterday, 9:05 am');
  expect(formatDateTime(new Date(2026, 9, 3, 0, 10), now)).toBe('3 Oct, 12:10 am');
  expect(formatDateTime(new Date(2025, 11, 31, 12, 0), now)).toBe('31 Dec 2025, 12:00 pm');
  expect(formatDateTime('not a date', now)).toBe('');
});
