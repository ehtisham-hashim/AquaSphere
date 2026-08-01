import { useAuth } from '../context/AuthContext';
import DailyCloseIndex from '../components/dailyClose/index';
import ProductionClose from '../components/dailyClose/ProductionClose';
import AccountantClose from '../components/dailyClose/AccountantClose';
import MarketingClose from '../components/dailyClose/MarketingClose';

/**
 * Extracts role from document.cookie JWT token if present,
 * or returns role from authenticated AuthContext user.
 */
function getRoleFromCookieOrUser(user) {
  if (user?.role) return user.role;

  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      const trimmed = c.trim();
      if (trimmed.startsWith('token=') || trimmed.startsWith('jwt=') || trimmed.startsWith('authToken=')) {
        const tokenVal = trimmed.split('=')[1];
        try {
          const payload = tokenVal.split('.')[1];
          if (payload) {
            const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
            if (decoded?.role) return decoded.role;
          }
        } catch (e) {
          // ignore decode error
        }
      }
    }
  }

  return null;
}

export default function DailyClosePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500 font-medium animate-pulse">Loading Daily Close...</div>
      </div>
    );
  }

  const role = getRoleFromCookieOrUser(user);

  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';
  const isPM = role === 'PRODUCTION_MANAGER';
  const isAccountant = role === 'ACCOUNTANT';
  const isMM = role === 'MARKETING_MANAGER';

  if (isOwnerOrAdmin) {
    return <DailyCloseIndex />;
  }

  if (isPM) {
    return <ProductionClose />;
  }

  if (isAccountant) {
    return <AccountantClose />;
  }

  if (isMM) {
    return <MarketingClose />;
  }

  return (
    <div className="p-8 text-center text-slate-500">
      You do not have permission to view Daily Close modules.
    </div>
  );
}
