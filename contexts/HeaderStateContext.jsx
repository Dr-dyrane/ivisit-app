import React, { createContext, useContext, useState, useCallback } from 'react';
import { DEFAULT_HEADER_STATE, normalizeHeaderState } from '../constants/header';

const HeaderStateContext = createContext(null);

export function HeaderStateProvider({ children }) {
  const [headerState, setHeaderStateInternal] = useState(DEFAULT_HEADER_STATE);

  const setHeaderState = useCallback((newState) => {
    setHeaderStateInternal((prev) => normalizeHeaderState({
      ...prev,
      ...newState,
    }));
  }, []);

  const resetHeaderState = useCallback(() => {
    setHeaderStateInternal(DEFAULT_HEADER_STATE);
  }, []);

  const value = React.useMemo(() => ({
    headerState,
    setHeaderState,
    resetHeaderState,
  }), [headerState, setHeaderState, resetHeaderState]);

  return (
    <HeaderStateContext.Provider value={value}>
      {children}
    </HeaderStateContext.Provider>
  );
}

export function useHeaderState() {
  const context = useContext(HeaderStateContext);
  if (!context) {
    throw new Error('useHeaderState must be used within HeaderStateProvider');
  }
  return context;
}

export default HeaderStateContext;
