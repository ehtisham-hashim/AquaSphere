import { useAuth } from '../context/AuthContext';
import OwnerClose from '../components/dailyClose/OwnerClose';
import AdminClose from '../components/dailyClose/AdminClose';
import ProductionClose from '../components/dailyClose/ProductionClose';
import AccountantClose from '../components/dailyClose/AccountantClose';
import MarketingClose from '../components/dailyClose/MarketingClose';

export default function DailyClosePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500 font-medium animate-pulse">Loading Daily Close...</div>
      </div>
    );
  }

  const role = user?.role;

  if (role === 'OWNER') {
    return <OwnerClose />;
  }

  if (role === 'ADMIN') {
    return <AdminClose />;
  }

  if (role === 'PRODUCTION_MANAGER') {
    return <ProductionClose />;
  }

  if (role === 'ACCOUNTANT') {
    return <AccountantClose />;
  }

  if (role === 'MARKETING_MANAGER') {
    return <MarketingClose />;
  }

  return (
    <div className="p-8 text-center text-slate-500">
      You do not have permission to view Daily Close modules.
    </div>
  );
}
