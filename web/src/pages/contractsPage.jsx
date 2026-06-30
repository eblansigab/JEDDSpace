import { useState, useEffect } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { contractService } from '../services/contractService'
import { LoadingOverlay } from '../components'
import { alertService } from '../utils/alertService'

const ContractsPage = () => {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadContracts = async () => {
      try {
        const data = await contractService.getAllContracts()
        setContracts(data)
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

  return (
    <DashboardLayout>
      <main className="content">
        <h3>Contracts</h3>

        {(contracts || []).map((contract) => (
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
          </div>
        ))}

        {!contracts.length && (
          <p style={{ color: '#64748b' }}>No contracts found.</p>
        )}

        <div className='contract-box'>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Untitled Contract (Contractor)
            <span className='status ongoing'></span>
          </h3>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <div style={{width:'45%'}}>
              <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                <p style={{fontWeight:'bold'}}>Destination</p>
                <p>City, State, Country</p>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <p style={{fontWeight:'bold'}}>Location</p>
                <p>123 Main St., City, State</p>
              </div>
            </div>
            <div style={{width:'45%'}}>
              <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                <p style={{fontWeight:'bold'}}>Start Date</p>
                <p>June 29, 2026</p>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <p style={{fontWeight:'bold'}}>End Date</p>
                <p>July 02, 2026</p>
              </div>
            </div>
          </div>
          <hr style={{border:0, borderTop:'1px solid #6B7280'}}/>
          <p style={{fontWeight:'bold'}}>Assigned Employees (2) (expansion thing starts here)</p> 
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
                }}>JS</span>
              <div>
                <p style={{fontWeight:'bold'}}>Jane Smith</p>
                <p>EMP-002</p>
              </div>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <div style={{borderRadius:'15%',backgroundColor:"lightblue",padding:'8px'}}>Project Manager</div>
                <div style={{borderRadius:'15%',backgroundColor:"lightgray",padding:'8px'}}>Operations</div>
              </div>
            </div>
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
                }}>MB</span>
              <div>
                <p style={{fontWeight:'bold'}}>Michael Brown</p>
                <p>EMP-003</p>
              </div>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <div style={{borderRadius:'15%',backgroundColor:"lightblue",padding:'8px'}}>Data Analyst</div>
                <div style={{borderRadius:'15%',backgroundColor:"lightgray",padding:'8px'}}>Analytics</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}

export default ContractsPage