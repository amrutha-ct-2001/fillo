import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'fillo:';

export const storage = {
  async getString(key: string): Promise<string | undefined> {
    const v = await AsyncStorage.getItem(PREFIX + key);
    return v ?? undefined;
  },
  async setString(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(PREFIX + key, value);
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(PREFIX + key);
  },
  async getJSON<T>(key: string): Promise<T | undefined> {
    const v = await this.getString(key);
    if (!v) return undefined;
    try {
      return JSON.parse(v) as T;
    } catch {
      return undefined;
    }
  },
  async setJSON(key: string, value: unknown): Promise<void> {
    await this.setString(key, JSON.stringify(value));
  },
};
