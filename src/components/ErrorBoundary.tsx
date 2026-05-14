import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] p-4">
          <div className="bg-[#121214] border border-red-900/50 p-8 rounded-lg max-w-md w-full shadow-xl">
            <h1 className="text-xl font-bold text-red-400 mb-4 tracking-tight">Something went wrong.</h1>
            <p className="text-zinc-400 mb-6 text-sm">
              An unexpected error occurred in the application. Let the developer know what you were doing.
            </p>
            <div className="bg-[#09090b] p-4 rounded text-xs text-red-400 font-mono overflow-auto max-h-32 mb-6">
              {this.state.error?.message}
            </div>
            <button
              className="bg-brand-blue hover:bg-brand-teal text-white font-medium py-2 px-4 rounded w-full transition-colors"
              onClick={() => window.location.reload()}
            >
              Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
