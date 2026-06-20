import React, { lazy, Suspense, useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import LoadingOverlay from "../components/LoadingOverlay";

const LoginPage = lazy(() => import("../pages/loginPage"));
const SignupPage = lazy(() => import("../pages/signupPage"));
const AuthCallbackPage = lazy(() => import("../pages/authCallbackPage"));
const Verify2FAPage = lazy(() => import("../pages/verify2faPage"));
const CommonDashboardPage = lazy(() => import("../pages/commonDashboardPage"));
const AnnouncementsPage = lazy(() => import("../pages/announcementsPage"));
const EmailsPage = lazy(() => import("../pages/emailsPage"));
const DocumentsPage = lazy(() => import("../pages/documentsPage"));
const ProfilePage = lazy(() => import("../pages/profilePage"));
const AdminDashboardPage = lazy(() => import("../pages/adminDashboardPage"));
const ContractsPage = lazy(() => import("../pages/contractsPage"));
const OfficialBusinessFormPage = lazy(() => import("../pages/officialBusinessFormPage"));
const PostAnnouncement = lazy(() => import("../pages/postAnnouncementsPage"));
const ManageEmployeesPage = lazy(() => import("../pages/manageEmployeesPage"));
const EmployeesPage = lazy(() => import("../pages/employeesPage"));
const AssignJobsPage = lazy(() => import("../pages/assignJobsPage"));
const AuditBlockchainPage = lazy(() => import("../pages/auditBlockchainPage"));
const LeaveFormPage = lazy(() => import("../pages/leaveFormPage"));
const AdminRoute = lazy(() => import("../components/AdminRoute"));
const ProtectedRoute = lazy(() => import('../components/ProtectedRoute'))

const InnerRoutes = () => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    // Show a brief overlay when the pathname changes to smooth transitions
    if (prevPath.current && prevPath.current !== location.pathname) {
      setIsLoading(true);
      const t = setTimeout(() => setIsLoading(false), 400);
      prevPath.current = location.pathname;
      return () => clearTimeout(t);
    }
    prevPath.current = location.pathname;
  }, [location]);

  return (
    <>
      <LoadingOverlay visible={isLoading} />
      <Suspense fallback={<LoadingOverlay visible={true} message={'Loading...'} />}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/signup" element={<ProtectedRoute><AdminRoute><SignupPage /></AdminRoute></ProtectedRoute>} />
          <Route path="/verify-2fa" element={<ProtectedRoute><Verify2FAPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><CommonDashboardPage /></ProtectedRoute>} />
          <Route path="/admin-dashboard" element={<ProtectedRoute><AdminRoute><AdminDashboardPage /></AdminRoute></ProtectedRoute>}/>
          <Route path="/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
          <Route path="/announcements" element={<ProtectedRoute><AnnouncementsPage /></ProtectedRoute>} />
          <Route path="/emails" element={<ProtectedRoute><EmailsPage /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/contracts" element={<ProtectedRoute><ContractsPage /></ProtectedRoute>} />
          <Route path="/official-business" element={<ProtectedRoute><OfficialBusinessFormPage /></ProtectedRoute>} />
          <Route path="/post-announcements" element={<ProtectedRoute><AdminRoute><PostAnnouncement /></AdminRoute></ProtectedRoute>} />
          <Route path="/manage-employees" element={<ProtectedRoute><ManageEmployeesPage /></ProtectedRoute>} />
          <Route path="/assign-jobs" element={<ProtectedRoute><AssignJobsPage /></ProtectedRoute>} />
          <Route path="/audit-blockchain" element={<ProtectedRoute><AuditBlockchainPage /></ProtectedRoute>} />
          <Route path="/leave-form" element={<ProtectedRoute><LeaveFormPage /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </>
  );
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <InnerRoutes />
    </BrowserRouter>
  );
};

export default AppRoutes;
