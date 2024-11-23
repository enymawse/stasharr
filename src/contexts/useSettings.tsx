import { createContext, useContext } from 'solid-js';
import { Config } from '../models/Config';

export type SettingsContextType = {
  store: Config;
  setStore: (key: keyof Config, value: unknown) => void;
};

export const SettingsContext = createContext<SettingsContextType>();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('SettingsContext not provided!');
  return context;
};
