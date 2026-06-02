import { Link } from 'react-router-dom'

import logo from '../assets/JEDDSpace Logo (Transparent).png'

const DashboardLayout = () => {
  const toggleMobileSidebar = () => {
    document.body.classList.toggle('mobile-sidebar-open')
  }

  return (
    <div>
      <header>
        <Link to="/dashboard" className="header-logo">
          <img
            className="logo-img"
            src={logo}
            alt="JEDDSpace Logo"
          />
        </Link>

        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={toggleMobileSidebar}
          aria-label="Open menu"
        >
          Menu
        </button>
      </header>
    </div>
  )
}

export default DashboardLayout
