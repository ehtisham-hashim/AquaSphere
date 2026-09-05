/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { getCompanyFromCookie, setCompanyCookie } from '../utils/companyCookie';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [tenant, setTenantState] = useState(() => getCompanyFromCookie());

  useEffect(() => {
    // Synchronize HTML data attribute for CSS tokens
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-tenant', tenant);
    }
  }, [tenant]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'tenant' || e.key === 'company') {
        const next = getCompanyFromCookie();
        setTenantState(next);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setTenant = (newTenant) => {
    const normalized = newTenant?.toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';
    setCompanyCookie(normalized);
    setTenantState(normalized);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-tenant', normalized);
    }
  };

  const isWadaana = tenant === 'wadaana';

  return (
    <TenantContext.Provider value={{ tenant, isWadaana, setTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    const t = getCompanyFromCookie();
    return {
      tenant: t,
      isWadaana: t === 'wadaana',
      setTenant: (next) => setCompanyCookie(next),
    };
  }
  return ctx;
}
