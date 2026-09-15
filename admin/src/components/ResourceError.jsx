import { AlertCircle, RefreshCw } from 'lucide-react';

const ResourceError = ({ error, onRetry }) => (
  <div className="resource-error" role="alert" style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '18px',
    border: '1px solid hsl(var(--destructive) / 0.35)',
    background: 'hsl(var(--destructive) / 0.06)',
    color: 'hsl(var(--foreground))',
    borderRadius: '8px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <AlertCircle size={20} color="hsl(var(--destructive))" />
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

