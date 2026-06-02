import React, { useState } from 'react'
import logo from '../assets/JEDDSpace Logo (Transparent).png'


const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <div>
      <header>
        <a href="/dashboard">
          <img
            className="max-w-3xs"
            src={logo}
            alt="JEDDSpace Logo"
            style={{ width: '220px' }}
          />
        </a>
      </header>
      <main className="container">
        <section className="form-box">
          <h3>Sign Up</h3>

          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ width: '50%' }}>
              <label>First Name</label>
              <input type="text" placeholder="Enter First Name" />
            </div>
            <div style={{ width: '50%' }}>
              <label>Last Name</label>
              <input type="text" placeholder="Enter Last Name" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ width: '50%' }}>
              <label>Department</label>
              <select defaultValue="">
                <option disabled value="">Enter Department</option>
                <option value="engineering">Engineering Department</option>
                <option value="administration">Administrative Department</option>
              </select>
            </div>
            <div style={{ width: '50%' }}>
              <label>Role</label>
              <input type="text" placeholder="Enter Role" />
            </div>
          </div>

          <label>Email</label>
          <input type="email" placeholder="Enter Email Address" />

          <label>Username</label>
          <input type="text" placeholder="Enter Username" />

          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? "text" : "password"} placeholder="Enter Password" style={{ paddingRight: '40px' }} />
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

          <label>Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" style={{ paddingRight: '40px' }} />
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

          <button className="primary-btn">Register</button>
        </section>
      </main>
    </div>
  )
}

export default SignUp