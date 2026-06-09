import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

type Props = { children: ReactNode };
type State = { error?: Error };

function clearAppCache() {
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith('capitola:'))
      .forEach(key => localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable in private browsing or restrictive embeds.
  }
  window.location.reload();
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Capitola Conditions could not render.', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return <main className="fatal-error" role="alert">
      <div className="fatal-error-card">
        <AlertTriangle size={32}/>
        <span className="eyebrow">DISPLAY RECOVERY</span>
        <h1>Conditions could not be displayed.</h1>
        <p>A saved response or unexpected browser error interrupted the dashboard. Clear the app’s cached data and try again.</p>
        <button type="button" onClick={clearAppCache}><RotateCcw size={16}/> Clear cache and reload</button>
      </div>
    </main>;
  }
}
