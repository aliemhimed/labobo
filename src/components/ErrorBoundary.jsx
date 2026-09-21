import { Component } from 'react';

/* Last line of defence: an exception while rendering shows a way out instead
   of a blank page. Progress lives in localStorage, so a reload loses nothing. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[render error]', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="container center-wrap">
        <div className="card" style={{ textAlign: 'center', padding: 34 }} role="alert">
          <div style={{ fontSize: 38, marginBottom: 10 }}>😵</div>
          <h2>Something went wrong</h2>
          <p style={{ color: 'var(--text-soft)' }}>
            Your saved progress is safe. Reloading usually fixes it.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={() => window.location.reload()}>Reload</button>
            <a className="btn ghost" href="/">Home</a>
          </div>
        </div>
      </div>
    );
  }
}
