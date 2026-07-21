import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';

// A simple protected route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return null; // or a loading spinner
  if (!user) return <Navigate to="/login" replace />;
  
  return children;
}

import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

import Vendors from './pages/Vendors';
import Purchases from './pages/Purchases';
import Production from './pages/Production';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Expenses from './pages/Expenses';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="production" element={<Production />} />
        <Route path="customers" element={<Customers />} />
        <Route path="orders" element={<Orders />} />
        <Route path="expenses" element={<Expenses />} />
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
