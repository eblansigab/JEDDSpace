import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { usePermissions } from '../contexts/PermissionContext'
import { rolePermissionService } from '../services/rolePermissionService'
import { alertService } from '../utils/alertService'

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

const MODULE_ICONS = {
  employee: '👥',
  leave: '📅',
  business: '🏢',
  document: '📁',
  announcement: '📢',
  message: '💬',
  ai: '🤖',
  settings: '⚙️',
  audit: '🔗',
  job: '📋',
  admin: '🛡️',
}

const RolePermissionManagementPage = () => {
  const { hasPermission } = usePermissions()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [manageableRoles, setManageableRoles] = useState([])
  const [allPermissions, setAllPermissions] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [selectedRolePermissions, setSelectedRolePermissions] = useState([])
  const [roleSearch, setRoleSearch] = useState('')
  const [permissionSearch, setPermissionSearch] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState({})
  const [lastSaved, setLastSaved] = useState(null)
  const [roleStats, setRoleStats] = useState(null)

  const autoSaveTimerRef = useRef(null)
  const isInitialLoadRef = useRef(true)
  const previousPermissionsRef = useRef([])

  const canManageRoles = hasPermission('EMP_ROLE')

  const groupedPermissions = useMemo(() => {
    const groups = new Map()
    const query = permissionSearch.trim().toLowerCase()

    allPermissions.forEach((perm) => {
      if (query) {
        const matchesSearch =
          perm.action.toLowerCase().includes(query) ||
          (perm.description || '').toLowerCase().includes(query) ||
          perm.module.toLowerCase().includes(query)
        if (!matchesSearch) return
      }

      const module = perm.module || 'other'
      if (!groups.has(module)) {
        groups.set(module, [])
      }
      groups.get(module).push(perm)
    })

    return groups
  }, [allPermissions, permissionSearch])

  const selectedRole = useMemo(
    () => manageableRoles.find((r) => r.role_id === selectedRoleId) || null,
    [manageableRoles, selectedRoleId]
  )

  const selectedPermissionKeys = useMemo(() => {
    return new Set(selectedRolePermissions.map((p) => p.rawKey))
  }, [selectedRolePermissions])

  const filteredManageableRoles = useMemo(() => {
    if (!roleSearch.trim()) return manageableRoles
    const query = roleSearch.toLowerCase()
    return manageableRoles.filter((r) =>
      r.role_name.toLowerCase().includes(query) ||
      String(r.hierarchy_level).includes(query)
    )
  }, [manageableRoles, roleSearch])

  const toggleCategory = (category) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  const triggerAutoSave = useCallback(
    (roleId, permissionUpdates, previousPermissions) => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }

      setSaveStatus('saving')

      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          await rolePermissionService.saveRolePermissions(roleId, permissionUpdates)
          previousPermissionsRef.current = permissionUpdates
          setSaveStatus('saved')
          setLastSaved(new Date().toLocaleTimeString())
          setTimeout(() => setSaveStatus(''), 2000)
        } catch (err) {
          setSaveStatus('error')
          const message = err?.message || 'Failed to auto-save permissions.'
          setError(message)
          await alertService.error(message, 'Auto-Save Failed')
          setSelectedRolePermissions(previousPermissions || [])
          setTimeout(() => setSaveStatus(''), 3000)
        }
      }, 600)
    },
    []
  )

  useEffect(() => {
    if (!canManageRoles) {
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
        let roleStats = null

        if (manageableRoles.length > 0) {
          selectedRoleId = manageableRoles[0].role_id
          const data = await rolePermissionService.getRolePermissions(selectedRoleId)
          selectedRolePermissions = data.selectedRolePermissions || []
          roleStats = data.roleStats || null
        }

        if (cancelled) return

        setManageableRoles(manageableRoles)
        setAllPermissions(allPermissions)
        setSelectedRoleId(selectedRoleId)
        setSelectedRolePermissions(selectedRolePermissions)
        setRoleStats(roleStats)
        previousPermissionsRef.current = selectedRolePermissions
      } catch (err) {
        if (!cancelled) {
          const message = err?.message || 'Unable to load role permissions.'
          setError(message)
          await alertService.error(message, 'Load Failed')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          isInitialLoadRef.current = false
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [canManageRoles])

  const handleRoleSelect = async (roleId) => {
    setSelectedRoleId(roleId)
    setError('')
    setSaveStatus('')
    setLastSaved(null)
    setPermissionSearch('')

    if (!roleId) {
      setSelectedRolePermissions([])
      setRoleStats(null)
      previousPermissionsRef.current = []
      return
    }

    try {
      const data = await rolePermissionService.getRolePermissions(roleId)
      setSelectedRolePermissions(data.selectedRolePermissions || [])
      setRoleStats(data.roleStats || null)
      previousPermissionsRef.current = data.selectedRolePermissions || []
    } catch (err) {
      const message = 'Unable to load role permissions.'
      setError(message)
      await alertService.error(message, 'Load Failed')
      console.error(err)
    }
  }

  const handleTogglePermission = (rawKey) => {
    setSelectedRolePermissions((prev) => {
      const isChecked = prev.some((p) => p.rawKey === rawKey)
      let next

      if (isChecked) {
        next = prev.filter((p) => p.rawKey !== rawKey)
      } else {
        const perm = allPermissions.find((p) => p.rawKey === rawKey)
        if (!perm) return prev
        next = [
          ...prev,
          {
            permission_id: perm.permission_id,
            rawKey: perm.rawKey,
            scope: 'ALL',
          },
        ]
      }

      if (selectedRoleId && !isInitialLoadRef.current) {
        triggerAutoSave(
          selectedRoleId,
          next.map((p) => ({ permission_id: p.permission_id, scope: p.scope || 'ALL' })),
          prev
        )
      }

      return next
    })
  }

  const handleScopeChange = (rawKey, scope) => {
    setSelectedRolePermissions((prev) => {
      const next = prev.map((p) => (p.rawKey === rawKey ? { ...p, scope } : p))

      if (selectedRoleId && !isInitialLoadRef.current) {
        triggerAutoSave(
          selectedRoleId,
          next.map((p) => ({ permission_id: p.permission_id, scope: p.scope || 'ALL' })),
          prev
        )
      }

      return next
    })
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
            <p>Manage permissions for subordinate roles. Changes are saved automatically.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {saveStatus === 'saving' && (
              <span style={{ fontSize: 13, color: '#6b7280' }}>Saving...</span>
            )}
            {saveStatus === 'saved' && (
              <span style={{ fontSize: 13, color: '#15803d' }}>
                Saved{lastSaved ? ` at ${lastSaved}` : ''}
              </span>
            )}
            {saveStatus === 'error' && (
              <span style={{ fontSize: 13, color: '#b91c1c' }}>Save failed — reverted</span>
            )}
          </div>
        </div>

        {error && saveStatus !== 'saving' && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 6, border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, minHeight: 'calc(100vh - 220px)' }}>
          {/* Left Panel - Role List */}
          <div style={{ width: 280, flexShrink: 0, borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#fff', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#374151' }}>Roles</h3>
              <input
                type="text"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="Search roles..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
              {filteredManageableRoles.map((role) => {
                const isSelected = selectedRoleId === role.role_id
                const isProtected = role.is_protected

                return (
                  <button
                    key={role.role_id}
                    onClick={() => !isProtected && handleRoleSelect(role.role_id)}
                    disabled={isProtected}
                    title={isProtected ? 'This is a protected system role' : `Hierarchy Level ${role.hierarchy_level}`}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: isSelected ? '#eff6ff' : isProtected ? '#f9fafb' : '#fff',
                      color: isProtected ? '#9ca3af' : '#374151',
                      cursor: isProtected ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      opacity: isProtected ? 0.7 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: isSelected ? 600 : 500, fontSize: 14 }}>
                        {role.role_name}
                      </span>
                      {isProtected && (
                        <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>
                          PROTECTED
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      Level {role.hierarchy_level}
                      {isProtected && ' • System Role'}
                    </span>
                  </button>
                )
              })}
              {filteredManageableRoles.length === 0 && (
                <div style={{ padding: 16, color: '#6b7280', fontSize: 13 }}>
                  No roles match your search.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Permissions */}
          <div style={{ flex: 1, borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#fff', overflow: 'hidden' }}>
            {!selectedRole ? (
              <div style={{ padding: 24, color: '#6b7280' }}>
                Select a role from the left panel to view and edit its permissions.
              </div>
            ) : (
              <div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>
                        {selectedRole.role_name}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                        {selectedRole.description || 'No description provided.'}
                      </p>
                    </div>
                    {selectedRole.is_protected && (
                      <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 4, backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Protected
                      </span>
                    )}
                  </div>

                  {roleStats && (
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4b5563' }}>
                        <span style={{ color: '#6b7280' }}>Hierarchy Level</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{roleStats.hierarchyLevel}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4b5563' }}>
                        <span style={{ color: '#6b7280' }}>Permissions</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{roleStats.permissionCount}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4b5563' }}>
                        <span style={{ color: '#6b7280' }}>Users Assigned</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{roleStats.usersAssigned}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4b5563' }}>
                        <span style={{ color: '#6b7280' }}>Status</span>
                        <span style={{ fontWeight: 600, color: roleStats.isProtected ? '#991b1b' : '#15803d' }}>
                          {roleStats.isProtected ? 'Protected' : 'Editable'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fff' }}>
                  <input
                    type="text"
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    placeholder="Search permissions..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #d1d5db',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 380px)', padding: 16 }}>
                  {selectedRole.is_protected ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                      <p style={{ fontSize: 16, marginBottom: 8 }}>Protected Role</p>
                      <p>This is a system role. Its permissions cannot be modified.</p>
                    </div>
                  ) : (
                    Array.from(groupedPermissions.entries()).map(([module, perms]) => {
                      const isCollapsed = collapsedCategories[module]
                      const moduleLabel = MODULE_LABELS[module] || module
                      const moduleIcon = MODULE_ICONS[module] || '📄'

                      return (
                        <div key={module} style={{ marginBottom: 20 }}>
                          <button
                            onClick={() => toggleCategory(module)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #e5e7eb',
                              borderRadius: 6,
                              backgroundColor: '#f9fafb',
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#374151',
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>{moduleIcon}</span>
                              {moduleLabel}
                            </span>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>
                              {isCollapsed ? '▶' : '▼'}
                            </span>
                          </button>
                          {!isCollapsed && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, paddingLeft: 4 }}>
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
                                      {perm.description && (
                                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                          {perm.description}
                                        </div>
                                      )}
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
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}

export default RolePermissionManagementPage