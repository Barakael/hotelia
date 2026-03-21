import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import { IOSInstallPrompt } from "@/components/IOSInstallPrompt";
import { AndroidInstallPrompt } from "@/components/AndroidInstallPrompt";
import { useOfflineDetection } from "@/hooks/useOfflineDetection";
import { PWAInstallProvider } from "@/contexts/PWAInstallContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Shops from "./pages/Shops";
import Staff from "./pages/Staff";
import SystemLogs from "./pages/SystemLogs";
import SystemReports from "./pages/SystemReports";
import Payments from "./pages/Payments";
import Transactions from "./pages/Transactions";
import Purchases from "./pages/Purchases";
import Suppliers from "./pages/Suppliers";
import Rooms from "./pages/Rooms";
import Bookings from "./pages/Bookings";
import FolioDetail from "./pages/FolioDetail";
import Services from "./pages/Services";
import Issues from "./pages/Issues";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function OfflineDetector() {
  useOfflineDetection();
  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <StoreProvider>
              <PWAInstallProvider>
              <Toaster />
              <Sonner />
              <OfflineDetector />
              <IOSInstallPrompt />
              <AndroidInstallPrompt />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<Login />} />

                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['owner', 'bar', 'fnb']} />}>
                    <Route path="/pos" element={<POS />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/transactions" element={<Transactions />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['owner', 'storekeeper', 'bar', 'fnb']} />}>
                    <Route path="/inventory" element={<Inventory />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['owner', 'storekeeper']} />}>
                    <Route path="/purchases" element={<Purchases />} />
                    <Route path="/suppliers" element={<Suppliers />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['owner', 'storekeeper', 'bar', 'fnb']} />}>
                    <Route path="/issues" element={<Issues />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['owner', 'receptionist']} />}>
                    <Route path="/rooms" element={<Rooms />} />
                    <Route path="/bookings" element={<Bookings />} />
                    <Route path="/folios/:id" element={<FolioDetail />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['owner', 'receptionist']} />}>
                    <Route path="/services" element={<Services />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                    <Route path="/users" element={<Users />} />
                    <Route path="/shops" element={<Shops />} />
                    <Route path="/logs" element={<SystemLogs />} />
                    <Route path="/system-reports" element={<SystemReports />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/staff" element={<Staff />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['super_admin', 'owner']} />}>
                    <Route path="/payments" element={<Payments />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
          </PWAInstallProvider>
          </StoreProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
</ErrorBoundary>
);

export default App;
