import React, { useState, useEffect, useRef } from 'react';
import { Lock, X, Loader2, ShieldCheck } from 'lucide-react';

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

  const triggerShake = () => {
    setIsShake(true);
    setTimeout(() => setIsShake(false), 500);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
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
    } catch (err: any) {
      triggerShake();
      setError(err.message || '인증 중 오류가 발생했습니다.');
      setPin('');
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (pin.length === 6) {
      handleSubmit();
    }
  }, [pin]);

  return (
    <div className="modal-overlay" style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'radial-gradient(circle at center, rgba(30, 27, 75, 0.4) 0%, rgba(15, 23, 42, 0.95) 100%)',
      backdropFilter: 'blur(20px) saturate(120%)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
      padding: '1rem'
    }}>
      <div className={`glass-card-premium modal-entrance ${isShake ? 'shake' : ''}`} style={{ 
        width: '100%', maxWidth: '420px', padding: '3rem 2.5rem', textAlign: 'center',
        position: 'relative', borderRadius: '28px'
      }}>
        <button 
          onClick={onClose}
          style={{ 
            position: 'absolute', top: '1.5rem', right: '1.5rem', 
            background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', 
            cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <X size={20} />
        </button>

        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ 
            width: '70px', height: '70px', margin: '0 auto 1.5rem',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))', 
            borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Lock size={32} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.6rem', letterSpacing: '-0.5px' }}>{title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>인증을 위한 6자리 (또는 지정된) PIN을 입력하세요.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
          <div 
            onClick={() => inputRef.current?.focus()}
            style={{ cursor: 'text', marginBottom: '2rem' }}
          >
            {/* 시각적 핀 박스 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem' }}>
              {[...Array(6)].map((_, i) => {
                const isActive = i === pin.length;
                const isFilled = i < pin.length;
                
                return (
                  <div key={i} style={{ 
                    width: '50px', height: '65px', borderRadius: '14px',
                    border: `2px solid ${isActive ? 'var(--primary)' : (isFilled ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.08)')}`,
                    background: isActive ? 'rgba(99, 102, 241, 0.08)' : (isFilled ? 'rgba(99, 102, 241, 0.03)' : 'rgba(255, 255, 255, 0.02)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    boxShadow: isActive ? '0 0 20px var(--primary-glow)' : 'none',
                    transform: isFilled ? 'scale(1.05)' : 'scale(1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {isFilled ? (
                      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }} />
                      </div>
                    ) : (
                      isActive && <div className="cursor-blink" style={{ width: '2px', height: '24px', backgroundColor: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }} />
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
              style={{ 
                position: 'absolute', opacity: 0, width: '1px', height: '1px'
              }}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="shake" style={{ 
              padding: '0.8rem', background: 'rgba(244, 63, 94, 0.08)', 
              borderRadius: '12px', color: '#fb7185', fontSize: '0.85rem', marginBottom: '2rem',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
              border: '1px solid rgba(244, 63, 94, 0.1)'
            }}>
              <span>{error}</span>
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

        <div style={{ 
          marginTop: '2.5rem', padding: '1rem', borderRadius: '16px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', 
          color: 'rgba(255,255,255,0.25)' 
        }}>
          <ShieldCheck size={16} />
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 }}>Security Protected</span>
        </div>
      </div>
    </div>
  );
};

export default PinModal;
