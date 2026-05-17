import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../services/authService';
import '../styles/style.css'

export function LoginPage() {
  const navigate = useNavigate();

  // Toggle state between Login and Register views
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  // Form State Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');

  // Fixed: Added 'async' keyword here
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegistering) {
        await registerUser(
          email,
          password,
          confirmPassword,
          firstName,
          lastName,
          position,
          department
        );
        alert('Registration successful! Please log in.');
        setIsRegistering(false); // Flip back to login panel
      } else {
        await loginUser(email, password);
        navigate('/dashboard'); // Step 4 requirement met
      }
    } catch (err) {
      setError(err.message || 'An error happened, please try again...');
    }
  };



  return (
    <div>
      <main className="container">
        <section className="form-box">
          <h3>{isRegistering ? 'Register Account' : 'Log In'}</h3>
          
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

          {/* Wrap form elements inside an actual form tag */}
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
            <input 
              type="password" 
              placeholder="Enter Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />

            {/* Render extra profile details dynamically if registering */}
            {isRegistering && (
              <>
                <label>Confirm Password</label>
                <input 
                  type="password" 
                  placeholder="Confirm Password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                />

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
                <input 
                  type="text" 
                  placeholder="Job Position" 
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
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

            <button type="submit" className="primary-btn">
              {isRegistering ? 'Register' : 'Login'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
export default LoginPage;