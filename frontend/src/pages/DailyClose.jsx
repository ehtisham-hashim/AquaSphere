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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role = user?.role;

  let content;
  if (role === 'OWNER') content = <OwnerClose />;
  else if (role === 'ADMIN') content = <AdminClose />;
  else if (role === 'PRODUCTION_MANAGER') content = <ProductionClose />;
  else if (role === 'ACCOUNTANT') content = <AccountantClose />;
  else if (role === 'MARKETING_MANAGER') content = <MarketingClose />;
  else {
    content = (
      <div className="card-surface p-8 text-center text-slate-500 text-xs font-semibold">
        You do not have permission to view Daily Close modules.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {content}
    </div>
  );
}
