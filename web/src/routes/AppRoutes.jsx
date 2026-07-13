import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import LoadingOverlay from "../components/LoadingOverlay";

const LoginPage = lazy(() => import("../pages/loginPage"));
const AuthCallbackPage = lazy(() => import("../pages/authCallbackPage"))
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
const AiAssistantPage = lazy(() => import("../pages/aiAssistantPage"));
const AiChatLogsPage = lazy(() => import("../pages/aiChatLogsPage"));
const AiAnalyticsPage = lazy(() => import("../pages/aiAnalyticsPage"));
const AdminRoute = lazy(() => import("../components/AdminRoute"));
const ProtectedRoute = lazy(() => import('../components/ProtectedRoute'))
const PermissionRoute = lazy(() => import('../components/PermissionRoute'))
const ApprovalGuard = lazy(() => import('../components/ApprovalGuard'))
const AwaitingApprovalPage = lazy(() => import('../pages/awaitingApprovalPage'))
const RegistrationRequestsPage = lazy(() => import('../pages/registrationRequestsPage'))
const FormsOutletPage = lazy(() => import('../pages/formsOutletPage'))

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
          <Route path="/awaiting-approval" element={<AwaitingApprovalPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/verify-2fa" element={<ProtectedRoute><ApprovalGuard><Verify2FAPage /></ApprovalGuard></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><ApprovalGuard><CommonDashboardPage /></ApprovalGuard></ProtectedRoute>} />
          <Route path="/admin-dashboard" element={<ProtectedRoute><AdminRoute><ApprovalGuard><AdminDashboardPage /></ApprovalGuard></AdminRoute></ProtectedRoute>}/>
          <Route path="/employees" element={<ProtectedRoute><ApprovalGuard><EmployeesPage /></ApprovalGuard></ProtectedRoute>} />
          <Route path="/announcements" element={<ProtectedRoute><PermissionRoute permission="announcement.view"><ApprovalGuard><AnnouncementsPage /></ApprovalGuard></PermissionRoute></ProtectedRoute>} />
          <Route path="/emails" element={<ProtectedRoute><PermissionRoute permission="message.view"><ApprovalGuard><EmailsPage /></ApprovalGuard></PermissionRoute></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><PermissionRoute permission="document.view"><ApprovalGuard><DocumentsPage /></ApprovalGuard></PermissionRoute></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ApprovalGuard><ProfilePage /></ApprovalGuard></ProtectedRoute>} />
          <Route path="/contracts" element={<ProtectedRoute><PermissionRoute permission="job.view"><ApprovalGuard><ContractsPage /></ApprovalGuard></PermissionRoute></ProtectedRoute>} />
          <Route path="/official-business" element={<ProtectedRoute><PermissionRoute permission="business.create"><ApprovalGuard><OfficialBusinessFormPage /></ApprovalGuard></PermissionRoute></ProtectedRoute>} />
          <Route path="/post-announcements" element={<ProtectedRoute><AdminRoute><ApprovalGuard><PermissionRoute permission="announcement.manage"><PostAnnouncement /></PermissionRoute></ApprovalGuard></AdminRoute></ProtectedRoute>} />
          <Route path="/manage-employees" element={<ProtectedRoute><AdminRoute><ApprovalGuard><PermissionRoute permission="employee.manage"><ManageEmployeesPage /></PermissionRoute></ApprovalGuard></AdminRoute></ProtectedRoute>} />
          <Route path="/assign-jobs" element={<ProtectedRoute><PermissionRoute permission="job.manage"><ApprovalGuard><AssignJobsPage /></ApprovalGuard></PermissionRoute></ProtectedRoute>} />
          <Route path="/audit-blockchain" element={<ProtectedRoute><PermissionRoute permission="audit.view"><ApprovalGuard><AuditBlockchainPage /></ApprovalGuard></PermissionRoute></ProtectedRoute>} />
          <Route path="/leave-form" element={<ProtectedRoute><PermissionRoute permission="leave.create"><ApprovalGuard><LeaveFormPage /></ApprovalGuard></PermissionRoute></ProtectedRoute>} />
          <Route path="/ai-assistant" element={<ProtectedRoute><PermissionRoute permission="ai.chat"><ApprovalGuard><AiAssistantPage /></ApprovalGuard></PermissionRoute></ProtectedRoute>} />
          <Route path="/ai-chat-logs" element={<ProtectedRoute><AdminRoute><ApprovalGuard><PermissionRoute permission="settings.manage"><AiChatLogsPage /></PermissionRoute></ApprovalGuard></AdminRoute></ProtectedRoute>} />
          <Route path="/ai-analytics" element={<ProtectedRoute><AdminRoute><ApprovalGuard><PermissionRoute permission="settings.manage"><AiAnalyticsPage /></PermissionRoute></ApprovalGuard></AdminRoute></ProtectedRoute>} />
          <Route path="/registration-requests" element={<ProtectedRoute><AdminRoute><ApprovalGuard><PermissionRoute permission="employee.manage"><RegistrationRequestsPage /></PermissionRoute></ApprovalGuard></AdminRoute></ProtectedRoute>} />
          <Route path="/forms-outlet" element={<ProtectedRoute><AdminRoute><ApprovalGuard><PermissionRoute permission="leave.manage"><FormsOutletPage /></PermissionRoute></ApprovalGuard></AdminRoute></ProtectedRoute>} />
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