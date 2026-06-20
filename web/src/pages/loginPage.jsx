import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  beginTwoFactorSignIn,
  isTwoFactorEnabled,
  loginUser,
} from '../services/authService';
import { sessionService } from '../services/sessionService';
import { alertService } from '../utils/alertService';
import logo from '../assets/JEDDSpace Logo (Transparent).png';
import '../styles/style.css'


export function LoginPage() {
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const BYPASS_2FA_FOR_DEMO = true;

      if (isTwoFactorEnabled && !BYPASS_2FA_FOR_DEMO) {
        const result = await beginTwoFactorSignIn(email, password);
        if (result?.code) {
          navigate('/verify-2fa');
          return;
        }
      } else {
        // Sign in then register session row in user_sessions table
        const data = await loginUser(email, password);
        const userId = data?.user?.id;

        if (userId) {
          await sessionService.createSession(userId);
        }
      }
      navigate('/dashboard');
    } catch (err) {
      const message = err?.message || 'An error happened, please try again...';
      setError(message);
      await alertService.error(message, 'Authentication Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <main className="container">
        <section className="form-box">
          <img src={logo} alt="JEDDSpace" className="login-box-logo" />
          <h3>Log In</h3>

          {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}

          <form onSubmit={handleSubmit}>
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '40px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: 'calc(50% + 2px)',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10
                }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>

            <div className="options">
              <label>
                <input type="checkbox" /> Remember me
              </label>
              <a href="/forgot-password">Forgot Password?</a>
            </div>

            <button type="submit" className="primary-btn" disabled={isSubmitting} title="Log in to JEDDSpace">
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
export default LoginPage;
