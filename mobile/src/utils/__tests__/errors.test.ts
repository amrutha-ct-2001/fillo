import {describeError, isNotFound, shouldQueueOffline} from '../errors';

const http = (status: number, data?: unknown) => ({response: {status, data}});

test('no response means a network failure and is safe to queue', () => {
  const e = describeError(new Error('Network Error'));
  expect(e.kind).toBe('network');
  expect(shouldQueueOffline(new Error('Network Error'))).toBe(true);
});

test('5xx is a server problem and is safe to queue', () => {
  expect(describeError(http(503)).kind).toBe('server');
  expect(shouldQueueOffline(http(500))).toBe(true);
});

test('a 400 is a rejection: shown in plain words and never queued', () => {
  const e = describeError(http(400, {amount: ['A valid number is required.']}));
  expect(e.kind).toBe('rejected');
  expect(e.message).toBe('Amount: A valid number is required.');
  expect(shouldQueueOffline(http(400))).toBe(false);
});

test('detail strings pass through, field names are friendly', () => {
  expect(describeError(http(400, {detail: 'Insufficient points'})).message).toBe('Insufficient points');
  expect(describeError(http(400, {plate_number: ['Too short.'], phone: ['Required.']})).message).toBe(
    'Plate number: Too short. Phone number: Required.',
  );
});

test('an HTML error page is never shown to a person', () => {
  expect(describeError(http(400, '<html>oops</html>')).message).toMatch(/did not accept/);
});

test('401 and 403 are auth problems', () => {
  expect(describeError(http(401)).kind).toBe('auth');
  expect(describeError(http(403, {detail: 'No access'})).message).toBe('No access');
});

test('isNotFound only matches 404', () => {
  expect(isNotFound(http(404))).toBe(true);
  expect(isNotFound(http(500))).toBe(false);
  expect(isNotFound(new Error('x'))).toBe(false);
});
