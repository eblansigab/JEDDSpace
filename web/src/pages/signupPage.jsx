import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/JEDDSpace Logo (Transparent).png'
import { DEPARTMENT_OPTIONS, POSITION_OPTIONS, ROLE_OPTIONS } from '../constants/formOptions'
import { isUsernameAvailable, registerUser, validateUsername } from '../services/authService'
import { alertService } from '../utils/alertService'

const SignUp = () => {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('')
  const [position, setPosition] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    const normalizedUsername = username.trim().toLowerCase()

    if (!firstName || !lastName || !department || !role || !position || !email || !normalizedUsername || !password || !confirmPassword) {
      await alertService.warning('Please fill all fields')
      return
    }

    if (password.trim() !== confirmPassword.trim()) {
      await alertService.warning('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      validateUsername(normalizedUsername)

      const available = await isUsernameAvailable(normalizedUsername)
      if (!available) {
        await alertService.warning('Username is already taken.')
        return
      }

      await registerUser(
        email,
        password,
        confirmPassword,
        firstName,
        lastName,
        position,
        role,
        department,
        normalizedUsername
      )

      const successMessage =
        'Account created successfully.\n\nPlease check your email and click the verification link. ' +
        'An administrator must approve your account before you can access JEDDSpace.'

      await alertService.success(successMessage)

      setFirstName('')
      setLastName('')
      setDepartment('')
      setRole('')
      setPosition('')
      setEmail('')
      setUsername('')
      setPassword('')
      setConfirmPassword('')

      navigate('/', {replace: true})
    } catch (error) {
      await alertService.error(error.message || 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <h3>Sign Up / Register Employee</h3>

          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ width: '50%' }}>
              <label>First Name</label>
              <input type="text" placeholder="Enter First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div style={{ width: '50%' }}>
              <label>Last Name</label>
              <input type="text" placeholder="Enter Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ width: '50%' }}>
              <label>Department</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option disabled value="">Select Department</option>
                {DEPARTMENT_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div style={{ width: '50%' }}>
              <label>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option disabled value="">Select Role</option>
                {ROLE_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <label>Position</label>
          <select value={position} onChange={(e) => setPosition(e.target.value)}>
            <option disabled value="">Select Position</option>
            {POSITION_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <label>Email</label>
          <input type="email" placeholder="Enter Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label>Username</label>
          <input
            type="text"
            placeholder="letters, numbers, underscores"
            value={username}
            onChange={(e) => setUsername(e.target.value.trim().toLowerCase())}
          />
          <p style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
            Lowercase letters, numbers, and underscores only. No spaces.
          </p>

          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? "text" : "password"} placeholder="Enter Password" style={{ paddingRight: '40px' }} value={password} onChange={(e) => setPassword(e.target.value)} />
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

          <label>Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" style={{ paddingRight: '40px' }} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              title={showConfirmPassword ? 'Hide password' : 'Show password'}
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

          <button className="primary-btn" onClick={handleRegister} disabled={isSubmitting} title="Register new employee account">
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </section>
      </main>
    </div>
  )
}

export default SignUp
