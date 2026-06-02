import React, { useState } from 'react'
import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader } from '../components'

const LeaveFormPage = () => {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [leaveType, setLeaveType] = useState('VL')
  const [reason, setReason] = useState('')

  return (
    <div>
      <DashboardLayout />
      <div className="layout">
        <Sidebar />

        <main className="content">
          <PageHeader title="Leave Form" />

          <form className="leave-form" onSubmit={(e) => e.preventDefault()}>
            <label>Duration</label>
            <div className="flex-initial gap-4" style={{ display: 'flex', alignItems: 'center' }}>
              <input type="date" className="border p-1 rounded" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <span className="mx-2">to</span>
              <input type="date" className="border p-1 rounded" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <label className="block mt-4">Type of Leave</label>
            <select className="border p-2 rounded w-full" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
              <option value="VL">Vacation Leave (VL)</option>
              <option value="SL">Sick Leave (SL)</option>
              <option value="EL">Emergency Leave (EL)</option>
              <option value="OL">Other (OL)</option>
            </select>

            <label className="block mt-4">Reason</label>
            <textarea
              rows="5"
              className="border p-2 rounded w-full"
              placeholder="Enter reason for leave"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            ></textarea>

            <Button type="submit" variant="primary" style={{ marginTop: 24 }}>
              Submit
            </Button>
          </form>
        </main>
      </div>
    </div>
  )
}

export default LeaveFormPage;