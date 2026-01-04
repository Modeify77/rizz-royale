import { useEffect, useRef, useCallback } from 'react';

export interface KeyState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  ArrowUp: boolean;
  ArrowDown: boolean;
  ArrowLeft: boolean;
  ArrowRight: boolean;
  e: boolean;
  q: boolean;
  Escape: boolean;
}

const initialKeyState: KeyState = {
  w: false,
  a: false,
  s: false,
  d: false,
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  e: false,
  q: false,
  Escape: false,
};

interface UseKeyboardOptions {
  enabled?: boolean;
  onInteract?: () => void;
  onEscape?: () => void;
}

export function useKeyboard(options: UseKeyboardOptions = {}) {
  const { enabled = true, onInteract, onEscape } = options;
  const keysRef = useRef<KeyState>({ ...initialKeyState });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key as keyof KeyState;
    if (key in keysRef.current) {
      // Trigger callbacks on key down (not repeat)
      if (!keysRef.current[key]) {
        if (key === 'e' && onInteract) onInteract();
        if (key === 'Escape' && onEscape) onEscape();
      }
      keysRef.current[key] = true;
    }
  }, [onInteract, onEscape]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key as keyof KeyState;
    if (key in keysRef.current) {
      keysRef.current[key] = false;
    }
  }, []);

  const resetKeys = useCallback(() => {
    keysRef.current = { ...initialKeyState };
  }, []);

  useEffect(() => {
    if (!enabled) {
      resetKeys();
      return;
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', resetKeys);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', resetKeys);
    };
  }, [enabled, handleKeyDown, handleKeyUp, resetKeys]);

  const getMovementDirection = useCallback(() => {
    const keys = keysRef.current;
    return {
      up: keys.w || keys.ArrowUp,
      down: keys.s || keys.ArrowDown,
      left: keys.a || keys.ArrowLeft,
      right: keys.d || keys.ArrowRight,
    };
  }, []);

  const isKeyPressed = useCallback((key: keyof KeyState) => {
    return keysRef.current[key];
  }, []);

  return {
    keys: keysRef.current,
    getMovementDirection,
    isKeyPressed,
    resetKeys,
  };
}
