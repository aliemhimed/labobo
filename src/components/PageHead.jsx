import { ChevronLeft } from './Icons.jsx';

/* Title row for every inner page: an optional way back (named for where it
   goes), the page title, and any page-level actions on the right. */
export default function PageHead({ backLabel, onBack, title, children }) {
  return (
    <header className="page-head">
      {onBack ? (
        <button type="button" className="back-link" onClick={onBack}>
          <ChevronLeft />{backLabel || 'Back'}
        </button>
      ) : null}
      <div className="page-head-row">
        <h1>{title}</h1>
        {children ? <div className="page-head-actions">{children}</div> : null}
      </div>
    </header>
  );
}
