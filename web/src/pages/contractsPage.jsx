import { useState, useEffect } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { contractService } from '../services/contractService'
import { jobService } from '../services/jobsService'
import { LoadingOverlay } from '../components'
import { alertService } from '../utils/alertService'

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

        {enrichedContracts.map((contract) => (
          <div key={contract.contracts_id} className="contract-box">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {contract.contract_title || 'Untitled Contract'}
              <span className={`status ${contract.status}`}></span>
            </h3>
            <p><strong>Contractor:</strong> {contract.contractor ? `${contract.contractor.first_name} ${contract.contractor.last_name}` : 'Unknown'}</p>
            <p><strong>Department:</strong> {contract.contractor?.department || 'N/A'}</p>
            <p><strong>Start Date:</strong> {contract.start_date || 'N/A'}</p>
            <p><strong>End Date:</strong> {contract.end_date || 'Ongoing'}</p>
            <p><strong>Salary:</strong> {contract.salary ? `₱${contract.salary.toLocaleString()}` : 'N/A'}</p>
            {contract.contract_file_url && (
              <a href={contract.contract_file_url} target="_blank" rel="noreferrer" className="primary-btn">
                View Contract
              </a>
            )}

            {contract.job && (
              <>
                <hr style={{border:0, borderTop:'1px solid #6B7280'}}/>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <div style={{width:'45%'}}>
                    <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                      <p style={{fontWeight:'bold'}}>Destination</p>
                      <p>{contract.job.destination || 'N/A'}</p>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <p style={{fontWeight:'bold'}}>Location</p>
                      <p>{contract.job.destination || 'N/A'}</p>
                    </div>
                  </div>
                  <div style={{width:'45%'}}>
                    <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                      <p style={{fontWeight:'bold'}}>Start Date</p>
                      <p>{contract.job.start_date ? new Date(contract.job.start_date).toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'}) : 'N/A'}</p>
                    </div>
                    <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                      <p style={{fontWeight:'bold'}}>End Date</p>
                      <p>{contract.job.end_date ? new Date(contract.job.end_date).toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'}) : 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <hr style={{border:0, borderTop:'1px solid #6B7280'}}/>
                {contract.job.employee && (
                  <div style={{display:'flex', gap:'32px'}}>
                    <div style={{gap:"16px"}}>
                      <div style={{display:'flex', gap:"8px"}}>
                        <span style={{
                          display:'flex',
                          width: '100px',
                          height: '100px',
                          borderRadius: '50%',
                          backgroundColor: 'gray',
                          justifyContent: "center",
                          alignItems: 'center', 
                          fontSize: "32px",
                          color:'#fff'
                          }}>
                          {contract.job.employee.first_name?.[0]}{contract.job.employee.last_name?.[0]}
                        </span>
                        <div>
                          <p style={{fontWeight:'bold'}}>{contract.job.employee.first_name} {contract.job.employee.last_name}</p>
                          <p>EMP-{contract.job.employee.employee_id}</p>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:'8px'}}>
                        <div style={{borderRadius:'15%',backgroundColor:"lightblue",padding:'8px'}}>{contract.job.employee.position || 'N/A'}</div>
                        <div style={{borderRadius:'15%',backgroundColor:"lightgray",padding:'8px'}}>{contract.job.employee.department || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {!enrichedContracts.length && (
          <p style={{ color: '#64748b' }}>No contracts found.</p>
        )}
      </main>
    </DashboardLayout>
  )
}

export default ContractsPage