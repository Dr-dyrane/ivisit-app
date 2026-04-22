import React, { createContext, useContext, useState, useCallback } from 'react';
import { DEFAULT_HEADER_STATE, normalizeHeaderState } from '../constants/header';

const HeaderStateContext = createContext(null);

function getComponentName(type) {
  if (typeof type === 'string') return type;
  return type?.displayName || type?.name || 'Component';
}

function stableHeaderStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (key, currentValue) => {
    if (typeof currentValue === 'function') return '[Function]';
    if (typeof currentValue === 'symbol') return String(currentValue);
    if (!currentValue || typeof currentValue !== 'object') return currentValue;
    if (React.isValidElement(currentValue)) {
      return {
        elementType: getComponentName(currentValue.type),
        key: currentValue.key || null,
        props: currentValue.props || {},
      };
    }
    if (key === '_owner' || key === '_store' || key === 'ref') {
      return undefined;
    }
    if (seen.has(currentValue)) return '[Circular]';
    seen.add(currentValue);
    return currentValue;
  });
}

function areHeaderStatesEquivalent(a, b) {
  if (a === b) return true;
  return stableHeaderStringify(a) === stableHeaderStringify(b);
}

export function HeaderStateProvider({ children }) {
  const [headerState, setHeaderStateInternal] = useState(DEFAULT_HEADER_STATE);

  const setHeaderState = useCallback((newState) => {
    setHeaderStateInternal((prev) => {
      const next = normalizeHeaderState({
        ...prev,
        ...newState,
      });
      return areHeaderStatesEquivalent(prev, next) ? prev : next;
    });
  }, []);

  const resetHeaderState = useCallback(() => {
    setHeaderStateInternal((prev) =>
      areHeaderStatesEquivalent(prev, DEFAULT_HEADER_STATE)
        ? prev
        : DEFAULT_HEADER_STATE,
    );
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
