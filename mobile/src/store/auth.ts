import {create} from 'zustand';

import {authApi, setAuthToken, setUnauthorizedHandler} from '../api/client';
import {queryClient} from '../api/queryClient';
import type {User} from '../api/types';
import {setQueueOwner} from '../utils/offlineQueue';
import {storage} from '../utils/storage';

export type AuthEntry = 'Login' | 'StaffLogin';

type AuthState = {
  hydrated: boolean;
  token: string | null;
  user: User | null;
  /** Which auth screen to open after logout / cold start */
  authEntry: AuthEntry;
  hydrate: () => Promise<void>;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setAuthEntry: (entry: AuthEntry) => void;
};

function entryForRole(role?: string | null): AuthEntry {
  if (role === 'STAFF' || role === 'ADMIN') return 'StaffLogin';
  return 'Login';
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  token: null,
  user: null,
  authEntry: 'Login',
  setAuthEntry: entry => set({authEntry: entry}),
  hydrate: async () => {
    setUnauthorizedHandler(() => {
      get().logout();
    });
    const token = (await storage.getString('accessToken')) ?? null;
    const user = await storage.getJSON<User>('user');
    const savedEntry = await storage.getString('authEntry');
    const authEntry: AuthEntry =
      savedEntry === 'StaffLogin' || savedEntry === 'Login'
        ? savedEntry
        : 'Login';
    setAuthToken(token);
    if (token && user) {
      setQueueOwner(user.id);
      set({token, user, authEntry, hydrated: true});
      try {
        const {data} = await authApi.me();
        await storage.setJSON('user', data);
        set({user: data});
      } catch {
        // keep cached user offline
      }
    } else {
      set({hydrated: true, authEntry});
    }
  },
  login: async (token, user) => {
    setAuthToken(token);
    setQueueOwner(user.id);
    const authEntry = entryForRole(user.role);
    await storage.setString('accessToken', token);
    await storage.setJSON('user', user);
    await storage.setString('authEntry', authEntry);
    set({token, user, authEntry});
  },
  logout: async () => {
    const authEntry = entryForRole(get().user?.role);
    setAuthToken(null);
    queryClient.clear();
    // Queued fills stay on the device for their owner; nobody else can see or sync them.
    setQueueOwner(null);
    // Set entry in the same update so Auth opens the right screen immediately
    set({token: null, user: null, authEntry});
    await storage.remove('accessToken');
    await storage.remove('user');
    await storage.setString('authEntry', authEntry);
  },
  refreshMe: async () => {
    const {data} = await authApi.me();
    await storage.setJSON('user', data);
    set({user: data});
  },
}));
