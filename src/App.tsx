import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Jobs from "./pages/Jobs";
import Fleet from "./pages/Fleet";
import Approvals from "./pages/Approvals";
import Recharges from "./pages/Recharges";
import Estimates from "./pages/Estimates";
import Invoicing from "./pages/Invoicing";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
    <Route path="/fleet" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
    <Route path="/approvals" element={<ProtectedRoute><Approvals /></ProtectedRoute>} />
    <Route path="/recharges" element={<ProtectedRoute><Recharges /></ProtectedRoute>} />
    <Route path="/estimates" element={<ProtectedRoute><Estimates /></ProtectedRoute>} />
    <Route path="/invoicing" element={<ProtectedRoute><Invoicing /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/vehicles" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
    <Route path="/active-work" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
    <Route path="/history" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
    <Route path="/suppliers" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
    <Route path="/compliance" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
    <Route path="/parts" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
