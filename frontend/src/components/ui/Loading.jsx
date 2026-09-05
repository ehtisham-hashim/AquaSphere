import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function Loading({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="w-8 h-8 text-brand-primary animate-spin" />
        <p className="text-xs text-slate-500 font-semibold">{message}</p>
      </div>
    </div>
  );
}
