  import React, { useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import {
    loginUser,
    registerUser,
    beginTwoFactorSignIn,
    isTwoFactorEnabled,
  } from '../services/authService';
  import { sessionService } from '../services/sessionService';
  import { supabaseClient } from '../supabase/supabaseClient';
  import { alertService } from '../utils/alertService';
  import logo from '../assets/JEDDSpace Logo (Transparent).png';
  import { DEPARTMENT_OPTIONS, POSITION_OPTIONS, ROLE_OPTIONS } from '../constants/formOptions';
  import '../styles/style.css'


  export function LoginPage() {
      console.log("LOGIN ROUTES LOADED")
    const navigate = useNavigate();

    // Toggle state between Login and Register views
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State Fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [position, setPosition] = useState('');
    const [role, setRole] = useState('');
    const [department, setDepartment] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Fixed: Added 'async' keyword here
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
            position,
            role,
            department
          );
          await alertService.success('Registration successful! Please log in.');
          setIsRegistering(false); // Flip back to login panelf
        } else {
          if (isTwoFactorEnabled) {
            const result = await beginTwoFactorSignIn(email, password);
            if (result?.code) {
              await alertService.verificationCode(result.code);
              navigate('/verify-2fa');
              return;
            }
          } else {
            // Step 2: Sign in the user, then immediately register a session
            // row in the user_sessions table with device + IP info.
            const data = await loginUser(email, password);
            const userId = data?.user?.id

            if (userId) {
              await sessionService.createSession(userId)
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

<<<<<<< HEAD
    return (
      <div>
        <main className="container">
          <section className="form-box">
            <img src={logo} alt="JEDDSpace" className="login-box-logo" />
            <h3>{isRegistering ? 'Register Account' : 'Log In'}</h3>
=======
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
              style={{ background: 'none', border: 'none', color: 'skyblue', cursor: 'pointer', textDecoration: 'underline', padding: 'none', }}
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            >
              {isRegistering ? 'here' : 'here'}!
            </button>
          </p>
>>>>>>> 5066b306d9802d5661df02e2b2801f3d9b258eca

            <p>
              {isRegistering ? 'Already have an account? ' : "If you don't have an account registered you can register "}
              <button
                type="button"
                className="signup"
                style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
              >
                {isRegistering ? 'here' : 'here'}!
              </button>
            </p>

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

                  <label>Position</label>
                  <select value={position} onChange={(e) => setPosition(e.target.value)} required>
                    <option value="" disabled>Select position</option>
                    {POSITION_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>

                  <label>Department</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} required>
                    <option value="" disabled>Select department</option>
                    {DEPARTMENT_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>

                  <label>Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} required>
                    <option value="" disabled>Select role</option>
                    {ROLE_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
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

              <button type="submit" className="primary-btn" disabled={isSubmitting}>
                {isRegistering ? (isSubmitting ? 'Registering...' : 'Register') : (isSubmitting ? 'Logging in...' : 'Login')}
              </button>
            </form>
          </section>
        </main>
      </div>
    );
  }
  export default LoginPage;
