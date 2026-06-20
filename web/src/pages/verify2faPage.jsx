import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPendingTwoFactor,
  verifyTwoFactorCode,
  resendTwoFactorCode,
} from '../services/authService';
import { sessionService } from '../services/sessionService';
import { alertService } from '../utils/alertService';
import '../styles/style.css';

export function Verify2FAPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const pending = getPendingTwoFactor();
    if (!pending) {
      navigate('/');
      return;
    }

    setEmail(pending.email);
    setExpiresAt(pending.expiresAt);
  }, [navigate]);

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      // Step 2: After successful 2FA verification, register a session
      // row in the user_sessions table for the now-authenticated user.
      const pending = await verifyTwoFactorCode(code.trim());
      if (pending?.userId) {
        await sessionService.createSession(pending.userId);
      }
      navigate('/dashboard');
    } catch (err) {
      const message = err.message || 'Verification failed.';
      setError(message);
      await alertService.error(message, 'Verification Failed');
    }
  };

  const handleResend = async () => {
    setError('');

    try {
      const updated = resendTwoFactorCode();
      setExpiresAt(updated.expiresAt);
    } catch (err) {
      const message = err.message || 'Unable to resend code.';
      setError(message);
      await alertService.error(message, 'Resend Failed');
    }
  };

  return (
    <div>
      <main className="container">
        <section className="form-box">
          <h3>Two-Factor Verification</h3>
          <p>
            Enter the 6-digit OTP that is sent to <strong>{email}</strong>.
            {timeLeft && <span> Expires in {timeLeft}.</span>}
          </p>

          {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}

          <form onSubmit={handleSubmit}>
            <label>Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />

            <button type="submit" className="primary-btn verify-btn" title="Verify your two-factor code">
              Verify
            </button>
          </form>

          <div className="verify-actions">
            <button
              type="button"
              className="primary-btn verify-secondary-btn"
              onClick={handleResend}
              title="Resend verification code to your email"
            >
              Resend Code
            </button>
            <button
              type="button"
              className="primary-btn verify-secondary-btn"
              onClick={() => navigate('/')}
              title="Cancel and go back to login"
            >
              Cancel
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Verify2FAPage;
