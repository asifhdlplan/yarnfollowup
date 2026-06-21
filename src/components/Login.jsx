import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'Invalid username or password.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to the authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      padding: '1.5rem',
      fontFamily: 'Outfit, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Dynamic Glowing Background Orbs */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'rgba(16, 185, 129, 0.15)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        top: '10%',
        left: '15%',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'rgba(59, 130, 246, 0.12)',
        borderRadius: '50%',
        filter: 'blur(100px)',
        bottom: '10%',
        right: '15%',
        zIndex: 0
      }}></div>

      {/* Login Card */}
      <div className="login-card" style={{
        background: 'rgba(30, 41, 59, 0.45)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '420px',
        padding: '3rem 2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        zIndex: 1,
        textAlign: 'center'
      }}>
        {/* Logo Section */}
        <div style={{ 
          marginBottom: '2rem', 
          display: 'flex', 
          justifyContent: 'center',
          background: '#ffffff',
          padding: '0.85rem 1.25rem',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 15px rgba(16, 185, 129, 0.1)'
        }}>
          <img src="/logo.png" alt="Ha-meem Denim Ltd." style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain' }} />
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textAlign: 'left',
            color: '#fca5a5',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Username Input */}
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username..."
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 2.75rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary-color)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.07)';
                  e.target.style.boxShadow = 'none';
                }}
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          {/* Password Input */}
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password..."
                style={{
                  width: '100%',
                  padding: '0.85rem 2.75rem 0.85rem 2.75rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary-color)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.07)';
                  e.target.style.boxShadow = 'none';
                }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              padding: '0.9rem',
              borderRadius: '12px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              transition: 'all 0.2s ease',
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.opacity = '0.9';
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = '1';
              e.target.style.transform = 'none';
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
          Created by{' '}
          <a
            href="https://www.facebook.com/asif.j30"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontWeight: 700,
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              borderBottom: '2px dashed rgba(16, 185, 129, 0.4)',
              paddingBottom: '2px',
              transition: 'all 0.3s ease',
              display: 'inline-block'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderBottomStyle = 'solid';
              e.target.style.borderBottomColor = '#3b82f6';
              e.target.style.filter = 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderBottomStyle = 'dashed';
              e.target.style.borderBottomColor = 'rgba(16, 185, 129, 0.4)';
              e.target.style.filter = 'none';
            }}
          >
            Asif
          </a>
        </p>

        <p style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: '#475569', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
          Confidential internal corporate application. Unauthorized access is strictly prohibited.
        </p>
      </div>
    </div>
  );
}
