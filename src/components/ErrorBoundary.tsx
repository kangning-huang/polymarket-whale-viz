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
        <div style={{
          background: '#1c1010', border: '1px solid #f85149',
          borderRadius: 8, padding: 16, margin: 16, color: '#f85149',
          fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap',
        }}>
          <strong>Error{this.props.fallback ? ` in ${this.props.fallback}` : ''}:</strong>
          <br />{this.state.error.message}
          <br /><br />{this.state.error.stack}
        </div>
      );
    }
    return this.props.children;
  }
}
