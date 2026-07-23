import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    localStorage.removeItem('currentUserProfile');
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-2xl backdrop-blur-xl text-center space-y-5">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-black font-display text-white">
                Terjadi Kendala Tampilan
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
                Aplikasi mendeteksi adanya gangguan saat memuat data. Klik tombol di bawah untuk memuat ulang sistem.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-left overflow-auto max-h-36">
                <p className="text-[11px] font-mono text-rose-300 font-semibold break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Aplikasi</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
