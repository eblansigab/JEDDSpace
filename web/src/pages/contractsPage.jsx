import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { contractService } from '../services/contractService'
import { jobService } from '../services/jobsService'
import { LoadingOverlay, StatusBadge } from '../components'
import { alertService } from '../utils/alertService'

const formatDate = (value) => (
  value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
)

const getEmployeeName = (employee) => (
  employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : ''
)

const ContractsPage = () => {
  const [contracts, setContracts] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadContracts = async () => {
      try {
        const [contractsData, jobsData] = await Promise.all([
          contractService.getAllContracts(),
          jobService.getAll()
        ])
        setContracts(contractsData || [])
        setJobs(jobsData || [])
      } catch (error) {
        await alertService.error(error.message || 'Failed to load contracts')
      } finally {
        setLoading(false)
      }
    }
    loadContracts()
  }, [])

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingOverlay />
      </DashboardLayout>
    )
  }

  const jobsMap = (jobs || []).reduce((map, job) => {
    map[job.job_id] = job
    return map
  }, {})

  const enrichedContracts = (contracts || []).map(contract => ({
    ...contract,
    job: jobsMap[contract.job_id] || null
  }))

  return (
    <DashboardLayout>
      <main className="content">
        <h3>Contracts</h3>

        {enrichedContracts.map((contract) => {
          const job = contract.job
          const employeeName = getEmployeeName(contract.contractor) || getEmployeeName(job?.employee) || 'Unassigned'

          return (
            <div key={contract.contracts_id} className="contract-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div>
                  <h3 style={{ marginBottom: 8 }}>{contract.contract_title || 'Untitled Contract'}</h3>
                  <p><strong>Employee:</strong> {employeeName}</p>
                  {job && <p><strong>Job Assignment:</strong> Job #{job.job_id}</p>}
                </div>
                <StatusBadge status={contract.status || 'pending'} />
              </div>

              {job && (
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  {job.destination && (
                    <p><strong>Destination:</strong> {job.destination}</p>
                  )}
                  {job.start_date && (
                    <p><strong>Start Date:</strong> {formatDate(job.start_date)}</p>
                  )}
                  {job.end_date && (
                    <p><strong>End Date:</strong> {formatDate(job.end_date)}</p>
                  )}
                  {job.status && (
                    <p><strong>Job Status:</strong> {job.status}</p>
                  )}
                </div>
              )}

              {job?.notes && (
                <p style={{ marginTop: 12 }}><strong>Notes:</strong> {job.notes}</p>
              )}

              {contract.contract_file_url && (
                <a href={contract.contract_file_url} target="_blank" rel="noreferrer" className="primary-btn">
                  View Contract
                </a>
              )}
            </div>
          )
        })}

        {!enrichedContracts.length && (
          <p style={{ color: '#64748b' }}>No contracts found.</p>
        )}
      </main>
    </DashboardLayout>
  )
}

export default ContractsPage
