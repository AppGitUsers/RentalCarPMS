import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as settingsApi from '../api/settings';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await settingsApi.getSettings();
      setSettings(data);
    } catch {
      // settings unavailable until authenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setLoading(false);
    }
  }, [user, refresh]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
