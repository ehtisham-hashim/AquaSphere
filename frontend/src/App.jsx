import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AccountantDashboard from './pages/AccountantDashboard';
import Vendors from './pages/Vendors';
import Purchases from './pages/Purchases';
import RawMaterials from './pages/RawMaterials';
import Production from './pages/Production';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import MMOrders from './pages/MMOrders';
import Expenses from './pages/Expenses';
import CounterSales from './pages/CounterSales';
import Users from './pages/Users';
import BottleLedger from './pages/BottleLedger';
import Reports from './pages/Reports';

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
