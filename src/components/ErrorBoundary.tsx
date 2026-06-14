import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('ABSURD.TV render error', error, info); }
  render() {
    if (this.state.failed) return <main className="fatal"><span>⚠</span><h1>The weirdness machine jammed.</h1><p>Reload the page and try entering the portal again.</p><button onClick={() => window.location.reload()}>Reboot portal</button></main>;
    return this.props.children;
  }
}
