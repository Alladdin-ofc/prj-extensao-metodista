import { useEffect, useRef } from 'react';

// Invalidate asynchronous UI work when its account, privilege or editor changes.
export const useSessionScope = (uid, allowed = true) => {
  const key = `${uid || ''}:${allowed}`;
  const scope = useRef({ key, generation: 0, active: true });
  if (scope.current.key !== key) {
    scope.current.key = key;
    scope.current.generation += 1;
  }
  useEffect(() => {
    scope.current.active = true;
    return () => { scope.current.active = false; scope.current.generation += 1; };
  }, []);
  return {
    capture: () => ({ key, generation: scope.current.generation }),
    invalidate: () => { scope.current.generation += 1; },
    isCurrent: (token) => !!uid && allowed && scope.current.active && token?.key === scope.current.key && token.generation === scope.current.generation
  };
};
