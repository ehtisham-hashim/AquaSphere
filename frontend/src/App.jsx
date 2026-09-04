import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Vendors = lazy(() => import('./pages/Vendors'));
const Purchases = lazy(() => import('./pages/Purchases'));
const RawMaterials = lazy(() => import('./pages/RawMaterials'));
const Production = lazy(() => import('./pages/Production'));
const Customers = lazy(() => import('./pages/Customers'));
const Orders = lazy(() => import('./pages/Orders'));
const Expenses = lazy(() => import('./pages/Expenses'));
const CounterSales = lazy(() => import('./pages/CounterSales'));
const Users = lazy(() => import('./pages/Users'));
const Reports = lazy(() => import('./pages/Reports'));
const DailyClose = lazy(() => import('./pages/DailyClose'));
const Inventory = lazy(() => import('./pages/Inventory'));

import { getCompanyFromCookie } from './utils/companyCookie';
import { isPageAllowedForRole } from './constants/roleAccess';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
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
  const currentTenant = getCompanyFromCookie();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (!isPageAllowedForRole(user?.role, path, currentTenant)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <RouteErrorBoundary>
      <Routes>
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
          <Route index element={<Dashboard />} />
          <Route path="vendors" element={<RoleProtectedRoute path="/vendors"><Vendors /></RoleProtectedRoute>} />
          <Route path="purchases" element={<RoleProtectedRoute path="/purchases"><Purchases /></RoleProtectedRoute>} />
          <Route path="raw-materials" element={<RoleProtectedRoute path="/raw-materials"><RawMaterials /></RoleProtectedRoute>} />
          <Route path="inventory" element={<RoleProtectedRoute path="/inventory"><Inventory /></RoleProtectedRoute>} />
          <Route path="production" element={<RoleProtectedRoute path="/production"><Production /></RoleProtectedRoute>} />
          <Route path="customers" element={<RoleProtectedRoute path="/customers"><Customers /></RoleProtectedRoute>} />
          <Route path="orders" element={<RoleProtectedRoute path="/orders"><Orders /></RoleProtectedRoute>} />
          <Route path="expenses" element={<RoleProtectedRoute path="/expenses"><Expenses /></RoleProtectedRoute>} />
          <Route path="counter-sales" element={<RoleProtectedRoute path="/counter-sales"><CounterSales /></RoleProtectedRoute>} />
          <Route path="users" element={<RoleProtectedRoute path="/users"><Users /></RoleProtectedRoute>} />
          <Route path="reports" element={<RoleProtectedRoute path="/reports"><Reports /></RoleProtectedRoute>} />
          <Route path="daily-close" element={<RoleProtectedRoute path="/daily-close"><DailyClose /></RoleProtectedRoute>} />
          <Route path="*" element={<div>Page not found</div>} />
        </Route>
      </Routes>
    </RouteErrorBoundary>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
