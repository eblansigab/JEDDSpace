import { useEffect, useState, useMemo } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { usePermissions } from '../contexts/PermissionContext'
import { rolePermissionService } from '../services/rolePermissionService'
import { alertService } from '../utils/alertService'
import '../styles/style.css'

const MODULE_LABELS = {
  employee: 'Employee Management',
  leave: 'Leave & Official Business',
  business: 'Official Business',
  document: 'Documents',
  announcement: 'Announcements',
  message: 'Messages',
  ai: 'AI Assistant',
  settings: 'Settings',
  audit: 'Blockchain Integrity',
  job: 'Projects',
  admin: 'Administration',
}

const RolePermissionManagementPage = () => {
  const { hasPermission } = usePermissions()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [manageableRoles, setManageableRoles] = useState([])
  const [allPermissions, setAllPermissions] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [selectedRolePermissions, setSelectedRolePermissions] = useState([])
  const [lastSaved, setLastSaved] = useState(null)

  const canManageRoles = hasPermission('EMP_ROLE')

  const groupedPermissions = useMemo(() => {
    const groups = new Map()
    allPermissions.forEach((perm) => {
      const module = perm.module || 'other'
      if (!groups.has(module)) {
        groups.set(module, [])
      }
      groups.get(module).push(perm)
    })
    return groups
  }, [allPermissions])

  const selectedRole = useMemo(
    () => manageableRoles.find((r) => r.role_id === selectedRoleId) || null,
    [manageableRoles, selectedRoleId]
  )

  const selectedPermissionKeys = useMemo(() => {
    return new Set(selectedRolePermissions.map((p) => p.rawKey))
  }, [selectedRolePermissions])

  useEffect(() => {
    if (!canManageRoles) {
      setLoading(false)
      return
    }

    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        const [manageableRoles, allPermissions] = await Promise.all([
          rolePermissionService.getManageableRoles(),
          rolePermissionService.getAllPermissions(),
        ])

        let selectedRoleId = null
        let selectedRolePermissions = []

        if (manageableRoles.length > 0) {
          selectedRoleId = manageableRoles[0].role_id
          const perms = await rolePermissionService.getRolePermissions(selectedRoleId)
          selectedRolePermissions = perms.selectedRolePermissions
        }

        if (cancelled) return

        setManageableRoles(manageableRoles)
        setAllPermissions(allPermissions)
        setSelectedRoleId(selectedRoleId)
        setSelectedRolePermissions(selectedRolePermissions)
      } catch (err) {
        if (!cancelled) {
          const message = err?.message || 'Unable to load role permissions.'
          setError(message)
          await alertService.error(message, 'Load Failed')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [canManageRoles])

  const handleRoleSelect = async (roleId) => {
    setSelectedRoleId(roleId)
    setError('')
    setLastSaved(null)

    if (!roleId) {
      setSelectedRolePermissions([])
      return
    }

    try {
      const data = await rolePermissionService.getRolePermissions(roleId)
      setSelectedRolePermissions(data.selectedRolePermissions || [])
    } catch (err) {
      const message = 'Unable to load role permissions.'
      setError(message)
      await alertService.error(message, 'Load Failed')
      console.error(err.message)
    }
  }

  const handleTogglePermission = (rawKey) => {
    setSelectedRolePermissions((prev) => {
      if (prev.some((p) => p.rawKey === rawKey)) {
        return prev.filter((p) => p.rawKey !== rawKey)
      }
      const perm = allPermissions.find((p) => p.rawKey === rawKey)
      if (!perm) return prev
      return [
        ...prev,
        {
          permission_id: perm.permission_id,
          rawKey: perm.rawKey,
          scope: 'ALL',
        },
      ]
    })
    setLastSaved(null)
  }

  const handleScopeChange = (rawKey, scope) => {
    setSelectedRolePermissions((prev) =>
      prev.map((p) => (p.rawKey === rawKey ? { ...p, scope } : p))
    )
    setLastSaved(null)
  }

  const handleSave = async () => {
    if (!selectedRoleId) {
      await alertService.warning('Select a role first.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const permissionUpdates = selectedRolePermissions.map((p) => ({
        permission_id: p.permission_id,
        scope: p.scope || 'ALL',
      }))

      await rolePermissionService.saveRolePermissions(selectedRoleId, permissionUpdates)

      setLastSaved(new Date().toLocaleTimeString())
      await alertService.success('Permissions saved successfully.', 'Saved')
    } catch (err) {
      const message = err?.message || 'Unable to save permissions.'
      setError(message)
      await alertService.error(message, 'Save Failed')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!canManageRoles) {
    return (
      <DashboardLayout>
        <main className="content">
          <div className="page-intro">
            <h1>Role & Permission Management</h1>
          </div>
          <div style={{ padding: 24, borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
            <p style={{ color: '#6b7280' }}>You do not have permission to manage role permissions.</p>
          </div>
        </main>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <main className="content">
          <div className="page-intro">
            <h1>Role & Permission Management</h1>
            <p>Manage permissions for subordinate roles.</p>
          </div>
          <div style={{ padding: 24, borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
            <p style={{ color: '#6b7280' }}>Loading roles and permissions...</p>
          </div>
        </main>
      </DashboardLayout>
    )
  }

  if (manageableRoles.length === 0) {
    return (
      <DashboardLayout>
        <main className="content">
          <div className="page-intro">
            <h1>Role & Permission Management</h1>
            <p>Manage permissions for subordinate roles.</p>
          </div>
          <div style={{ padding: 24, borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
            <p style={{ color: '#6b7280' }}>No manageable roles found. Only roles below your hierarchy level are editable.</p>
          </div>
        </main>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <main className="content">
        <div className="page-intro" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Role & Permission Management</h1>
            <p>Manage permissions for subordinate roles.</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selectedRoleId}
            title={saving ? 'Saving...' : 'Save permissions'}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: saving || !selectedRoleId ? '#9ca3af' : '#2563eb',
              color: '#fff',
              cursor: saving || !selectedRoleId ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 6, border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: 14 }}>
            {error}
          </div>
        )}

        {lastSaved && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 6, border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: 14 }}>
            Last saved at {lastSaved}
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, minHeight: 'calc(100vh - 220px)' }}>
          {/* Left Panel - Role List */}
          <div style={{ width: 260, flexShrink: 0, borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#fff', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' }}>Roles</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>Select a role to edit</p>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
              {manageableRoles.map((role) => (
                <button
                  key={role.role_id}
                  onClick={() => handleRoleSelect(role.role_id)}
                  title={`Hierarchy Level ${role.hierarchy_level}`}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: selectedRoleId === role.role_id ? '#eff6ff' : '#fff',
                    color: '#374151',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span style={{ fontWeight: selectedRoleId === role.role_id ? 600 : 500, fontSize: 14 }}>
                    {role.role_name}
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    Level {role.hierarchy_level}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel - Permissions */}
          <div style={{ flex: 1, borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#fff', overflow: 'hidden' }}>
            {!selectedRole ? (
              <div style={{ padding: 24, color: '#6b7280' }}>
                Select a role from the left panel to view and edit its permissions.
              </div>
            ) : (
              <>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' }}>
                    {selectedRole.role_name} Permissions
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
                    Hierarchy Level {selectedRole.hierarchy_level}
                  </p>
                </div>
                <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)', padding: 16 }}>
                  {Array.from(groupedPermissions.entries()).map(([module, perms]) => (
                    <div key={module} style={{ marginBottom: 24 }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {MODULE_LABELS[module] || module}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {perms.map((perm) => {
                          const isChecked = selectedPermissionKeys.has(perm.rawKey)
                          const currentPerm = selectedRolePermissions.find((p) => p.rawKey === perm.rawKey)
                          const scope = currentPerm?.scope || 'ALL'

                          return (
                            <div
                              key={perm.permission_id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                borderRadius: 6,
                                border: '1px solid #e5e7eb',
                                backgroundColor: '#fff',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                                  {perm.action}
                                </div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                  {perm.description}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                                <select
                                  value={scope}
                                  onChange={(e) => handleScopeChange(perm.rawKey, e.target.value)}
                                  disabled={!isChecked}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 4,
                                    border: '1px solid #d1d5db',
                                    fontSize: 12,
                                    color: isChecked ? '#374151' : '#9ca3af',
                                    backgroundColor: '#fff',
                                  }}
                                >
                                  <option value="ALL">All</option>
                                  <option value="DEPARTMENT">Department</option>
                                  <option value="SUBORDINATE">Subordinate</option>
                                  <option value="SELF">Self</option>
                                </select>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 6, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(perm.rawKey)}
                                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                                  />
                                  Enabled
                                </label>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}

export default RolePermissionManagementPage
