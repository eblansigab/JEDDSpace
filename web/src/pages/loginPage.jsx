import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  beginTwoFactorSignIn,
  isTwoFactorEnabled,
  loginUser,
} from '../services/authService';
import { sessionService } from '../services/sessionService';
import { alertService } from '../utils/alertService';
import { useAuth } from '../services/authContext';
import logo from '../assets/JEDDSpace Logo (Transparent).png';
import '../styles/style.css'


export function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, profile } = useAuth()

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      const status = String(profile.registration_status || '').toLowerCase()
      if (status === 'pending' || status === 'rejected') {
        navigate('/awaiting-approval')
      } else {
        navigate('/dashboard')
      }
    }
  }, [loading, user, profile, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        await registerUser(
          email,
          password,
          confirmPassword,
          firstName,
          lastName,
          role,
          department
        );
        await alertService.success('Registration successful! Please log in.');
        setIsRegistering(false);
      } else {
        if (isTwoFactorEnabled) {
          const result = await beginTwoFactorSignIn(email, password);
          if (result?.code) {
            navigate('/verify-2fa');
            return;
          }
        } else {
          const data = await loginUser(email, password);
          const userId = data?.user?.id;

          if (userId) {
            await sessionService.createSession(userId);
          }
        }
        navigate('/dashboard');
      }
    } catch (err) {
      const message = err?.message || 'An error happened, please try again...';
      setError(message);
      await alertService.error(message, 'Authentication Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container"><div className="form-box">Loading...</div></div>
  }

  if (user) {
    return null
  }

  return (
    <div>
      <main className="container">
        <section className="form-box">
          <img src={logo} alt="JEDDSpace" className="login-box-logo" />
          <h3>{isRegistering ? 'Register Account' : 'Log In'}</h3>

          <p>
            {isRegistering ? 'Already have an account? ' : "If you don't have an account registered you can register "}
            <button
              type="button"
              className="signup"
              style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            >
              here!
            </button>
          </p>

          {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}

          <form onSubmit={handleSubmit}>
            {!isRegistering ? (
              <>
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </>
            ) : (
              <>
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </>
            )}

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
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.18 18.18 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
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

            {isRegistering && (
              <>
                <label>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ paddingRight: '40px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.18 18.18 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
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

                <label>First Name</label>
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />

                <label>Last Name</label>
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />

                <label>Role</label>
                <input
                  type="text"
                  placeholder="Job Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                />

                <label>Department</label>
                <input
                  type="text"
                  placeholder="Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                />
              </>
            )}

            {!isRegistering && (
              <div className="options">
                <label>
                  <input type="checkbox" /> Remember me
                </label>
                <a href="/forgot-password">Forgot Password?</a>
              </div>
            )}

            <button type="submit" className="primary-btn" disabled={isSubmitting} title="Log in to JEDDSpace">
              {isSubmitting ? (isRegistering ? 'Registering...' : 'Logging in...') : (isRegistering ? 'Register' : 'Login')}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
export default LoginPage;
