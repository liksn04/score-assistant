/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ToastPayload } from '../types';
import { toastReducer } from './toastReducer.ts';

interface ToastContextValue {
  showToast: (payload: ToastPayload) => string;
  updateToast: (id: string, patch: Partial<ToastPayload>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const createToastId = () =>
  globalThis.crypto?.randomUUID?.() ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getToastDuration = (payload: ToastPayload) => {
  if (payload.kind === 'loading') {
    return 0;
  }

  return payload.durationMs ?? 3500;
};

const ToastViewport: React.FC<{
  items: ReturnType<typeof toastReducer>['items'];
  onDismiss: (id: string) => void;
}> = ({ items, onDismiss }) => (
  <div className="toast-viewport" aria-live="polite" aria-atomic="true">
    {items.map((toast) => (
      <div key={toast.id} className={`toast-card toast-card--${toast.kind}`}>
        <div className="toast-card__content">
          <strong>{toast.title}</strong>
          {toast.message ? <p>{toast.message}</p> : null}
        </div>
        <button type="button" className="toast-card__close" onClick={() => onDismiss(toast.id)} aria-label="토스트 닫기">
          닫기
        </button>
      </div>
    ))}
  </div>
);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(toastReducer, { items: [] });

  useEffect(() => {
    const timers = state.items
      .map((toast) => {
        const duration = getToastDuration(toast);
        if (duration === 0) {
          return null;
        }

        return window.setTimeout(() => {
          dispatch({ type: 'remove', id: toast.id });
        }, duration);
      })
      .filter((timer): timer is number => timer !== null);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [state.items]);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast: (payload) => {
        const id = payload.id ?? createToastId();
        dispatch({
          type: 'enqueue',
          toast: {
            ...payload,
            id,
            createdAt: Date.now(),
          },
        });
        return id;
      },
      updateToast: (id, patch) => {
        dispatch({ type: 'update', id, patch });
      },
      dismissToast: (id) => {
        dispatch({ type: 'remove', id });
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={state.items} onDismiss={value.dismissToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast는 ToastProvider 내부에서만 사용할 수 있습니다.');
  }

  return context;
};
