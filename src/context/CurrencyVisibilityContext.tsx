import React, { createContext, useContext, useState, useEffect } from 'react';
import { formatCurrency as baseFormatCurrency } from '../utils/formatters';

const STORAGE_KEY = 'finanzo_hide_values';

interface CurrencyVisibilityContextType {
  hideValues: boolean;
  toggleHideValues: () => void;
  formatMoney: (value: number) => string;
}

const CurrencyVisibilityContext = createContext<CurrencyVisibilityContextType>({
  hideValues: false,
  toggleHideValues: () => {},
  formatMoney: (val: number) => baseFormatCurrency(val),
});

export const CurrencyVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hideValues, setHideValues] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, hideValues ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [hideValues]);

  const toggleHideValues = () => setHideValues((prev) => !prev);

  const formatMoney = (value: number) => {
    if (hideValues) {
      return 'R$ •••••';
    }
    return baseFormatCurrency(value);
  };

  return (
    <CurrencyVisibilityContext.Provider value={{ hideValues, toggleHideValues, formatMoney }}>
      {children}
    </CurrencyVisibilityContext.Provider>
  );
};

export const useCurrencyVisibility = () => useContext(CurrencyVisibilityContext);
