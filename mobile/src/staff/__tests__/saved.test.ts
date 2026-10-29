import {savedHeadline, savedPointsLine} from '../saved';

test('online: shows earned points and the balance', () => {
  expect(savedHeadline(false)).toBe('Fill saved');
  expect(savedPointsLine(false, 5, 125)).toBe('+5 points earned · balance 125');
  expect(savedPointsLine(false, 0, 40)).toBe('No points earned on this fill · balance 40');
  expect(savedPointsLine(false, 2, 0, 10)).toBe('+2 points earned · 10 points used · balance 0');
});

test('offline: never says +0 points, says they come after sync', () => {
  expect(savedHeadline(true)).toBe('Saved on this phone');
  expect(savedPointsLine(true, 0, 40)).toBe('Points will be added after sync');
  expect(savedPointsLine(true, 0, 40)).not.toMatch(/\+0/);
});
