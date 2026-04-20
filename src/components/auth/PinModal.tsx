import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, X, Loader2, ShieldCheck } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';

interface PinModalProps {
  title: string;
  onVerify: (pin: string) => Promise<boolean>;
  onClose: () => void;
}

const PinModal: React.FC<PinModalProps> = ({ title, onVerify, onClose }) => {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShake, setIsShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const triggerShake = useCallback(() => {
    setIsShake(true);
    setTimeout(() => setIsShake(false), 500);
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length !== 6) return;

    setError(null);
    setIsLoading(true);
    try {
      const success = await onVerify(pin);
      if (!success) {
        triggerShake();
        setError('PIN 번호가 일치하지 않습니다.');
        setPin('');
      }
    } catch (err) {
      triggerShake();
      setError(err instanceof Error ? err.message : '인증 중 오류가 발생했습니다.');
      setPin('');
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [onVerify, pin, triggerShake]);

  useEffect(() => {
    if (pin.length === 6) {
      void handleSubmit();
    }
  }, [handleSubmit, pin]);

  return (
    <ModalPortal>
      <div className="modal-overlay-shell">
        <div
          className={`modal-surface modal-entrance ${isShake ? 'shake' : ''}`}
          style={{ maxWidth: '440px' }}
        >
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="PIN 인증 모달 닫기"
          >
            <X size={20} />
          </button>

          <div className="modal-content" style={{ padding: '2.6rem 2rem 2rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                width: '72px',
                height: '72px',
                margin: '0 auto 1.2rem',
                borderRadius: '22px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.12))',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 0 24px rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lock size={32} color="var(--primary)" />
              </div>
              <span className="modal-kicker">
                <ShieldCheck size={14} />
                보안 인증
              </span>
              <h2 style={{ fontSize: '1.75rem', margin: '0.9rem 0 0.55rem', letterSpacing: '-0.5px' }}>{title}</h2>
            </div>

            <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
              <div
                onClick={() => inputRef.current?.focus()}
                style={{ cursor: 'text', marginBottom: '1.5rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.7rem' }}>
                  {[...Array(6)].map((_, index) => {
                    const isActive = index === pin.length;
                    const isFilled = index < pin.length;

                    return (
                      <div
                        key={index}
                        style={{
                          width: '48px',
                          height: '62px',
                          borderRadius: '14px',
                          border: `2px solid ${
                            isActive
                              ? 'var(--primary)'
                              : isFilled
                                ? 'rgba(99, 102, 241, 0.34)'
                                : 'rgba(255, 255, 255, 0.1)'
                          }`,
                          background: isActive
                            ? 'rgba(99, 102, 241, 0.12)'
                            : isFilled
                              ? 'rgba(99, 102, 241, 0.08)'
                              : 'rgba(15, 23, 42, 0.92)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          boxShadow: isActive ? '0 0 20px var(--primary-glow)' : 'none',
                          transform: isFilled ? 'scale(1.03)' : 'scale(1)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {isFilled ? (
                          <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }} />
                          </div>
                        ) : (
                          isActive && <div className="cursor-blink" style={{ boxShadow: '0 0 8px var(--primary)' }} />
                        )}
                      </div>
                    );
                  })}
                </div>

                <input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px' }}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div
                  className="shake"
                  style={{
                    padding: '0.85rem',
                    background: 'rgba(244, 63, 94, 0.1)',
                    borderRadius: '12px',
                    color: '#fb7185',
                    fontSize: '0.86rem',
                    marginBottom: '1.5rem',
                    border: '1px solid rgba(244, 63, 94, 0.16)'
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="premium-button"
                style={{ width: '100%', height: '56px', borderRadius: '16px', fontSize: '1rem' }}
                disabled={isLoading || pin.length !== 6}
              >
                {isLoading ? <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} /> : '접속하기'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default PinModal;
