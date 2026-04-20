/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ModalPortal from '../components/common/ModalPortal';

interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger';
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  open: boolean;
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

const INITIAL_STATE: ConfirmDialogState = {
  open: false,
  title: '',
  description: '',
  confirmText: '확인',
  cancelText: '취소',
  tone: 'default',
};

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>(INITIAL_STATE);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const closeDialog = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialogState(INITIAL_STATE);
  }, []);

  const value = useMemo<ConfirmDialogContextValue>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          resolverRef.current = resolve;
          setDialogState({
            open: true,
            title: options.title,
            description: options.description,
            confirmText: options.confirmText ?? '확인',
            cancelText: options.cancelText ?? '취소',
            tone: options.tone ?? 'default',
          });
        }),
    }),
    [],
  );

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {dialogState.open ? (
        <ModalPortal>
          <div className="modal-overlay-shell fade-in">
            <div className="modal-surface modal-entrance" style={{ maxWidth: '480px' }}>
              <div className="modal-content">
                <div className="modal-header-row">
                  <div className="modal-header-copy">
                    <span className="modal-kicker">확인</span>
                    <h2>{dialogState.title}</h2>
                    <p>{dialogState.description}</p>
                  </div>
                </div>
                <div className="modal-action-bar" style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="premium-button secondary-btn" onClick={() => closeDialog(false)}>
                    {dialogState.cancelText}
                  </button>
                  <button
                    type="button"
                    className={`premium-button ${dialogState.tone === 'danger' ? 'danger-btn' : ''}`}
                    onClick={() => closeDialog(true)}
                  >
                    {dialogState.confirmText}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </ConfirmDialogContext.Provider>
  );
};

export const useConfirmDialog = () => {
  const context = useContext(ConfirmDialogContext);

  if (!context) {
    throw new Error('useConfirmDialog는 ConfirmDialogProvider 내부에서만 사용할 수 있습니다.');
  }

  return context;
};
