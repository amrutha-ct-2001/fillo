/** Turns axios / JS errors into plain words and says what kind of failure it was. */

export type ErrorKind = 'network' | 'server' | 'rejected' | 'auth' | 'unknown';

export type AppError = {
  kind: ErrorKind;
  message: string;
  status?: number;
};

const FIELD_NAMES: Record<string, string> = {
  plate_number: 'Plate number',
  phone: 'Phone number',
  amount: 'Amount',
  payment_mode: 'Payment mode',
  points_to_redeem: 'Points to use',
  name: 'Name',
  vehicle_photo: 'Vehicle photo',
  payment_proof: 'Payment photo',
  client_id: 'Fill reference',
};

function flatten(data: unknown): string | null {
  if (!data) {
    return null;
  }
  if (typeof data === 'string') {
    // An HTML error page is not something to show a person.
    return data.trim().startsWith('<') ? null : data.slice(0, 200);
  }
  if (Array.isArray(data)) {
    return data.map(flatten).filter(Boolean).join(' ') || null;
  }
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === 'string') {
      return obj.detail;
    }
    const parts = Object.entries(obj)
      .map(([key, value]) => {
        const text = flatten(value);
        if (!text) {
          return null;
        }
        if (key === 'non_field_errors' || key === 'detail') {
          return text;
        }
        return `${FIELD_NAMES[key] ?? key.replace(/_/g, ' ')}: ${text}`;
      })
      .filter(Boolean);
    return parts.length ? parts.join(' ') : null;
  }
  return null;
}

export function describeError(e: unknown): AppError {
  const err = e as {response?: {status?: number; data?: unknown}; message?: string; code?: string};
  const status = err?.response?.status;

  if (!err?.response) {
    // No response at all: the request never reached the server (or timed out).
    return {
      kind: 'network',
      message: 'No connection to the server. Check the signal and try again.',
    };
  }
  if (status === 401 || status === 403) {
    return {
      kind: 'auth',
      status,
      message: flatten(err.response.data) || 'You are not allowed to do this. Sign in again.',
    };
  }
  if (status !== undefined && status >= 500) {
    return {kind: 'server', status, message: 'The server had a problem. Try again in a moment.'};
  }
  const text = flatten(err.response.data);
  return {kind: 'rejected', status, message: text || 'The server did not accept this. Check the details and try again.'};
}

/** True when the request itself failed (no reply, or a 5xx), so queueing for later is safe. */
export function shouldQueueOffline(e: unknown): boolean {
  const k = describeError(e).kind;
  return k === 'network' || k === 'server';
}

export function isNotFound(e: unknown): boolean {
  return (e as {response?: {status?: number}})?.response?.status === 404;
}
