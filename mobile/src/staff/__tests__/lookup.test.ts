jest.mock('../../api/client', () => ({vehicleApi: {lookup: jest.fn()}, authApi: {lookupCustomer: jest.fn()}}));

import {lookupPhone, lookupPlate} from '../lookup';

const vehicle: any = {id: 7, plate_number: 'KL07AB1234', customer: {id: 3, name: 'Ramesh'}};
const err = (status?: number) => (status ? {response: {status}} : new Error('Network Error'));

test('a short plate is invalid and makes no request', async () => {
  const fetcher = jest.fn();
  expect(await lookupPlate('KL', fetcher)).toEqual({status: 'invalid'});
  expect(fetcher).not.toHaveBeenCalled();
});

test('a known plate is found, and the plate is normalised before the request', async () => {
  const fetcher = jest.fn().mockResolvedValue({data: vehicle});
  const r = await lookupPlate('kl 07 ab 1234', fetcher);
  expect(fetcher).toHaveBeenCalledWith('KL07AB1234');
  expect(r).toMatchObject({status: 'found', plate: 'KL07AB1234'});
});

test('404 means a new vehicle', async () => {
  const r = await lookupPlate('KL07AB1234', jest.fn().mockRejectedValue(err(404)));
  expect(r).toEqual({status: 'new', plate: 'KL07AB1234'});
});

test('a network error is an error, never a new vehicle', async () => {
  const r = await lookupPlate('KL07AB1234', jest.fn().mockRejectedValue(err()));
  expect(r.status).toBe('error');
  if (r.status === 'error') {
    expect(r.error.kind).toBe('network');
  }
});

test('a 500 is an error, never a new vehicle', async () => {
  const r = await lookupPlate('KL07AB1234', jest.fn().mockRejectedValue(err(500)));
  expect(r.status).toBe('error');
});

test('phone lookup lists every vehicle of the customer', async () => {
  const fetcher = jest.fn().mockResolvedValue({
    data: {id: 3, name: 'Ramesh', vehicles: [vehicle, {...vehicle, id: 8}]},
  });
  const r = await lookupPhone('+91 98765 43210', fetcher);
  expect(fetcher).toHaveBeenCalledWith('9876543210');
  expect(r.status).toBe('found');
  if (r.status === 'found') {
    expect(r.vehicles).toHaveLength(2);
    expect(r.customer).not.toHaveProperty('vehicles');
  }
});

test('phone lookup: short is invalid, 404 is new, network is an error', async () => {
  expect(await lookupPhone('12345', jest.fn())).toEqual({status: 'invalid'});
  expect((await lookupPhone('9876543210', jest.fn().mockRejectedValue(err(404)))).status).toBe('new');
  expect((await lookupPhone('9876543210', jest.fn().mockRejectedValue(err()))).status).toBe('error');
});
