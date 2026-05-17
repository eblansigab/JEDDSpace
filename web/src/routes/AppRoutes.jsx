import { BrowserRouter, Routes, Route} from "react-router-dom";
import LoginPage from "../pages/loginPage";
import SignupPage from "../pages/signupPage";
import CommonDashboardPage from "../pages/commonDashboardPage";
import EmployeesPage from "../pages/employeesPage";
import AnnouncementsPage from "../pages/announcementsPage";
import EmailsPage from "../pages/emailsPage";
import DocumentsPage from "../pages/documentsPage";
import ProfilePage from "../pages/profilePage";
import AdminDashboardPage from "../pages/adminDashboardPage";
import ContractsPage from "../pages/contractsPage";
import OfficialBusinessFormPage from "../pages/officialBusinessFormPage";
import PostAnnouncement from "../pages/postAnnouncementsPage";
import ManageEmployeesPage from "../pages/manageEmployeesPage";
import AssignJobsPage from "../pages/assignJobsPage";
import AuditBlockchainPage from "../pages/auditBlockchainPage";
import LeaveFormPage from "../pages/leaveFormPage"; 


const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* Auth */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Common Dashboard */}
        <Route path="/dashboard" element={<CommonDashboardPage />} />

        {/* Admin Dashboard */}
        <Route path="/admin-dashboard" element={<AdminDashboardPage/>}/>

        {/* Employees */}
        <Route path="/employees" element={<employeesPage />} />

       

        {/* Announcements */}
        <Route path="/announcements" element={<AnnouncementsPage />} />

        {/* Emails */}
        <Route path="/emails" element={<EmailsPage />} />

        {/* Documents */}
        <Route path="/documents" element={<DocumentsPage />} />

        {/* Profile */}
        <Route path="/profile" element={<ProfilePage />} />

        {/*Contracts*/}
        <Route path="/contracts" element={<ContractsPage />}/>

        {/*Official Business Page*/}
        <Route path="/official-business" element={<OfficialBusinessFormPage />} />

        {/*post announcements page*/}
        <Route path="/post-announcements" element={<PostAnnouncement/>} />

        {/*Manage employees page*/}
        <Route path="/manage-employees" element={<ManageEmployeesPage/>} />

        {/*Assign travelling jobs*/ }
        <Route path="/assign-jobs" element={<AssignJobsPage/>} />

        {/*Audit blockchain page */}
        <Route path="/audit-blockchain" element={<AuditBlockchainPage/>} />

        {/*Leave form page*/ }
        <Route path="/leave-form" element={<LeaveFormPage/>}/>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;