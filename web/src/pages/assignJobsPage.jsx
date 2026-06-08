import { useState, useEffect } from 'react'
import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'
import { jobService } from '../services/jobsService'
import { employeeService } from '../services/employeeService'
import { emailService } from '../services/emailService'
import { notificationService } from '../services/notificationService'
import { useAuth } from '../services/authContext'
import { alertService } from '../utils/alertService'
import { Button, Modal, PageHeader, SearchBar, StatusBadge, Table } from '../components'
import { DEPARTMENT_OPTIONS, JOB_STATUS_OPTIONS, NCR_DESTINATION_OPTIONS } from '../constants/formOptions'

const AssignJobsPage = () => {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isFormVisible, setIsFormVisible] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [department, setDepartment] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')

  const fetchJobs = async () => {
    try {
      const data = await jobService.getAll()
      setJobs(data)
    } catch (error) {
      console.error(error)
    }
  }

  const resetForm = () => {
    setFirstName('')
    setLastName('')
    setDepartment('')
    setDestination('')
    setStartDate('')
    setEndDate('')
    setNotes('')
    setIsFormVisible(false)
  }

  const handleAddJob = async () => {
    if (!firstName || !lastName || !department || !destination || !startDate || !endDate) {
      await alertService.warning('Please fill all required fields')
      return
    }

    try {
      const employee = await employeeService.findByName(firstName, lastName)

      if (!employee) {
        await alertService.error('Employee not found')
        return
      }

      await jobService.create({
        employee_id: employee.employee_id,
        department,
        destination,
        start_date: startDate,
        end_date: endDate,
        notes: notes || null,
        status: 'open'
      })

      await Promise.allSettled([
        notificationService.createNotification({
          title: 'New job assignment created',
          message: `${firstName} ${lastName} was assigned to ${destination}.`,
          type: 'job_assignment',
          priority: 'High',
          userId: user?.id
        }),
        emailService.createEmailLog({
          subject: `Job Assignment: ${destination}`,
          body: `${firstName} ${lastName} was assigned to ${destination} from ${startDate} to ${endDate}.`,
          recipient: `${firstName} ${lastName}`,
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
  }, [])

  const filteredJobs = jobs.filter((job) => {
    const query = searchTerm.toLowerCase()
    const employeeName = job.employee
      ? `${job.employee.first_name || ''} ${job.employee.last_name || ''}`.toLowerCase()
      : ''
    return (
      employeeName.includes(query) ||
      String(job.department || '').toLowerCase().includes(query) ||
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
    { key: 'department', title: 'Department' },
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
          : 'No notes'
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
              <Button key="assign" onClick={() => setIsFormVisible(true)}>
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
            <label>First Name</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Juan" />
          </div>
          <div>
            <label>Last Name</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dela Cruz" />
          </div>
          <div>
            <label>Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="" disabled>Select department</option>
              {DEPARTMENT_OPTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
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
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label>End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <label>Travel Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add itinerary details, important reminders, or travel notes" rows={4} style={{ width: '100%' }} />
          </div>
        </div>
      </Modal>
      </DashboardLayout>
    </>
  )
}

export default AssignJobsPage
