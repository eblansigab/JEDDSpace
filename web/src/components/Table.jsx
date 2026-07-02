import React from 'react'



// columns: [{ key, title, render? }]
export default function Table({ columns = [], data = [], onRowClick }) {
  const Columns = columns ?? []
  const Data = data ?? []

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {Columns.map((c) => (
              <th key={c.key} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>{c.title}</th>
            ))}
          </tr>
        </thead> 
        <tbody>
          {Data.map((row, idx) => (
            <tr key={row.id ?? idx} onClick={() => onRowClick && onRowClick(row)} style={{ cursor: onRowClick ? 'pointer' : 'default' }}>
              {Columns.map((c) => (
                <td key={c.key} style={{ padding: '10px 8px', borderBottom: '1px solid #f3f4f6' }}>
                  {c.render ? c.render(row[c.key], row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
