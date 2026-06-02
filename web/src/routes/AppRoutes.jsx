import React, { lazy, Suspense, useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import LoadingOverlay from "../components/LoadingOverlay";

const LoginPage = lazy(() => import("../pages/loginPage"));
const SignupPage = lazy(() => import("../pages/signupPage"));
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
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-2fa" element={<Verify2FAPage />} />
          <Route path="/dashboard" element={<CommonDashboardPage />} />
          <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>}/>
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/emails" element={<EmailsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/official-business" element={<OfficialBusinessFormPage />} />
          <Route path="/post-announcements" element={<PostAnnouncement />} />
          <Route path="/manage-employees" element={<ManageEmployeesPage />} />
          <Route path="/assign-jobs" element={<AssignJobsPage />} />
          <Route path="/audit-blockchain" element={<AuditBlockchainPage />} />
          <Route path="/leave-form" element={<LeaveFormPage />} />
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