import { Component } from 'react';
import { RotateCw, AlertTriangle } from 'lucide-react';

function isChunkLoadingError(error) {
  if (!error) return false;
  const msg = String(error?.message || error || '').toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    error?.name === 'ChunkLoadError'
  );
}

export class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Route error caught by ErrorBoundary:', error, errorInfo);

    if (isChunkLoadingError(error)) {
      const lastReload = Number(sessionStorage.getItem('chunk_reload_last_ts') || 0);
      if (Date.now() - lastReload > 15000) {
        sessionStorage.setItem('chunk_reload_last_ts', String(Date.now()));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const chunkError = isChunkLoadingError(this.state.error);

      if (chunkError) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium text-slate-600">Syncing application updates...</p>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
          <div className="card-surface p-6 max-w-md shadow-lg space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Something went wrong loading this view</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {this.state.error?.message || 'A component update failed to load. Please try again or refresh.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <span>Try Again</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <RotateCw size={14} />
                <span>Refresh View</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

