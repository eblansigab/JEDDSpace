import { useState, useEffect } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { jobService } from '../services/jobsService'
import { contractService } from '../services/contractService'
import { employeeService } from '../services/employeeService'
import { emailService } from '../services/emailService'
import { notificationService } from '../services/notificationService'
import { getRecommendations } from '../services/recommendationService'
import { useAuth } from '../services/authContext'
import { alertService } from '../utils/alertService'
import { Button, Modal, PageHeader, SearchBar, StatusBadge, Table } from '../components'
import { NCR_DESTINATION_OPTIONS, JOB_STATUS_OPTIONS } from '../constants/formOptions'

const AssignJobsPage = () => {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [isEditFormVisible, setIsEditFormVisible] = useState(false)

  const [fieldWorkers, setFieldWorkers] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [recommendations, setRecommendations] = useState([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)

  const [editingJobId, setEditingJobId] = useState(null)
  const [editDestination, setEditDestination] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const getTodayString = () => new Date().toISOString().split('T')[0]

  const isDateBeforeToday = (dateString) => {
    if (!dateString) return false
    const inputDate = new Date(dateString + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return inputDate < today
  }

  const fetchJobs = async () => {
    try {
      const data = await jobService.getAll()
      setJobs(data)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchFieldWorkers = async () => {
    try {
      const data = await employeeService.getAssignableEmployees()
      setFieldWorkers(data)
    } catch (error) {
      console.error(error)
    }
  }

  const resetForm = () => {
    setSelectedEmployee('')
    setDestination('')
    setStartDate('')
    setEndDate('')
    setNotes('')
    setRecommendations([])
    setIsFormVisible(false)
  }

  const resetEditForm = () => {
    setEditingJobId(null)
    setEditDestination('')
    setEditStartDate('')
    setEditEndDate('')
    setEditStatus('')
    setEditNotes('')
    setIsEditFormVisible(false)
  }

  const handleGetRecommendations = async () => {
    if (!startDate || !endDate) {
      await alertService.warning('Please select start and end dates first')
      return
    }

    setLoadingRecommendations(true)
    try {
      const data = await getRecommendations({
        startDate,
        endDate
      })
      setRecommendations(data || [])
      if (!data || data.length === 0) {
        await alertService.info('No recommendations available for the selected dates')
      }
    } catch (error) {
      console.error(error.message)
      await alertService.error('Failed to get recommendations')
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const handleUseRecommendation = (employee) => {
    setSelectedEmployee(employee.employee_id)
    setRecommendations([])
  }

  const handleAddJob = async () => {
    if (!selectedEmployee || !destination || !startDate || !endDate) {
      await alertService.warning('Please fill all required fields')
      return
    }

    try {
      const employee = fieldWorkers.find((w) => String(w.employee_id) === String(selectedEmployee))
      const dateStart = new Date(startDate)
      const dateEnd = new Date(endDate)

      if (!employee) {
        await alertService.error('Employee not found')
        return
      }
      if (isDateBeforeToday(startDate)) {
        await alertService.error("Start date can't be before today.")
        return
      }
      if (isDateBeforeToday(endDate)) {
        await alertService.error("End date can't be before today.")
        return
      }
      if (dateStart > dateEnd){
        await alertService.error("Start date can't be after the end date.")
        return
      }

      const jobResult = await jobService.create({
        employee_id: selectedEmployee,
        department: employee.department,
        destination,
        start_date: startDate,
        end_date: endDate,
        notes: notes || null,
        status: 'open'
      })

      const job = jobResult

      if (!job?.job_id) {
        await alertService.error('Failed to create job')
        return
      }

      await contractService.createContract({
        contractor: selectedEmployee,
        job_id: job.job_id,
        start_date: startDate,
        end_date: endDate,
        contract_title: `Job Assignment: ${destination}`,
        status: 'pending_signature'
      })

      const employeeName = `${employee.first_name} ${employee.last_name}`

      await Promise.allSettled([
        notificationService.createNotification({
          title: 'New job assignment created',
          message: `${employeeName} was assigned to ${destination}.`,
          type: 'job_assignment',
          priority: 'High',
          userId: user?.id
        }),
        emailService.createEmailLog({
          subject: `Job Assignment: ${destination}`,
          body: `${employeeName} was assigned to ${destination} from ${startDate} to ${endDate}.`,
          recipient: employeeName,
          type: 'job_assignment',
          userId: user?.id
        })
      ])

      await alertService.success('Job assigned successfully')
      resetForm()
      fetchJobs()
    } catch (error) {
      await alertService.error(error.message)
    }
  }

  const openEditModal = (job) => {
    setEditingJobId(job.job_id)
    setEditDestination(job.destination || '')
    setEditStartDate(job.start_date || '')
    setEditEndDate(job.end_date || '')
    setEditStatus(job.status || 'pending')
    setEditNotes(job.notes || '')
    setIsEditFormVisible(true)
  }

  const handleUpdateJob = async () => {
    if (!editingJobId) return

    if (!editDestination || !editStartDate || !editEndDate) {
      await alertService.warning('Please fill all required fields')
      return
    }

    const dateStart = new Date(editStartDate)
    const dateEnd = new Date(editEndDate)

    if (isDateBeforeToday(editStartDate)) {
      await alertService.error("Start date can't be before today.")
      return
    }
    if (isDateBeforeToday(editEndDate)) {
      await alertService.error("End date can't be before today.")
      return
    }
    if (dateStart > dateEnd) {
      await alertService.error("Start date can't be after the end date.")
      return
    }

    try {
      await jobService.update(editingJobId, {
        destination: editDestination,
        start_date: editStartDate,
        end_date: editEndDate,
        status: editStatus,
        notes: editNotes?.trim() || null
      })

      await Promise.allSettled([
        notificationService.createNotification({
          title: 'Job assignment updated',
          message: `Job #${editingJobId} was updated.`,
          type: 'job_assignment',
          priority: 'Normal',
          userId: user?.id
        }),
        emailService.createEmailLog({
          subject: `Job Assignment Updated: ${editDestination}`,
          body: `Job #${editingJobId} was updated. Status: ${editStatus}.`,
          type: 'job_assignment',
          userId: user?.id
        })
      ])

      await alertService.success('Job updated successfully')
      resetEditForm()
      fetchJobs()
    } catch (error) {
      await alertService.error(error.message)
    }
  }

  const handleCompleteJob = async (job_id) => {
    try {
      await jobService.update(job_id, {
        status: 'closed'
      })

      await alertService.success('Job marked as completed')
      fetchJobs()
    } catch (error) {
      await alertService.error(error.message)
    }
  }

  const handleDeleteJob = async (job_id) => {
    const confirmDelete = await alertService.confirm({
      title: 'Delete this job?',
      text: 'This action cannot be undone.',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    })

    if (!confirmDelete.isConfirmed) return

    try {
      await jobService.remove(job_id)
      await alertService.success('Job deleted')
      fetchJobs()
    } catch (error) {
      await alertService.error(error.message)
    }
  }

  useEffect(() => {
    fetchJobs()
    fetchFieldWorkers()
  }, [])

  const filteredJobs = jobs.filter((job) => {
    const query = searchTerm.toLowerCase()
    const employeeName = job.employee
      ? `${job.employee.first_name || ''} ${job.employee.last_name || ''}`.toLowerCase()
      : ''
    return (
      employeeName.includes(query) ||
      String(job.destination || '').toLowerCase().includes(query) ||
      String(job.status || '').toLowerCase().includes(query)
    )
  })

  const columns = [
    { key: 'job_id', title: 'Job ID' },
    {
      key: 'name',
      title: 'Employee Name',
      render: (_, row) =>
        row.employee ? `${row.employee.first_name} ${row.employee.last_name}` : 'Unknown Employee'
    },
    { key: 'destination', title: 'Destination' },
    { key: 'start_date', title: 'Start Date' },
    { key: 'end_date', title: 'End Date' },
    {
      key: 'notes',
      title: 'Notes',
      render: (_, row) =>
        row.notes
          ? row.notes.length > 40
            ? `${row.notes.slice(0, 40)}...`
            : row.notes
          : '-'
    },
    {
      key: 'status',
      title: 'Status',
      render: (_, row) => <StatusBadge status={row.status || 'pending'} />
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outline" style={{ minWidth: 80 }} onClick={() => openEditModal(row)}>
            Edit
          </Button>
          <Button variant="primary" style={{ minWidth: 80 }} onClick={() => handleCompleteJob(row.job_id)}>
            Complete
          </Button>
          <Button variant="danger" style={{ minWidth: 80 }} onClick={() => handleDeleteJob(row.job_id)}>
            Delete
          </Button>
        </div>
      )
    }
  ]

  return (
    <>
      <DashboardLayout>
        <main className="content">
          <PageHeader
            title="Travel Job Assignment"
            actions={[
              <SearchBar key="search" value={searchTerm} onChange={setSearchTerm} placeholder="Search jobs..." />,
              <Button key="assign" onClick={() => { fetchFieldWorkers(); setIsFormVisible(true) }}>
                Assign New Job
              </Button>
            ]}
          />

          <Table columns={columns} data={filteredJobs} />
        </main>
      <Modal
        visible={isFormVisible}
        title="Assign New Job"
        onClose={() => setIsFormVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="outline" onClick={() => setIsFormVisible(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddJob}>Confirm</Button>
          </div>
        }
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label>Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">Select Employee</option>
              {fieldWorkers.map((worker) => (
                <option key={worker.employee_id} value={worker.employee_id}>
                  {worker.first_name} {worker.last_name}
                  {worker.role ? ` (${worker.role})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Destination</label>
            <select value={destination} onChange={(e) => setDestination(e.target.value)}>
              <option value="" disabled>Select NCR city</option>
              {NCR_DESTINATION_OPTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
            min={getTodayString()}
            />
          </div>
          <div>
            <label>End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            min={startDate ? startDate : getTodayString()} />
          </div>
          <div>
            <label>Travel Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add itinerary details, important reminders, or travel notes" rows={4} style={{ width: '100%' }} />
          </div>
          <Button
            variant="outline"
            onClick={handleGetRecommendations}
            disabled={loadingRecommendations}
            style={{ minWidth: 200 }}
          >
            {loadingRecommendations ? 'Loading...' : '🤖 Recommend Best Worker'}
          </Button>
          {recommendations.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: '0 0 12px', color: '#1E0977' }}>Recommended Workers</h4>
              <div style={{ display: 'grid', gap: 12 }}>
                {recommendations.map((emp) => (
                  <div
                    key={emp.employee_id}
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      padding: 12,
                      background: '#fafafa'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <strong style={{ fontSize: 14 }}>{emp.full_name}</strong>
                        {emp.position && (
                          <div style={{ fontSize: 12, color: '#64748b' }}>{emp.position}</div>
                        )}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1E0977' }}>{emp.score}%</span>
                    </div>
                    <ul style={{ margin: '0 0 10px', paddingLeft: 16, fontSize: 13 }}>
                      {emp.reasons.map((reason, idx) => (
                        <li key={idx} style={{ color: '#334155' }}>✓ {reason}</li>
                      ))}
                    </ul>
                    <Button
                      variant="primary"
                      style={{ padding: '6px 12px', fontSize: 13 }}
                      onClick={() => handleUseRecommendation(emp)}
                    >
                      Use Recommendation
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
      <Modal
        visible={isEditFormVisible}
        title="Edit Job Assignment"
        onClose={() => setIsEditFormVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="outline" onClick={() => setIsEditFormVisible(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateJob}>Save Changes</Button>
          </div>
        }
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>Employee</label>
            <input
              type="text"
              value={jobs.find((j) => String(j.job_id) === String(editingJobId))?.employee ? `${jobs.find((j) => String(j.job_id) === String(editingJobId)).employee.first_name} ${jobs.find((j) => String(j.job_id) === String(editingJobId)).employee.last_name}` : ''}
              disabled
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, opacity: 0.7, backgroundColor: '#f9fafb' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>Destination</label>
            <select value={editDestination} onChange={(e) => setEditDestination(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}>
              <option value="" disabled>Select NCR city</option>
              {NCR_DESTINATION_OPTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>Start Date</label>
            <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} min={getTodayString()} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>End Date</label>
            <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} min={editStartDate ? editStartDate : getTodayString()} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>Status</label>
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}>
              {JOB_STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>Travel Notes</label>
            <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Add itinerary details, important reminders, or travel notes" rows={4} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical' }} />
          </div>
        </div>
      </Modal>
      </DashboardLayout>
    </>
  )
}

export default AssignJobsPage