import React, { Suspense, useMemo } from 'react';
import { getCompanyFromCookie } from '../utils/companyCookie';

const aquasphereComponents = import.meta.glob('../companies/aquasphere/*.jsx');
const wadaanaComponents = import.meta.glob('../companies/wadaana/*.jsx');

export default function CompanyPageLoader({ pageName, ...props }) {
  const company = getCompanyFromCookie();

  const DynamicComponent = useMemo(() => {
    let loader = null;

    if (company === 'wadaana') {
      loader = wadaanaComponents[`../companies/wadaana/${pageName}.jsx`];
    }

    // Fallback to aquasphere component if company is aquasphere or if wadaana variant is not present
    if (!loader) {
      loader = aquasphereComponents[`../companies/aquasphere/${pageName}.jsx`];
    }

    if (!loader) {
      return () => (
        <div className="p-8 text-center text-rose-500 font-bold bg-rose-50 border border-rose-200 rounded-xl m-4">
          Component "{pageName}" could not be found for company "{company}".
        </div>
      );
    }

    return React.lazy(loader);
  }, [pageName, company]);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
        </div>
      }
    >
      <DynamicComponent {...props} />
    </Suspense>
  );
}
