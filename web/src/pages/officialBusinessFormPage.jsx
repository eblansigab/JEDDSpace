import React, { useState, useEffect } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader } from '../components'
import { useAuth } from '../services/authContext'
import { alertService } from '../utils/alertService'
import { createBusinessForm } from '../services/messageService'

const OfficialBusinessFormPage = () => {
  const { profile } = useAuth()
  const [project, setProject] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [companyCar, setCompanyCar] = useState('')
  const [driverName, setDriverName] = useState('')
  const [phoneNum, setPhoneNum] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    if (!startDate || !endDate || !location || !companyCar || !driverName || !phoneNum) {
      await alertService.error('Please fill in all required fields.')
      return
    }

    setIsSubmitting(true)
    try {
      await createBusinessForm({
        employeeId: profile?.employee_id,
        startDate,
        endDate,
        location,
        companyCar,
        driverName,
        phoneNum,
        createdBy: profile?.user_id,
      })

      await alertService.success('Official business form submitted successfully.')
      setProject('')
      setStartDate('')
      setEndDate('')
      setLocation('')
      setCompanyCar('')
      setDriverName('')
      setPhoneNum('')
    } catch (error) {
      await alertService.error(error.message || 'Failed to submit official business form.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
        <main className="content">
      <PageHeader title="Official Business Form" />

      <form className="business-form" onSubmit={handleSubmit}>
        <label className="block mb-1">Project</label>
        <input
          type="text"
          className="border p-2 rounded w-full mb-4"
          placeholder="Enter Project Name"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        />

        <label className="block mb-1">Duration</label>
        <div className="flex items-center gap-4 mb-4">
          <input type="date" className="border p-1 rounded" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span>to</span>
          <input type="date" className="border p-1 rounded" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <label className="block mb-1">Location</label>
        <input
          type="text"
          className="border p-2 rounded w-full mb-4"
          placeholder="Enter Place, City, & Province"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <label className="block mb-1">Company Car</label>
        <input
          type="text"
          className="border p-2 rounded w-full mb-4"
          placeholder="Enter Car Name & License Plate"
          value={companyCar}
          onChange={(e) => setCompanyCar(e.target.value)}
        />

        <label className="block mb-1">Driver</label>
        <input
          type="text"
          className="border p-2 rounded w-full mb-4"
          placeholder="Enter Driver Name"
          value={driverName}
          onChange={(e) => setDriverName(e.target.value)}
        />

        <label className="block mb-1">Contact No.</label>
        <input
          type="tel"
          className="border p-2 rounded w-full mb-6"
          placeholder="Enter Phone No."
          value={phoneNum}
          onChange={(e) => setPhoneNum(e.target.value)}
        />

        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </form>
            </main>
    </DashboardLayout>
  )
}

export default OfficialBusinessFormPage
