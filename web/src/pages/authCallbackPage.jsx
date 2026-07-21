import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseClient } from '../supabase/supabaseClient'
import {
  alertService
} from '../utils/alertService'
import {
  createEmployeeRecord,
  getPendingEmployee,
  clearPendingEmployeeData,
} from '../services/authService'
import LoadingOverlay from '../components/LoadingOverlay'

const AuthCallbackPage = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying')
  const [statusMessage, setStatusMessage] = useState('Verifying your email...')

  useEffect(() => {
    let mounted = true

    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabaseClient.auth.getSession()

        if (error) throw error

        const session = data?.session
        const user = session?.user

        if (!user) {
          if (mounted) setStatus('no-session')
          return
        }

        if (!user.email_confirmed_at) {
          if (mounted) setStatus('unverified')
          await supabaseClient.auth.signOut()
          return
        }

        const pendingEmployee = getPendingEmployee()
        if (pendingEmployee && pendingEmployee.email === user.email) {
          if (mounted) {
            setStatus('creating-employee')
            setStatusMessage('Email verified! Setting up your employee record...')
          }

          try {
            await createEmployeeRecord(user.id, pendingEmployee, pendingEmployee.selectedRoleIds)
            clearPendingEmployeeData()
          } catch (createErr) {
            console.error('Failed to create employee record after verification:', createErr)
            if (mounted) {
              setStatus('employee-error')
              setStatusMessage(
                'Email verified, but we could not create your employee record. Please contact your administrator.'
              )
            }
            await supabaseClient.auth.signOut()
            return
          }
        }

        if (mounted) {
          setStatus('verified')
          await alertService.success(
            'Email verified successfully! You can now log in.'
          )
          await supabaseClient.auth.signOut()
          navigate('/', { replace: true })
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        if (mounted) {
          setStatus('error')
          setStatusMessage(
            err?.message || 'Email verification failed. Please try again.'
          )
        }
      }
    }

    handleAuthCallback()

    return () => {
      mounted = false
    }
  }, [navigate])

  const handleGoToLogin = async () => {
    await supabaseClient.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div>
      <LoadingOverlay
        visible={status === 'verifying' || status === 'creating-employee'}
        message={statusMessage}
      />
      <main className="container">
        <section className="form-box" style={{ textAlign: 'center' }}>
          {status === 'verifying' && (
            <h3>{statusMessage}</h3>
          )}

          {status === 'creating-employee' && (
            <h3>{statusMessage}</h3>
          )}

          {status === 'verified' && (
            <>
              <h3 style={{ color: 'green' }}>Email Verified!</h3>
              <p>You can now log in to JEDDSpace.</p>
            </>
          )}

          {status === 'unverified' && (
            <>
              <h3 style={{ color: 'orange' }}>Email Not Verified</h3>
              <p>
                Your email address has not been verified yet. Please check your
                inbox and click the verification link.
              </p>
              <button
                className="primary-btn"
                onClick={handleGoToLogin}
                style={{ marginTop: '16px' }}
              >
                Back to Login
              </button>
            </>
          )}

          {status === 'no-session' && (
            <>
              <h3 style={{ color: 'red' }}>Verification Link Invalid</h3>
              <p>
                The verification link is invalid or has expired. Please try
                registering again or contact support.
              </p>
              <button
                className="primary-btn"
                onClick={handleGoToLogin}
                style={{ marginTop: '16px' }}
              >
                Back to Login
              </button>
            </>
          )}

          {status === 'employee-error' && (
            <>
              <h3 style={{ color: 'orange' }}>Setup Incomplete</h3>
              <p>{statusMessage}</p>
              <button
                className="primary-btn"
                onClick={handleGoToLogin}
                style={{ marginTop: '16px' }}
              >
                Back to Login
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <h3 style={{ color: 'red' }}>Verification Failed</h3>
              <p>{statusMessage}</p>
              <button
                className="primary-btn"
                onClick={handleGoToLogin}
                style={{ marginTop: '16px' }}
              >
                Back to Login
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default AuthCallbackPage
