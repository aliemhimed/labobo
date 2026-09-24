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
      <div className="center-wrap">
        <div className="state" role="alert">
          <h1>Something went wrong</h1>
          <p>Your saved progress is safe. Reloading the page usually fixes this.</p>
          <div className="state-actions">
            <button className="btn primary" onClick={() => window.location.reload()}>Reload the page</button>
            <a className="btn" href="/">Go to your subjects</a>
          </div>
        </div>
      </div>
    );
  }
}
