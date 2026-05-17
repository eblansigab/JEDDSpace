import { BrowserRouter, Routes, Route }from 'react-router-dom'
import LoginPage from './pages/loginPage'
import CommonDashboardPage from './pages/commonDashboardPage'
import EmployeesPage from './pages/employeesPage'
import jobsPage from './pages/jobsPage'
import AppRoutes from "./routes/AppRoutes";

function App() {
  return <AppRoutes />
}

export default App;