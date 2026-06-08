const DESKTOP_ENABLED_KEY = 'jeddspace_desktop_notifications'

export const pushNotificationService = {
  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window
  },

  isSecureContext() {
    return typeof window !== 'undefined' && window.isSecureContext
  },

  getPermission() {
    if (!this.isSupported()) return 'unsupported'
    return Notification.permission
  },

  isDesktopEnabled() {
    return localStorage.getItem(DESKTOP_ENABLED_KEY) === 'true'
  },

  setDesktopEnabled(enabled) {
    localStorage.setItem(DESKTOP_ENABLED_KEY, enabled ? 'true' : 'false')
  },

  async requestPermission() {
    if (!this.isSupported()) return 'unsupported'
    if (!this.isSecureContext()) return 'insecure'

    const result = await Notification.requestPermission()
    if (result === 'granted') {
      this.setDesktopEnabled(true)
    }
    return result
  },

  async enableDesktopAlerts() {
    const permission = await this.requestPermission()
    return permission === 'granted'
  },

  disableDesktopAlerts() {
    this.setDesktopEnabled(false)
  },

  showAlert({ title, body, tag }) {
    if (!this.isSupported() || Notification.permission !== 'granted') return null
    if (!this.isDesktopEnabled()) return null

    try {
      return new Notification(title, {
        body,
        tag: tag || title,
        icon: '/icons.svg',
      })
    } catch {
      return null
    }
  },
}
