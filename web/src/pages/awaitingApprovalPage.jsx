import { useNavigate } from 'react-router-dom'
import { useAuth } from '../services/authContext'

const AwaitingApprovalPage = () => {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Sign out failed:', err)
    }
    navigate('/')
  }

  return (
    <div className="container">
      <section className="form-box" style={{ textAlign: 'center', maxWidth: '480px', margin: '60px auto' }}>
        <h3 style={{ marginBottom: 12 }}>Account Pending Approval</h3>
        <p style={{ marginBottom: 8 }}>
          Your account has been successfully created.
        </p>
        <p style={{ marginBottom: 24 }}>
          An administrator must approve your account before you can access JEDDSpace.
        </p>
        <p style={{ marginBottom: 24, color: '#64748b' }}>
          If you believe this is an error, please contact your system administrator.
        </p>
        <button className="primary-btn" onClick={handleLogout} title="Return to login">
          Return to Login
        </button>
      </section>
    </div>
  )
}

export default AwaitingApprovalPage
