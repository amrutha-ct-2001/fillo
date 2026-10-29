import {setPendingProof, takePendingProof} from '../proofResult';

test('a waiting photo is handed over exactly once', () => {
  expect(takePendingProof()).toBeNull();
  setPendingProof('file:///p.jpg');
  expect(takePendingProof()).toBe('file:///p.jpg');
  expect(takePendingProof()).toBeNull();
});
