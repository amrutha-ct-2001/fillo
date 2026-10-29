import {addVote, Vote} from '../plateVote';

test('one read is not enough', () => {
  expect(addVote([], 'KL07AB1234', 0).winner).toBeNull();
});

test('the same plate twice inside the window wins', () => {
  const a = addVote([], 'KL07AB1234', 0);
  expect(addVote(a.votes, 'KL07AB1234', 700).winner).toBe('KL07AB1234');
});

test('a noisy read does not beat the repeated one', () => {
  let votes: Vote[] = [];
  votes = addVote(votes, 'KL07A81234', 0).votes;
  votes = addVote(votes, 'KL07AB1234', 500).votes;
  const r = addVote(votes, 'KL07AB1234', 1000);
  expect(r.winner).toBe('KL07AB1234');
});

test('old reads are forgotten', () => {
  const a = addVote([], 'KL07AB1234', 0);
  const r = addVote(a.votes, 'KL07AB1234', 5000);
  expect(r.winner).toBeNull();
  expect(r.votes).toHaveLength(1);
});

test('needed votes can be raised', () => {
  const opts = {needed: 3};
  let r = addVote([], 'KL07AB1234', 0, opts);
  r = addVote(r.votes, 'KL07AB1234', 500, opts);
  expect(r.winner).toBeNull();
  r = addVote(r.votes, 'KL07AB1234', 1000, opts);
  expect(r.winner).toBe('KL07AB1234');
});
