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

  const [fieldWorkers, setFieldWorkers] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [recommendations, setRecommendations] = useState([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)

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
      await alertService.error(error.message || 'Failed to get recommendations')
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
      if(dateStart > new Date()){
        await alertService.error("Start date can't be before today.")
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

  const handleEditJob = async (
    job_id,
    currentDestination,
    currentNotes,
    currentStartDate,
    currentEndDate,
    currentStatus
  ) => {
    const destinationResult = await alertService.input({
      title: 'Edit Destination',
      text: 'Choose the nearest NCR city for this job.',
      input: 'select',
      inputValue: currentDestination,
      inputOptions: NCR_DESTINATION_OPTIONS.reduce((options, item) => ({ ...options, [item]: item }), {}),
      confirmButtonText: 'Next'
    })
    if (!destinationResult.isConfirmed) return
    const updatedDestination = destinationResult.value?.trim() || currentDestination
    if (!updatedDestination) {
      await alertService.warning('Destination cannot be empty')
      return
    }

    const startDateResult = await alertService.input({
      title: 'Edit Start Date',
      text: 'Leave blank to keep the current start date.',
      input: 'date',
      inputValue: currentStartDate,
      allowEmpty: true,
      confirmButtonText: 'Next'
    })
    if (!startDateResult.isConfirmed) return
    const updatedStartDate = startDateResult.value?.trim() || currentStartDate
    if (!updatedStartDate) {
      await alertService.warning('Start date cannot be empty')
      return
    }

    const endDateResult = await alertService.input({
      title: 'Edit End Date',
      text: 'Leave blank to keep the current end date.',
      input: 'date',
      inputValue: currentEndDate,
      allowEmpty: true,
      confirmButtonText: 'Next'
    })
    if (!endDateResult.isConfirmed) return
    const updatedEndDate = endDateResult.value?.trim() || currentEndDate
    if (!updatedEndDate) {
      await alertService.warning('End date cannot be empty')
      return
    }

    const statusResult = await alertService.input({
      title: 'Edit Status',
      text: 'Choose the current job status.',
      input: 'select',
      inputValue: currentStatus || 'pending',
      inputOptions: JOB_STATUS_OPTIONS.reduce((options, item) => ({ ...options, [item]: item }), {}),
      confirmButtonText: 'Next'
    })
    if (!statusResult.isConfirmed) return
    const updatedStatus = statusResult.value?.trim() || currentStatus
    if (!updatedStatus) {
      await alertService.warning('Status cannot be empty')
      return
    }

    const notesResult = await alertService.input({
      title: 'Edit Notes',
      text: 'Enter travel notes or leave blank to keep current notes.',
      input: 'textarea',
      inputValue: currentNotes || '',
      inputPlaceholder: 'Travel notes',
      allowEmpty: true,
      confirmButtonText: 'Save'
    })
    const newNotes = notesResult.isConfirmed ? notesResult.value : currentNotes

    try {
      await jobService.update(job_id, {
        destination: updatedDestination,
        start_date: updatedStartDate,
        end_date: updatedEndDate,
        status: updatedStatus,
        notes: newNotes?.trim() || null
      })

      await Promise.allSettled([
        notificationService.createNotification({
          title: 'Job assignment updated',
          message: `Job #${job_id} was updated.`,
          type: 'job_assignment',
          priority: 'Normal',
          userId: user?.id
        }),
        emailService.createEmailLog({
          subject: `Job Assignment Updated: ${updatedDestination}`,
          body: `Job #${job_id} was updated. Status: ${updatedStatus}.`,
          type: 'job_assignment',
          userId: user?.id
        })
      ])

      await alertService.success('Job updated successfully')
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
          <Button variant="outline" style={{ minWidth: 80 }} onClick={() => handleEditJob(row.job_id, row.destination, row.notes, row.start_date, row.end_date, row.status)}>
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
            min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div>
            <label>End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            min={startDate?startDate:new Date().toISOString().split("T")[0]} />
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
      </DashboardLayout>
    </>
  )
}

export default AssignJobsPage