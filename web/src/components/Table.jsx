import React from 'react'

// columns: [{ key, title, render? }]
export default function Table({ columns = [], data = [], onRowClick }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.id ?? idx} onClick={() => onRowClick && onRowClick(row)} style={{ cursor: onRowClick ? 'pointer' : 'default' }}>
              {columns.map((c) => (
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
