import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import Login from './features/auth/Login';
import MainLayout from './components/layout/MainLayout';
import { Dashboard, AdminDashboard, AccountantDashboard } from './features/dashboard';
import { Vendors, Purchases } from './features/purchasing';
import RawMaterials from './features/inventory/RawMaterials';
import Production from './features/production/Production';
import { Customers } from './features/customers';
import { Orders, MMOrders } from './features/orders';
import Expenses from './features/expenses/Expenses';
import CounterSales from './features/counterSales/CounterSales';
import Users from './features/users/Users';
import BottleLedger from './features/bottleLedger/BottleLedger';
import Reports from './features/reports/Reports';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function DashboardRoleWrapper() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  if (user?.role === 'ACCOUNTANT') return <AccountantDashboard />;
  return <Dashboard />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<DashboardRoleWrapper />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="raw-materials" element={<RawMaterials />} />
        <Route path="production" element={<Production />} />
        <Route path="customers" element={<Customers />} />
        <Route path="orders" element={<Orders />} />
        <Route path="mm-orders" element={<MMOrders />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="counter-sales" element={<CounterSales />} />
        <Route path="users" element={<Users />} />
        <Route path="bottle-ledger" element={<BottleLedger />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<div>Page not found</div>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
