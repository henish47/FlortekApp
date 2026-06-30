import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Create a safe memory-backed storage fallback for SSR/Node environment
class SafeStorage {
  memoryStorage = {};

  async getItem(key) {
    if (typeof window === 'undefined') {
      return this.memoryStorage[key] || null;
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      return this.memoryStorage[key] || null;
    }
  }

  async setItem(key, value) {
    if (typeof window === 'undefined') {
      this.memoryStorage[key] = value;
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      this.memoryStorage[key] = value;
    }
  }

  async removeItem(key) {
    if (typeof window === 'undefined') {
      delete this.memoryStorage[key];
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      delete this.memoryStorage[key];
    }
  }
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: new SafeStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);