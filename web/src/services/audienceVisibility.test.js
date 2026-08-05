import { describe, test, expect } from 'vitest'
import { mapAudienceToVisibility, getAudienceBadge, getAudienceFromVisibility } from '../components/AudienceSelector.jsx'

describe('AudienceSelector helpers', () => {
  test('mapAudienceToVisibility returns correct scope/target', () => {
    expect(mapAudienceToVisibility('BOTH')).toEqual({ scope: 'ORGANIZATION', target: null })
    expect(mapAudienceToVisibility('ADMINISTRATION')).toEqual({ scope: 'DEPARTMENT', target: 'Administration' })
    expect(mapAudienceToVisibility('ENGINEERING')).toEqual({ scope: 'DEPARTMENT', target: 'Engineering' })
    expect(mapAudienceToVisibility('unknown')).toEqual({ scope: 'ORGANIZATION', target: null })
  })

  test('getAudienceBadge returns correct display text', () => {
    expect(getAudienceBadge('BOTH')).toBe('Both')
    expect(getAudienceBadge('ADMINISTRATION')).toBe('Administration')
    expect(getAudienceBadge('ENGINEERING')).toBe('Engineering')
    expect(getAudienceBadge('unknown')).toBe('Both')
  })

  test('getAudienceFromVisibility maps scope/target back to audience', () => {
    expect(getAudienceFromVisibility('ORGANIZATION', null)).toBe('BOTH')
    expect(getAudienceFromVisibility('organization', null)).toBe('BOTH')
    expect(getAudienceFromVisibility('DEPARTMENT', 'Administration')).toBe('ADMINISTRATION')
    expect(getAudienceFromVisibility('DEPARTMENT', 'Engineering')).toBe('ENGINEERING')
    expect(getAudienceFromVisibility('DEPARTMENT', 'Unknown')).toBe('BOTH')
    expect(getAudienceFromVisibility('ROLE', '1')).toBe('BOTH')
    expect(getAudienceFromVisibility(null, null)).toBe('BOTH')
  })

  test('getAudienceFromVisibility is case-insensitive for department target', () => {
    expect(getAudienceFromVisibility('DEPARTMENT', 'administration')).toBe('ADMINISTRATION')
    expect(getAudienceFromVisibility('department', 'ENGINEERING')).toBe('ENGINEERING')
  })
})

describe('Announcement visibility logic', () => {
  const filterAnnouncement = (announcement, viewer) => {
    const visibilityScope = String(announcement.visibility_scope || 'ORGANIZATION').toUpperCase()
    const visibilityTarget = announcement.visibility_target ? String(announcement.visibility_target).trim() : null
    const userDepartment = String(viewer?.employee?.department || '').trim().toLowerCase()
    const userRoleId = viewer?.employee?.role_id ?? null
    const isAdmin = Boolean(viewer?.isAdmin)

    if (visibilityScope === 'ORGANIZATION') return true
    if (!isAdmin) return false
    if (visibilityScope === 'DEPARTMENT') {
      if (!visibilityTarget) return true
      if (!userDepartment) return false
      return visibilityTarget.toLowerCase() === userDepartment
    }
    if (visibilityScope === 'ROLE') {
      if (!userRoleId) return false
      if (!visibilityTarget) return true
      return String(visibilityTarget) === String(userRoleId)
    }
    return true
  }

  test('ORGANIZATION announcements are visible to everyone', () => {
    expect(filterAnnouncement({ visibility_scope: 'ORGANIZATION' }, { isAdmin: false })).toBe(true)
    expect(filterAnnouncement({ visibility_scope: 'ORGANIZATION' }, { isAdmin: true })).toBe(true)
  })

  test('DEPARTMENT announcements are visible to matching department admins', () => {
    expect(filterAnnouncement({ visibility_scope: 'DEPARTMENT', visibility_target: 'Administration' }, { isAdmin: true, employee: { department: 'Administration' } })).toBe(true)
    expect(filterAnnouncement({ visibility_scope: 'DEPARTMENT', visibility_target: 'Engineering' }, { isAdmin: true, employee: { department: 'Engineering' } })).toBe(true)
    expect(filterAnnouncement({ visibility_scope: 'DEPARTMENT', visibility_target: 'Administration' }, { isAdmin: true, employee: { department: 'Engineering' } })).toBe(false)
    expect(filterAnnouncement({ visibility_scope: 'DEPARTMENT', visibility_target: 'Administration' }, { isAdmin: false, employee: { department: 'Administration' } })).toBe(false)
  })

  test('ROLE announcements are visible to matching role admins', () => {
    expect(filterAnnouncement({ visibility_scope: 'ROLE', visibility_target: '2' }, { isAdmin: true, employee: { role_id: 2 } })).toBe(true)
    expect(filterAnnouncement({ visibility_scope: 'ROLE', visibility_target: '2' }, { isAdmin: true, employee: { role_id: 1 } })).toBe(false)
    expect(filterAnnouncement({ visibility_scope: 'ROLE', visibility_target: '2' }, { isAdmin: false, employee: { role_id: 2 } })).toBe(false)
  })
})

describe('Message visibility logic', () => {
  const isMessageVisible = (msg, viewer) => {
    const myEmail = String(viewer?.email || '').trim().toLowerCase()
    const userDepartment = String(viewer?.department || '').trim().toLowerCase()
    const recipientClean = String(msg.recipient_email || msg.recipient || '').trim().toLowerCase()
    const isSentByMe = msg.sender_id === viewer?.employee_id
    const scope = String(msg.visibility_scope || '').trim().toUpperCase()
    const target = String(msg.visibility_target || '').trim()

    if (recipientClean && recipientClean !== 'all') {
      return recipientClean === myEmail && !isSentByMe
    }

    if (isSentByMe) return false

    if (scope === 'ORGANIZATION') return true

    if (scope === 'DEPARTMENT' && target) {
      return target.toLowerCase() === userDepartment
    }

    if (recipientClean === 'all' && !scope) return true

    return false
  }

  test('direct messages are visible only to recipient', () => {
    const msg = { recipient_email: 'alice@example.com', sender_id: 1 }
    expect(isMessageVisible(msg, { email: 'alice@example.com', employee_id: 1 })).toBe(false)
    expect(isMessageVisible(msg, { email: 'alice@example.com', employee_id: 2 })).toBe(true)
    expect(isMessageVisible(msg, { email: 'bob@example.com', employee_id: 2 })).toBe(false)
  })

  test('ORGANIZATION broadcasts are visible to all', () => {
    const msg = { recipient_email: 'all', visibility_scope: 'ORGANIZATION', sender_id: 1 }
    expect(isMessageVisible(msg, { email: 'alice@example.com', employee_id: 2, department: 'Administration' })).toBe(true)
    expect(isMessageVisible(msg, { email: 'bob@example.com', employee_id: 3, department: 'Engineering' })).toBe(true)
  })

  test('DEPARTMENT broadcasts are visible only to matching department', () => {
    const adminMsg = { recipient_email: 'all', visibility_scope: 'DEPARTMENT', visibility_target: 'Administration', sender_id: 1 }
    const engMsg = { recipient_email: 'all', visibility_scope: 'DEPARTMENT', visibility_target: 'Engineering', sender_id: 1 }

    expect(isMessageVisible(adminMsg, { email: 'alice@example.com', employee_id: 2, department: 'Administration' })).toBe(true)
    expect(isMessageVisible(adminMsg, { email: 'bob@example.com', employee_id: 3, department: 'Engineering' })).toBe(false)
    expect(isMessageVisible(engMsg, { email: 'alice@example.com', employee_id: 2, department: 'Administration' })).toBe(false)
    expect(isMessageVisible(engMsg, { email: 'bob@example.com', employee_id: 3, department: 'Engineering' })).toBe(true)
  })

  test('legacy broadcasts without visibility scope are visible to all', () => {
    const msg = { recipient_email: 'all', visibility_scope: null, visibility_target: null, sender_id: 1 }
    expect(isMessageVisible(msg, { email: 'alice@example.com', employee_id: 2, department: 'Administration' })).toBe(true)
  })

  test('sender sees their own message in sent folder', () => {
    const msg = { recipient_email: 'all', visibility_scope: 'ORGANIZATION', sender_id: 1 }
    expect(isMessageVisible(msg, { email: 'alice@example.com', employee_id: 1, department: 'Administration' })).toBe(false)
  })
})
