import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getNotificationBody,
  getNotificationId,
  notificationService,
} from '../services/notificationService'
import { pushNotificationService } from '../services/pushNotificationService'
import { alertService } from '../utils/alertService'
import { useAuth } from '../services/authContext'

const POLL_INTERVAL_MS = 45000

const formatDate = (value) => {
  if (!value) return 'Just now'
  return new Date(value).toLocaleString()
}

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M15 17H9C7.89543 17 7 16.1046 7 15V11.5858C7 11.054 6.78929 10.5437 6.41421 10.1686L5.29289 9.04728C4.90237 8.65676 4.90237 8.0236 5.29289 7.63307C5.68342 7.24255 6.31658 7.24255 6.70711 7.63307L7.82843 8.75439C8.57857 9.50453 9 10.5208 9 11.5858V15H15V11.5858C15 10.5208 15.4214 9.50453 16.1716 8.75439L17.2929 7.63307C17.6834 7.24255 18.3166 7.24255 18.7071 7.63307C19.0976 8.0236 19.0976 8.65676 18.7071 9.04728L17.5858 10.1686C17.2107 10.5437 17 11.054 17 11.5858V15C17 16.1046 16.1046 17 15 17Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 19C10.5523 20.1046 11.4477 20.75 12 20.75C12.5523 20.75 13.4477 20.1046 14 19"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

export default function NotificationBell() {
  const { profile } = useAuth()
  const wrapperRef = useRef(null)
  const seenIdsRef = useRef(new Set())
  const initialLoadRef = useRef(true)

  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [desktopEnabled, setDesktopEnabled] = useState(
    () => pushNotificationService.isDesktopEnabled()
  )
  const [permission, setPermission] = useState(() =>
    pushNotificationService.getPermission()
  )

  const unreadCount = notifications.filter((item) => !item.is_read).length

  const pushDesktopAlert = useCallback((item) => {
    pushNotificationService.showAlert({
      title: item.title || 'New alert',
      body: getNotificationBody(item) || `New ${item.type || 'JEDDSpace'} alert`,
      tag: String(getNotificationId(item) || item.title || 'alert'),
    })
  }, [])

  const handleIncomingNotification = useCallback(
    (item, showDesktop = true) => {
      const id = getNotificationId(item)
      if (!id || seenIdsRef.current.has(id)) return

      seenIdsRef.current.add(id)
      setNotifications((current) => {
        if (current.some((entry) => getNotificationId(entry) === id)) {
          return current
        }
        return [item, ...current]
      })

      if (showDesktop && !item.is_read) {
        pushDesktopAlert(item)
      }
    },
    [pushDesktopAlert]
  )

  const loadNotifications = useCallback(async () => {
    try {
      const employeeId = profile?.employee_id
      if (!employeeId) {
        setNotifications([])
        setLoading(false)
        return
      }

      const data = await notificationService.getNotifications(employeeId)

      if (initialLoadRef.current) {
        data.forEach((item) => {
          const id = getNotificationId(item)
          if (id) seenIdsRef.current.add(id)
        })
        initialLoadRef.current = false
        setNotifications(data)
        return
      }

      data.forEach((item) => {
        if (!item.is_read) {
          handleIncomingNotification(item, true)
        }
      })

      setNotifications(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [handleIncomingNotification, profile])

  useEffect(() => {
    loadNotifications()

    const unsubscribeRealtime = notificationService.subscribeToInserts((item) => {
      const employeeId = profile?.employee_id
      if (!employeeId) return

      const notifyTo = item?.notify_to ?? item?.notifyTo ?? null
      if (notifyTo !== null && String(notifyTo) !== String(employeeId)) {
        return
      }

      handleIncomingNotification(item, true)
    })

    const pollTimer = setInterval(loadNotifications, POLL_INTERVAL_MS)

    return () => {
      unsubscribeRealtime()
      clearInterval(pollTimer)
    }
  }, [handleIncomingNotification, loadNotifications, profile])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleDesktopAlerts = async () => {
    if (!pushNotificationService.isSupported()) {
      await alertService.warning(
        'Desktop notifications are not supported in this browser.',
        'Unsupported'
      )
      return
    }

    if (!pushNotificationService.isSecureContext()) {
      await alertService.warning(
        'Open JEDDSpace on http://127.0.0.1 or https:// to enable desktop alerts.',
        'Secure Context Required'
      )
      return
    }

    if (desktopEnabled && permission === 'granted') {
      pushNotificationService.disableDesktopAlerts()
      setDesktopEnabled(false)
      return
    }

    const granted = await pushNotificationService.enableDesktopAlerts()
    const nextPermission = pushNotificationService.getPermission()
    setPermission(nextPermission)
    setDesktopEnabled(granted)

    if (granted) {
      pushNotificationService.showAlert({
        title: 'Desktop alerts enabled',
        body: 'You will receive push alerts for new JEDDSpace notifications.',
        tag: 'desktop-alerts-enabled',
      })
      return
    }

    if (nextPermission === 'denied') {
      await alertService.warning(
        'Notification permission was blocked. Enable it in your browser site settings.',
        'Permission Denied'
      )
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead()
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
    } catch (error) {
      await alertService.error(error.message || 'Unable to mark alerts as read.', 'Update Failed')
    }
  }

  const handleNotificationClick = async (item) => {
    const id = getNotificationId(item)
    if (!id || item.is_read) return

    try {
      await notificationService.markAsRead(id)
      setNotifications((current) =>
        current.map((entry) =>
          getNotificationId(entry) === id ? { ...entry, is_read: true } : entry
        )
      )
    } catch (error) {
      console.error(error)
    }
  }

  const desktopButtonLabel =
    desktopEnabled && permission === 'granted'
      ? 'Desktop alerts on'
      : permission === 'denied'
        ? 'Alerts blocked'
        : 'Enable desktop alerts'

  return (
    <div className="notification-bell-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="notification-bell-button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        title="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      <div className={`notification-dropdown${isOpen ? ' open' : ''}`}>
        <div className="notification-header">
          <div>
            <strong>Push Alerts</strong>
            <p className="notification-subtitle">
              Company alerts and announcement notifications.
            </p>
          </div>
        </div>

        <div className="notification-footer">
          <button
            type="button"
            className={`desktop-notification-button${
              desktopEnabled && permission === 'granted' ? ' enabled' : ''
            }`}
            onClick={handleToggleDesktopAlerts}
            disabled={permission === 'denied'}
            title={desktopButtonLabel}
          >
            {desktopButtonLabel}
          </button>
          <button type="button" className="desktop-notification-button" onClick={handleMarkAllRead} title="Mark all alerts as read">
            Mark all read
          </button>
        </div>

        <div className="notification-list">
          {loading && <p className="notification-empty">Loading alerts...</p>}

          {!loading && notifications.length === 0 && (
            <p className="notification-empty">No alerts yet.</p>
          )}

          {!loading &&
            notifications.map((item) => {
              const id = getNotificationId(item)
              const priority = item.priority || 'Normal'

              return (
                <button
                  key={id || item.created_at}
                  type="button"
                  className={`notification-item${item.is_read ? '' : ' unread'}`}
                  onClick={() => handleNotificationClick(item)}
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                >
                  <p className="notification-item-title">{item.title || 'Alert'}</p>
                  <div className="notification-item-meta">
                    <span className={`priority-pill priority-${priority}`}>{priority}</span>
                    <span>{item.type || 'general'}</span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  {getNotificationBody(item) && (
                    <p className="notification-item-body">{getNotificationBody(item)}</p>
                  )}
                </button>
              )
            })}
        </div>
      </div>
    </div>
  )
}
