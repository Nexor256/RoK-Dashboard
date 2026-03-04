import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const RankingsPage = lazy(() => import("@/pages/RankingsPage"));
const ChartsPage = lazy(() => import("@/pages/ChartsPage"));
const SnapshotsPage = lazy(() => import("@/pages/SnapshotsPage"));
const KvKPage = lazy(() => import("@/pages/KvKPage"));
const UploadPage = lazy(() => import("@/pages/UploadPage"));
const ManageUsersPage = lazy(() => import("@/pages/ManageUsersPage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const PageSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function ProtectedRoutes() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/charts" element={<ChartsPage />} />
          <Route path="/snapshots" element={<SnapshotsPage />} />
          <Route path="/kvk" element={<KvKPage />} />
          <Route path="/upload" element={isAdmin ? <UploadPage /> : <Navigate to="/" replace />} />
          <Route path="/manage-users" element={isAdmin ? <ManageUsersPage /> : <Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route path="/auth" element={<AuthGate />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
      <Analytics />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
