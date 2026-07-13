import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/JEDDSpace Logo (Transparent).png'
import { DEPARTMENT_OPTIONS, POSITION_OPTIONS } from '../constants/formOptions'
import { isUsernameAvailable, registerUser, resendVerficationEmail } from '../services/authService'
import { alertService } from '../utils/alertService'
import Button from '../components/Button'

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[]{};':"\\|,.<>\/?]).{8,}$/

const getFieldError = (field, value, form) => {
  switch (field) {
    case 'username':
      if (!value.trim()) return 'Username is required.'
      if (!USERNAME_PATTERN.test(value)) return 'Username must be 3–30 characters: letters, numbers, and underscores only.'
      return null
    case 'email':
      if (!value.trim()) return 'Email is required.'
      if (!EMAIL_PATTERN.test(value)) return 'Please enter a valid email address.'
      return null
    case 'password':
      if (!value) return 'Password is required.'
      if (!PASSWORD_PATTERN.test(value)) return 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.'
      return null
    case 'confirmPassword':
      if (!value) return 'Please confirm your password.'
      if (value !== form.password) return 'Passwords do not match.'
      return null
    case 'firstName':
      if (!value.trim()) return 'First name is required.'
      return null
    case 'lastName':
      if (!value.trim()) return 'Last name is required.'
      return null
    case 'department':
      if (!value) return 'Department is required.'
      return null
    case 'position':
      if (!value) return 'Position is required.'
      return null
    default:
      return null
  }
}

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [usernameStatus, setUsernameStatus] = useState('') // 'checking' | 'available' | 'taken' | ''
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const checkUsername = useCallback(async (val) => {
    const trimmed = val.trim().toLowerCase()
    if (!USERNAME_PATTERN.test(trimmed)) {
      setUsernameStatus('')
      return
    }
    setUsernameStatus('checking')
    try {
      const available = await isUsernameAvailable(trimmed)
      setUsernameStatus(available ? 'available' : 'taken')
    } catch {
      setUsernameStatus('')
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (touched.username) checkUsername(username)
    }, 600)
    return () => clearTimeout(timer)
  }, [username, touched.username, checkUsername])

  const validateAll = () => {
    const form = { firstName, lastName, department, position, email, username, password, confirmPassword }
    const newErrors = {}
    const fields = ['username', 'email', 'password', 'confirmPassword', 'firstName', 'lastName', 'department', 'position']
    fields.forEach((field) => {
      const error = getFieldError(field, form[field], form)
      if (error) newErrors[field] = error
    })
    setErrors(newErrors)
    setTouched({ username: true, email: true, password: true, confirmPassword: true, firstName: true, lastName: true, department: true, position: true })
    return Object.keys(newErrors).length === 0
  }

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const form = { firstName, lastName, department, position, email, username, password, confirmPassword }
    const error = getFieldError(field, form[field], form)
    setErrors((prev) => ({ ...prev, [field]: error }))
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!validateAll()) return

    const normalizedUsername = username.trim().toLowerCase()
    const available = await isUsernameAvailable(normalizedUsername)
    if (!available) {
      setErrors((prev) => ({ ...prev, username: 'Username is already taken.' }))
      setTouched((prev) => ({ ...prev, username: true }))
      return
    }

    setIsSubmitting(true)
    try {
      await registerUser(
        email.trim(),
        password,
        confirmPassword,
        firstName.trim(),
        lastName.trim(),
        position,
        '', // role defaults to employee
        department,
        normalizedUsername
      )

      setRegisteredEmail(email.trim())
      setIsSuccess(true)
      setFirstName('')
      setLastName('')
      setDepartment('')
      setPosition('')
      setEmail('')
      setUsername('')
      setPassword('')
      setConfirmPassword('')
      setErrors({})
      setTouched({})
      setUsernameStatus('')
    } catch (error) {
      await alertService.error(error.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendVerification = async () => {
    try {
      await resendVerficationEmail()
      await alertService.success('Verification email sent. Please check your inbox.')
    } catch (error) {
      await alertService.error(error.message || 'Unable to resend verification email.')
    }
  }

  const renderFieldError = (field) => {
    if (!touched[field] || !errors[field]) return null
    return <p style={{ color: '#dc2626', fontSize: 13, marginTop: 4 }}>{errors[field]}</p>
  }

  if (isSuccess) {
    return (
      <div>
        <header>
          <Link to="/">
            <img className="max-w-3xs" src={logo} alt="JEDDSpace Logo" style={{ width: '220px' }} />
          </Link>
        </header>
        <main className="container">
          <section className="form-box" style={{ textAlign: 'center', maxWidth: '520px' }}>
            <h3 style={{ marginBottom: 12 }}>Registration Successful</h3>
            <p style={{ marginBottom: 12 }}>
              A verification email has been sent to:<br />
              <strong>{registeredEmail}</strong>
            </p>
            <p style={{ marginBottom: 12 }}>
              Please verify your email before logging in.
            </p>
            <p style={{ marginBottom: 24, color: '#64748b' }}>
              Your account will remain pending until approved by an administrator.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <Button variant="outline" onClick={handleResendVerification} title="Resend verification email">
                Resend Verification Email
              </Button>
              <Link to="/" className="primary-btn" style={{ padding: '8px 16px', textDecoration: 'none', borderRadius: 6 }}>
                Return to Login
              </Link>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div>
      <header>
        <Link to="/">
          <img className="max-w-3xs" src={logo} alt="JEDDSpace Logo" style={{ width: '220px' }} />
        </Link>
      </header>
      <main className="container">
        <section className="form-box">
          <h3>Sign Up / Register Employee</h3>

          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ width: '50%' }}>
              <label>First Name</label>
              <input
                type="text"
                placeholder="Enter First Name"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); handleBlur('firstName') }}
                onBlur={() => handleBlur('firstName')}
                style={errors.firstName && touched.firstName ? { border: '1px solid #dc2626' } : undefined}
              />
              {renderFieldError('firstName')}
            </div>
            <div style={{ width: '50%' }}>
              <label>Last Name</label>
              <input
                type="text"
                placeholder="Enter Last Name"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); handleBlur('lastName') }}
                onBlur={() => handleBlur('lastName')}
                style={errors.lastName && touched.lastName ? { border: '1px solid #dc2626' } : undefined}
              />
              {renderFieldError('lastName')}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ width: '50%' }}>
              <label>Department</label>
              <select
                value={department}
                onChange={(e) => { setDepartment(e.target.value); handleBlur('department') }}
                onBlur={() => handleBlur('department')}
                style={errors.department && touched.department ? { border: '1px solid #dc2626' } : undefined}
              >
                <option disabled value="">Select Department</option>
                {DEPARTMENT_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              {renderFieldError('department')}
            </div>
            <div style={{ width: '50%' }}>
              <label>Position</label>
              <select
                value={position}
                onChange={(e) => { setPosition(e.target.value); handleBlur('position') }}
                onBlur={() => handleBlur('position')}
                style={errors.position && touched.position ? { border: '1px solid #dc2626' } : undefined}
              >
                <option disabled value="">Select Position</option>
                {POSITION_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              {renderFieldError('position')}
            </div>
          </div>

          <label>Email</label>
          <input
            type="email"
            placeholder="Enter Email Address"
            value={email}
            onChange={(e) => { setEmail(e.target.value); handleBlur('email') }}
            onBlur={() => handleBlur('email')}
            style={errors.email && touched.email ? { border: '1px solid #dc2626' } : undefined}
          />
          {renderFieldError('email')}

          <label>Username</label>
          <input
            type="text"
            placeholder="letters, numbers, underscores"
            value={username}
            onChange={(e) => setUsername(e.target.value.trim().toLowerCase())}
            onBlur={() => handleBlur('username')}
            style={
              (errors.username && touched.username) ? { border: '1px solid #dc2626' } :
              usernameStatus === 'available' ? { border: '1px solid #16a34a' } :
              usernameStatus === 'taken' ? { border: '1px solid #dc2626' } : undefined
            }
          />
          <p style={{ fontSize: 12, marginTop: 4, color: '#64748b' }}>
            Lowercase letters, numbers, and underscores only. 3–30 characters.
          </p>
          {usernameStatus === 'checking' && (
            <p style={{ fontSize: 12, marginTop: 4, color: '#2563eb' }}>Checking availability...</p>
          )}
          {usernameStatus === 'available' && (
            <p style={{ fontSize: 12, marginTop: 4, color: '#16a34a' }}>Username Available</p>
          )}
          {usernameStatus === 'taken' && (
            <p style={{ fontSize: 12, marginTop: 4, color: '#dc2626' }}>Username Already Taken</p>
          )}
          {renderFieldError('username')}

          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter Password"
              style={{ paddingRight: '40px', ...((errors.password && touched.password) ? { border: '1px solid #dc2626' } : {}) }}
              value={password}
              onChange={(e) => { setPassword(e.target.value); handleBlur('password') }}
              onBlur={() => handleBlur('password')}
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
          {renderFieldError('password')}

          <label>Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              style={{ paddingRight: '40px', ...((errors.confirmPassword && touched.confirmPassword) ? { border: '1px solid #dc2626' } : {}) }}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); handleBlur('confirmPassword') }}
              onBlur={() => handleBlur('confirmPassword')}
            />
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
          {renderFieldError('confirmPassword')}

          <button className="primary-btn" onClick={handleRegister} disabled={isSubmitting || usernameStatus === 'taken'} title="Register new employee account">
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
          <p style={{ marginTop: 16, fontSize: 13, color: '#64748b', textAlign: 'center' }}>
            Already have an account? <Link to="/" style={{ color: '#1E0977', fontWeight: 600 }}>Log in</Link>
          </p>
        </section>
      </main>
    </div>
  )
}

export default SignUp
