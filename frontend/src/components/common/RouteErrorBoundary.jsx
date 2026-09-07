import { Component } from 'react';
import { RotateCw, AlertTriangle } from 'lucide-react';

export class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Route lazy loading error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
          <div className="card-surface p-6 max-w-md shadow-lg space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Something went wrong loading this view</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {this.state.error?.message || 'A component update failed to load. Please try again or reload the page.'}
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
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
