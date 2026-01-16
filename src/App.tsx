import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Index from "./pages/Index";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import NewEvent from "./pages/NewEvent";
import Templates from "./pages/Templates";
import TemplateDetail from "./pages/TemplateDetail";
import NewTemplate from "./pages/NewTemplate";
import EditTemplate from "./pages/EditTemplate";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import AITest from "./pages/AITest";
import UserManagement from "./pages/UserManagement";
import SettingsIndex from "./pages/settings/SettingsIndex";
import OrganizationSettings from "./pages/settings/OrganizationSettings";
import ProfileSettings from "./pages/settings/ProfileSettings";
import TeamSettings from "./pages/settings/TeamSettings";
import NotificationSettings from "./pages/settings/NotificationSettings";
import JoinInvitation from "./pages/JoinInvitation";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute - prevents refetching on every mount
      gcTime: 1000 * 60 * 5, // 5 minutes - keeps data in cache longer
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      retry: 1, // Only retry failed requests once
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/join/:token" element={<JoinInvitation />} />

            {/* Legacy auth route - redirect to login */}
            <Route path="/auth" element={<Navigate to="/login" replace />} />

            {/* Onboarding - requires auth but not org */}
            <Route path="/onboarding" element={
              <ProtectedRoute requireOrg={false}>
                <Onboarding />
              </ProtectedRoute>
            } />

            {/* Protected app routes - all under /app */}
            <Route path="/app" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/app/events" element={
              <ProtectedRoute>
                <Events />
              </ProtectedRoute>
            } />
            <Route path="/app/events/new" element={
              <ProtectedRoute>
                <NewEvent />
              </ProtectedRoute>
            } />
            <Route path="/app/events/:id" element={
              <ProtectedRoute>
                <EventDetail />
              </ProtectedRoute>
            } />
            <Route path="/app/ai-test" element={
              <ProtectedRoute>
                <AITest />
              </ProtectedRoute>
            } />
            <Route path="/app/users" element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/app/templates" element={
              <ProtectedRoute>
                <Templates />
              </ProtectedRoute>
            } />
            <Route path="/app/templates/new" element={
              <ProtectedRoute>
                <NewTemplate />
              </ProtectedRoute>
            } />
            <Route path="/app/templates/:id" element={
              <ProtectedRoute>
                <TemplateDetail />
              </ProtectedRoute>
            } />
            <Route path="/app/templates/:id/edit" element={
              <ProtectedRoute>
                <EditTemplate />
              </ProtectedRoute>
            } />
            <Route path="/app/settings" element={
              <ProtectedRoute>
                <SettingsIndex />
              </ProtectedRoute>
            } />
            <Route path="/app/settings/organization" element={
              <ProtectedRoute>
                <OrganizationSettings />
              </ProtectedRoute>
            } />
            <Route path="/app/settings/profile" element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            } />
            <Route path="/app/settings/team" element={
              <ProtectedRoute>
                <TeamSettings />
              </ProtectedRoute>
            } />
            <Route path="/app/settings/notifications" element={
              <ProtectedRoute>
                <NotificationSettings />
              </ProtectedRoute>
            } />

            {/* Legacy routes - redirect to /app paths */}
            <Route path="/events" element={<Navigate to="/app/events" replace />} />
            <Route path="/events/new" element={<Navigate to="/app/events/new" replace />} />
            <Route path="/events/:id" element={<Navigate to="/app/events/:id" replace />} />
            <Route path="/templates" element={<Navigate to="/app/templates" replace />} />
            <Route path="/templates/new" element={<Navigate to="/app/templates/new" replace />} />
            <Route path="/templates/:id" element={<Navigate to="/app/templates/:id" replace />} />
            <Route path="/templates/:id/edit" element={<Navigate to="/app/templates/:id/edit" replace />} />
            <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
            <Route path="/settings/*" element={<Navigate to="/app/settings" replace />} />
            <Route path="/users" element={<Navigate to="/app/users" replace />} />
            <Route path="/ai-test" element={<Navigate to="/app/ai-test" replace />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
