import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: string;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-short/10 border border-short/30 rounded-xl p-4 m-4 text-short font-mono text-sm whitespace-pre-wrap">
          <strong>Error{this.props.fallback ? ` in ${this.props.fallback}` : ''}:</strong>
          <br />{this.state.error.message}
          <br /><br />
          <span className="text-text-muted text-xs">{this.state.error.stack}</span>
        </div>
      );
    }
    return this.props.children;
  }
}
