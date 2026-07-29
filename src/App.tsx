
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Defaulters from "./pages/Defaulters";
import NotFound from "./pages/NotFound";
import { MainLayout } from "./components/layout/MainLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { ActiveWorkerProvider } from "./contexts/ActiveWorkerContext";
import AuthPage from "./pages/Auth";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ProfilePage from "./pages/Profile";
import ReminderHistory from "./pages/ReminderHistory";
import AuditLog from "./pages/AuditLog";
import TeamPage from "./pages/Team";
import FacilitiesPage from "./pages/Facilities";
import FacilityDetail from "./pages/FacilityDetail";
import ClientSearch from "./pages/ClientSearch";
import TransfersPage from "./pages/Transfers";
import NotificationPreferences from "./pages/NotificationPreferences";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import SmsTemplates from "./pages/SmsTemplates";
import SmsRuns from "./pages/SmsRuns";
import AdminPhcs from "./pages/AdminPhcs";
import Roster from "./pages/Roster";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <ActiveWorkerProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/patients" element={<Navigate to="/clients" replace />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/defaulters" element={<Defaulters />} />
                <Route path="/reminders" element={<ReminderHistory />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/facilities" element={<FacilitiesPage />} />
                <Route path="/facilities/:id" element={<FacilityDetail />} />
                <Route path="/client-search" element={<ClientSearch />} />
                <Route path="/transfers" element={<TransfersPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/notification-preferences" element={<NotificationPreferences />} />
                <Route path="/sms-templates" element={<SmsTemplates />} />
                <Route path="/sms-runs" element={<SmsRuns />} />
                <Route path="/admin/phcs" element={<AdminPhcs />} />
                <Route path="/roster" element={<Roster />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
            {/* Fallback for unauthenticated users hitting unknown routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </ActiveWorkerProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
