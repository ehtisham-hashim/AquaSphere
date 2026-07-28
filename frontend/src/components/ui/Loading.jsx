import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function Loading({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">{message}</p>
      </div>
    </div>
  );
}
