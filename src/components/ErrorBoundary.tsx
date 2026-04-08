import React from 'react';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-500 glass-card">
          <h2 className="text-xl font-bold mb-4">Something went wrong.</h2>
          <pre className="text-xs whitespace-pre-wrap font-mono">{this.state.error?.toString()}</pre>
          <pre className="text-xs whitespace-pre-wrap font-mono mt-4">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
