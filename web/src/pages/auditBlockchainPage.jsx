import React, { useMemo, useState } from 'react'
import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader, SearchBar, StatusBadge, Table } from '../components'

const records = [
  { id: 'RB-1001', hash: 'a1b2...f3d4', time: '2024-05-23 10:12', status: 'completed' },
  { id: 'RB-1002', hash: 'c5d6...e7f8', time: '2024-05-22 15:48', status: 'pending' },
  { id: 'RB-1003', hash: '9a0b...1c2d', time: '2024-05-21 09:30', status: 'failed' }
]

const AuditBlockchainPage = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredRecords = useMemo(
    () =>
      records.filter((record) =>
        [record.id, record.hash, record.time, record.status]
          .map((value) => value || '')
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ),
    [searchTerm]
  )

  const columns = [
    { key: 'id', title: 'Record ID' },
    {
      key: 'hash',
      title: 'Transaction Hash',
      render: (value) => value
    },
    { key: 'time', title: 'Timestamp' },
    {
      key: 'status',
      title: 'Status',
      render: (_, row) => <StatusBadge status={row.status} />
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <Button variant="outline" onClick={() => {}}>
          View Details
        </Button>
      )
    }
  ]

  return (
    <div>
      <DashboardLayout />
      <div className="layout">
        <Sidebar />

        <main className="content">
          <PageHeader
            title="Audit Blockchain Records"
            actions={[
              <SearchBar key="search" value={searchTerm} onChange={setSearchTerm} placeholder="Search records by ID or hash..." />,
              <Button key="refresh" variant="outline" onClick={() => setSearchTerm('')}>
                Clear
              </Button>
            ]}
          />

          <Table columns={columns} data={filteredRecords} />
        </main>
      </div>
    </div>
  )
}

export default AuditBlockchainPage;
