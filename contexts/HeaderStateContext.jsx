import React, { createContext, useContext, useState, useCallback } from 'react';

const HeaderStateContext = createContext(null);

export function HeaderStateProvider({ children }) {
  const [headerState, setHeaderStateInternal] = useState({
    title: '',
    subtitle: '',
    icon: null,
    backgroundColor: '#86100E',
    badge: null,
    leftComponent: null,
    rightComponent: null,
  });

  const setHeaderState = useCallback((newState) => {
    setHeaderStateInternal((prev) => ({
      ...prev,
      ...newState,
    }));
  }, []);

  const resetHeaderState = useCallback(() => {
    setHeaderStateInternal({
      title: '',
      subtitle: '',
      icon: null,
      backgroundColor: '#86100E',
      badge: null,
      leftComponent: null,
      rightComponent: null,
    });
  }, []);

  const value = {
    headerState,
    setHeaderState,
    resetHeaderState,
  };

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
