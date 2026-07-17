import { useState } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader } from '../components'
import { useAuth } from '../services/authContext'
import { alertService } from '../utils/alertService'
import { createLeaveForm } from '../services/messageService'
import { documentService } from '../services/documentService'


const LEAVE_TYPES = [
  { value: 'VL', label: 'Vacation Leave' },
  { value: 'SL', label: 'Sick Leave' },
  { value: 'EL', label: 'Emergency Leave' },
  { value: 'OL', label: 'Official Business' },
]

const LeaveFormPage = () => {
  const { profile } = useAuth()
  const [leaveType, setLeaveType] = useState('VL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sickDate, setSickDate] = useState('')
  const [returnedDate, setReturnedDate] = useState('')
  const [reason, setReason] = useState('')
  const [medicalCertificate, setMedicalCertificate] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const isSickLeave = leaveType === 'SL'
  const isVacationLeave = leaveType === 'VL'
  const isOfficialBusiness = leaveType === 'OL'

  const validate = () => {
    if (isVacationLeave || isOfficialBusiness) {
      if (!startDate || !endDate) {
        alertService.error('Please select both start and end dates.')
        return false
      }
      if (endDate < startDate) {
        alertService.error('End date cannot be earlier than start date.')
        return false
      }
    }

    if (isSickLeave) {
      if (!sickDate || !returnedDate) {
        alertService.error('Please provide both the date became sick and date returned to work.')
        return false
      }
      if (returnedDate < sickDate) {
        alertService.error('Date returned to work cannot be earlier than the date became sick.')
        return false
      }
    }

    if (!reason.trim()) {
      alertService.error('Please provide a reason for your leave.')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    if (!validate()) return

    setIsSubmitting(true)
    try {
      let finalReason = reason.trim()

      if (isSickLeave && medicalCertificate) {
        try {
          const uploaded = await documentService.recordUpload(medicalCertificate, profile?.user_id)
          const certRef = uploaded?.file_path || uploaded?.file_name || medicalCertificate.name
          finalReason = `${finalReason}\n\nMedical Certificate: ${certRef}`
        } catch (uploadError) {
          console.error('Medical certificate upload failed:', uploadError)
          alertService.warning('Medical certificate could not be uploaded, but your leave form will still be submitted.')
        }
      }

      const payload = {
        employeeId: profile?.employee_id,
        type: leaveType,
        reason: finalReason,
        createdBy: profile?.user_id,
        ...(isVacationLeave || isOfficialBusiness
          ? { startDate, endDate }
          : { startDate: sickDate, endDate: returnedDate }),
      }

      await createLeaveForm(payload)
      await alertService.success('Leave form submitted successfully.')

      setLeaveType('VL')
      setStartDate('')
      setEndDate('')
      setSickDate('')
      setReturnedDate('')
      setReason('')
      setMedicalCertificate(null)
    } catch (error) {
      await alertService.error(error.message || 'Failed to submit leave form.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <main className="content">
        <PageHeader title="Leave Form" />

        <form className="leave-form" onSubmit={handleSubmit}>
          <label className="block mt-4">Type of Leave</label>
          <select
            className="border p-2 rounded w-full"
            value={leaveType}
            onChange={(e) => {
              setLeaveType(e.target.value)
              setStartDate('')
              setEndDate('')
              setSickDate('')
              setReturnedDate('')
            }}
            required
          >
            {LEAVE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          {(isVacationLeave || isOfficialBusiness) && (
            <>
              <label className="block mt-4">
                {isOfficialBusiness ? 'Duration' : 'Duration'}
              </label>
              <div className="flex-initial gap-4" style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="date"
                  className="border p-1 rounded"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={today}
                  max={endDate || undefined}
                  required
                />
                <span className="mx-2">to</span>
                <input
                  type="date"
                  className="border p-1 rounded"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || today}
                  required
                />
              </div>
            </>
          )}

          {isSickLeave && (
            <>
              <label className="block mt-4">Date Became Sick</label>
              <input
                type="date"
                className="border p-1 rounded w-full"
                value={sickDate}
                onChange={(e) => setSickDate(e.target.value)}
                max={today}
                required
              />

              <label className="block mt-4">Date Returned to Work</label>
              <input
                type="date"
                className="border p-1 rounded w-full"
                value={returnedDate}
                onChange={(e) => setReturnedDate(e.target.value)}
                min={sickDate || today}
                max={today}
                required
              />

              <label className="block mt-4">Medical Certificate (optional)</label>
              <input
                type="file"
                className="border p-2 rounded w-full"
                accept="image/*,.pdf"
                onChange={(e) => setMedicalCertificate(e.target.files?.[0] || null)}
              />
              {medicalCertificate && (
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Selected: {medicalCertificate.name}
                </p>
              )}
            </>
          )}

          <label className="block mt-4">Reason</label>
          <textarea
            rows="5"
            className="border p-2 rounded w-full"
            placeholder={
              isSickLeave
                ? 'Describe your illness or reason for sick leave'
                : 'Enter reason for leave'
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          ></textarea>

          <Button type="submit" variant="primary" style={{ marginTop: 24 }} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </form>
      </main>
    </DashboardLayout>
  )
}

export default LeaveFormPage
