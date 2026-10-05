import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { SSEProvider } from './context/SSEContext';
import MainLayout from './components/layout/MainLayout';
import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';

const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'));
const WebsiteAdmin = lazyWithRetry(() => import('./pages/WebsiteAdmin'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Vendors = lazyWithRetry(() => import('./pages/Vendors'));
const Purchases = lazyWithRetry(() => import('./pages/Purchases'));
const RawMaterials = lazyWithRetry(() => import('./pages/RawMaterials'));
const Production = lazyWithRetry(() => import('./pages/Production'));
const Customers = lazyWithRetry(() => import('./pages/Customers'));
const Orders = lazyWithRetry(() => import('./pages/Orders'));
const Expenses = lazyWithRetry(() => import('./pages/Expenses'));
const CounterSales = lazyWithRetry(() => import('./pages/CounterSales'));
const Users = lazyWithRetry(() => import('./pages/Users'));
const Reports = lazyWithRetry(() => import('./pages/Reports'));
const DailyClose = lazyWithRetry(() => import('./pages/DailyClose'));
const Inventory = lazyWithRetry(() => import('./pages/Inventory'));
const Transport = lazyWithRetry(() => import('./pages/Transport'));
const ProductPricing = lazyWithRetry(() => import('./pages/ProductPricing'));
const Certificates = lazyWithRetry(() => import('./pages/Certificates'));
const PublicReports = lazyWithRetry(() => import('./pages/PublicReports'));

import { isPageAllowedForRole } from './constants/roleAccess';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin"></div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RoleProtectedRoute({ path, children }) {
  const { user, loading } = useAuth();
  const { tenant: currentTenant } = useTenant();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (!isPageAllowedForRole(user?.role, path, currentTenant)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <RouteErrorBoundary>
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={<PageLoader />}>
              <LandingPage />
            </Suspense>
          }
        />
        <Route
          path="/website-admin"
          element={
            <Suspense fallback={<PageLoader />}>
              <WebsiteAdmin />
            </Suspense>
          }
        />
        <Route
          path="/certificates"
          element={
            <Suspense fallback={<PageLoader />}>
              <Certificates />
            </Suspense>
          }
        />
        <Route
          path="/reports"
          element={
            <Suspense fallback={<PageLoader />}>
              <PublicReports />
            </Suspense>
          }
        />
        <Route
          path="/reports-and-certificates"
          element={
            <Suspense fallback={<PageLoader />}>
              <Certificates />
            </Suspense>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Suspense fallback={<PageLoader />}>
                <Login />
              </Suspense>
            </PublicRoute>
          }
        />
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="vendors" element={<RoleProtectedRoute path="/vendors"><Vendors /></RoleProtectedRoute>} />
          <Route path="purchases" element={<RoleProtectedRoute path="/purchases"><Purchases /></RoleProtectedRoute>} />
          <Route path="raw-materials" element={<RoleProtectedRoute path="/raw-materials"><RawMaterials /></RoleProtectedRoute>} />
          <Route path="inventory" element={<RoleProtectedRoute path="/inventory"><Inventory /></RoleProtectedRoute>} />
          <Route path="production" element={<RoleProtectedRoute path="/production"><Production /></RoleProtectedRoute>} />
          <Route path="customers" element={<RoleProtectedRoute path="/customers"><Customers /></RoleProtectedRoute>} />
          <Route path="orders" element={<RoleProtectedRoute path="/orders"><Orders /></RoleProtectedRoute>} />
          <Route path="expenses" element={<RoleProtectedRoute path="/expenses"><Expenses /></RoleProtectedRoute>} />
          <Route path="counter-sales" element={<RoleProtectedRoute path="/counter-sales"><CounterSales /></RoleProtectedRoute>} />
          <Route path="pricing" element={<RoleProtectedRoute path="/pricing"><ProductPricing /></RoleProtectedRoute>} />
          <Route path="users" element={<RoleProtectedRoute path="/users"><Users /></RoleProtectedRoute>} />
          <Route path="analytics" element={<RoleProtectedRoute path="/analytics"><Reports /></RoleProtectedRoute>} />
          <Route path="erp-reports" element={<RoleProtectedRoute path="/erp-reports"><Reports /></RoleProtectedRoute>} />
          <Route path="daily-close" element={<RoleProtectedRoute path="/daily-close"><DailyClose /></RoleProtectedRoute>} />
          <Route path="transport" element={<RoleProtectedRoute path="/transport"><Transport /></RoleProtectedRoute>} />
          <Route path="transport-expenses" element={<Navigate to="/transport" replace />} />
          <Route path="cars" element={<Navigate to="/transport" replace />} />
          <Route path="*" element={<div>Page not found</div>} />
        </Route>
      </Routes>
    </RouteErrorBoundary>
  );
}

export default function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <SSEProvider>
          <BrowserRouter>
            <Toaster position="top-right" richColors closeButton duration={3500} />
            <AppRoutes />
          </BrowserRouter>
        </SSEProvider>
      </AuthProvider>
    </TenantProvider>
  );
}
