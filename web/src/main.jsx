import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/style.css'
import './styles/dark-fixes.css'
import App from './App.jsx'

const savedTheme = localStorage.getItem('theme') || localStorage.getItem('jeddspace_theme') || 'light'
document.documentElement.dataset.theme = savedTheme

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)