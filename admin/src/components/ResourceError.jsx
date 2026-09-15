import { AlertCircle, RefreshCw } from 'lucide-react';

const ResourceError = ({ error, onRetry }) => (
  <div className="resource-error" role="alert" style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '18px',
    border: '1px solid color-mix(in srgb, var(--destructive), transparent 65%)',
    background: 'color-mix(in srgb, var(--destructive), transparent 94%)',
    color: 'var(--foreground)',
    borderRadius: '8px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <AlertCircle size={20} color="var(--destructive)" />
      <span>{error?.message || 'Unable to load this data.'}</span>
    </div>
    {onRetry && (
      <button type="button" className="btn btn-outline" onClick={onRetry}>
        <RefreshCw size={16} />
      </button>
    )}
  </div>
);

export default ResourceError;

