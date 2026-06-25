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
      </main>
    </DashboardLayout>
  )
}

export default ContractsPage