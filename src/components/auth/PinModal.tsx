import React, { useState, useEffect, useRef } from 'react';
import { Lock, X, Loader2, ShieldCheck, Asterisk } from 'lucide-react';
import type { JudgeName } from '../../types';

interface PinModalProps {
  judgeName: JudgeName;
  onVerify: (pin: string) => Promise<boolean>;
  onClose: () => void;
}

const PinModal: React.FC<PinModalProps> = ({ judgeName, onVerify, onClose }) => {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length !== 6) return;

    setError(null);
    setIsLoading(true);
    try {
      await onVerify(pin);
    } catch (err: any) {
      setError(err.message);
      setPin(''); // 오류 시 초기화
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // 6자리가 입력되면 자동 제출
  useEffect(() => {
    if (pin.length === 6) {
      handleSubmit();
    }
  }, [pin]);

  return (
    <div className="modal-overlay fade-in" style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-card invite-card" style={{ 
        width: '100%', maxWidth: '400px', padding: '2.5rem', textAlign: 'center',
        position: 'relative', border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ 
            width: '60px', height: '60px', margin: '0 auto 1.2rem',
            background: 'rgba(124, 58, 237, 0.1)', borderRadius: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Lock size={28} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{judgeName} 심사위원</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>인증을 위한 6자리 PIN을 입력하세요.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            {/* 시각적 핀 표시 (마스킹) */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ 
                  width: '45px', height: '55px', borderBottom: `3px solid ${i < pin.length ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                  color: 'var(--primary)', fontWeight: 'bold', transition: 'all 0.2s'
                }}>
                  {i < pin.length ? <Asterisk size={20} /> : ''}
                </div>
              ))}
            </div>

            <input 
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              style={{ 
                position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'default'
              }}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="fade-in" style={{ 
              padding: '0.8rem', background: 'rgba(244, 63, 94, 0.1)', 
              borderRadius: '8px', color: '#fb7185', fontSize: '0.85rem', marginBottom: '1.5rem',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
            }}>
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="premium-button" 
            style={{ width: '100%', height: '50px' }}
            disabled={isLoading || pin.length !== 6}
          >
            {isLoading ? <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto' }} /> : '접속하기'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>
          <ShieldCheck size={14} />
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Security Protected</span>
        </div>
      </div>
    </div>
  );
};

export default PinModal;
