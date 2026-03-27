import React, { useState } from 'react';
import { Lock, Mail, Loader2, Star, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, pass: string) => Promise<void>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setError(null);
    setIsLoading(true);
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container fade-in" style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, rgba(124, 58, 237, 0.1), transparent), radial-gradient(circle at bottom left, rgba(56, 189, 248, 0.15), transparent)',
      padding: '1rem'
    }}>
      <div className="glass-card login-card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '3rem',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ 
            width: '64px', height: '64px', margin: '0 auto 1.5rem',
            background: 'rgba(124, 58, 237, 0.1)', borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldCheck size={32} color="var(--primary)" />
          </div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', fontWeight: 700 }}>심사위원 인증</h1>
          <p style={{ color: 'var(--text-muted)' }}>심사를 시작하려면 로그인해 주세요.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>이메일 주소</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input 
                type="email"
                className="premium-input"
                style={{ width: '100%', paddingLeft: '3rem' }}
                placeholder="example@audition.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>비밀번호</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input 
                type="password"
                className="premium-input"
                style={{ width: '100%', paddingLeft: '3rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="fade-in" style={{ 
              padding: '1rem', background: 'rgba(244, 63, 94, 0.1)', 
              border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '12px',
              color: '#fb7185', fontSize: '0.9rem', marginBottom: '1.5rem',
              display: 'flex', alignItems: 'flex-start', gap: '0.7rem'
            }}>
              <span>⚠️ {error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="premium-button" 
            style={{ width: '100%', height: '52px', fontSize: '1.1rem' }}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} /> : '인증 및 접속하기'}
          </button>
        </form>

        <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Star size={16} color="#fbbf24" fill="#fbbf24" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Audition Master Security System</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
